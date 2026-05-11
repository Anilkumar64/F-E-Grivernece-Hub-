"""
GET /insights/clusters    - Root cause clustering (ML + Gemini labelling)
GET /insights/anomalies   - Department/category spike detection (statistical)
GET /insights/forecast    - 30-day grievance volume forecast (time series)
GET /insights/admin-scores - Admin performance scoring
"""
import logging
from datetime import datetime, timedelta
from collections import defaultdict

import numpy as np
from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.db_service import get_collection
from ml.clustering import cluster_grievances
from ml.anomaly_detection import detect_anomalies
from ml.forecasting import forecast_volume

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Clusters ────────────────────────────────────────────────────────────────
class Cluster(BaseModel):
    cluster_id: int
    label: str
    size: int
    sample_titles: list[str]
    root_cause: str = ""


class ClustersResponse(BaseModel):
    available: bool = True
    clusters: list[Cluster] = Field(default_factory=list)
    total_analyzed: int = 0


@router.get("/clusters", response_model=ClustersResponse)
async def get_clusters():
    grievances_col = get_collection("grievances")
    cutoff = datetime.utcnow() - timedelta(days=30)
    cursor = grievances_col.find(
        {"createdAt": {"$gte": cutoff}},
        {"title": 1, "description": 1, "grievanceId": 1},
    ).limit(500)
    docs = await cursor.to_list(length=500)
    if len(docs) < 5:
        return ClustersResponse(available=True, clusters=[], total_analyzed=len(docs))

    texts = [f"{d.get('title','')}. {d.get('description','')[:300]}" for d in docs]
    cluster_labels, n_clusters = cluster_grievances(texts)

    # Group by cluster
    groups: dict[int, list] = defaultdict(list)
    for idx, label in enumerate(cluster_labels):
        if label != -1:      # -1 = noise in DBSCAN
            groups[label].append(docs[idx])

    clusters = []
    for cid, group_docs in groups.items():
        sample_titles = [d.get("title", "") for d in group_docs[:4]]
        sample_text = " | ".join(sample_titles[:3])

        # Ask Gemini to label this cluster with a short phrase
        from services.gemini_client import generate_text
        label_prompt = f"""
These university student grievances were grouped together by topic similarity.
Sample titles: {sample_text}
In 5 words or fewer, give a label for this group (e.g. "Wi-Fi connectivity issues").
Return only the label text.
"""
        raw_label = await generate_text(label_prompt, temperature=0.2, max_tokens=20)
        cluster_label = (raw_label or f"Issue Group {cid + 1}").strip()

        root_cause_prompt = f"""
These {len(group_docs)} university grievances share a common theme: "{cluster_label}".
Sample descriptions: {' | '.join(d.get('description','')[:150] for d in group_docs[:3])}
In 1 sentence, identify the likely root cause of this pattern.
Return only the sentence.
"""
        root_cause = await generate_text(root_cause_prompt, temperature=0.3, max_tokens=80) or ""

        clusters.append(Cluster(
            cluster_id=cid,
            label=cluster_label,
            size=len(group_docs),
            sample_titles=sample_titles,
            root_cause=root_cause.strip(),
        ))

    clusters.sort(key=lambda c: c.size, reverse=True)
    return ClustersResponse(available=True, clusters=clusters, total_analyzed=len(docs))


# ── Anomalies ────────────────────────────────────────────────────────────────
class Anomaly(BaseModel):
    department: str
    current_count: int
    baseline_count: float
    z_score: float
    severity: str    # "warning" | "critical"


class AnomalyResponse(BaseModel):
    available: bool = True
    anomalies: list[Anomaly] = Field(default_factory=list)


@router.get("/anomalies", response_model=AnomalyResponse)
async def get_anomalies():
    grievances_col = get_collection("grievances")
    dept_col = get_collection("departments")

    cutoff = datetime.utcnow() - timedelta(days=60)
    pipeline = [
        {"$match": {"createdAt": {"$gte": cutoff}}},
        {"$group": {
            "_id": {
                "dept": "$department",
                "week": {"$isoWeek": "$createdAt"},
                "year": {"$isoWeekYear": "$createdAt"},
            },
            "count": {"$sum": 1},
        }},
    ]
    agg = await grievances_col.aggregate(pipeline).to_list(length=1000)

    dept_weeks: dict[str, list[int]] = defaultdict(list)
    for row in agg:
        dept_id = str(row["_id"].get("dept", "unknown"))
        dept_weeks[dept_id].append(row["count"])

    dept_docs = await dept_col.find({}, {"name": 1}).to_list(length=100)
    dept_map = {str(d["_id"]): d.get("name", "Unknown") for d in dept_docs}

    anomalies = detect_anomalies(dept_weeks, threshold_z=2.0)
    result = []
    for dept_id, current, baseline, z in anomalies:
        result.append(Anomaly(
            department=dept_map.get(dept_id, "Unknown"),
            current_count=current,
            baseline_count=round(baseline, 1),
            z_score=round(z, 2),
            severity="critical" if z > 3.0 else "warning",
        ))

    return AnomalyResponse(available=True, anomalies=result)


# ── Forecast ─────────────────────────────────────────────────────────────────
class ForecastPoint(BaseModel):
    date: str
    predicted_count: float


class ForecastResponse(BaseModel):
    available: bool = True
    forecast: list[ForecastPoint] = Field(default_factory=list)
    trend: str = "stable"   # "rising" | "falling" | "stable"


@router.get("/forecast", response_model=ForecastResponse)
async def get_forecast():
    grievances_col = get_collection("grievances")
    cutoff = datetime.utcnow() - timedelta(days=90)
    pipeline = [
        {"$match": {"createdAt": {"$gte": cutoff}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]
    rows = await grievances_col.aggregate(pipeline).to_list(length=200)
    if len(rows) < 7:
        return ForecastResponse(available=True, forecast=[], trend="stable")

    dates = [r["_id"] for r in rows]
    counts = [r["count"] for r in rows]
    predictions, trend = forecast_volume(dates, counts, horizon=30)

    forecast_points = [
        ForecastPoint(date=d, predicted_count=round(max(0, c), 1))
        for d, c in predictions
    ]
    return ForecastResponse(available=True, forecast=forecast_points, trend=trend)


# ── Admin Scores ─────────────────────────────────────────────────────────────
class AdminScore(BaseModel):
    admin_id: str
    name: str
    total_resolved: int
    avg_resolution_hours: float
    avg_feedback_rating: float
    performance_label: str   # "excellent" | "good" | "average" | "needs_improvement"
    insight: str = ""


class AdminScoresResponse(BaseModel):
    available: bool = True
    scores: list[AdminScore] = Field(default_factory=list)


@router.get("/admin-scores", response_model=AdminScoresResponse)
async def get_admin_scores():
    grievances_col = get_collection("grievances")
    users_col = get_collection("users")
    cutoff = datetime.utcnow() - timedelta(days=90)

    pipeline = [
        {"$match": {
            "status": {"$in": ["Resolved", "Closed"]},
            "resolvedAt": {"$exists": True, "$ne": None},
            "assignedTo": {"$exists": True, "$ne": None},
            "createdAt": {"$gte": cutoff},
        }},
        {"$project": {
            "assignedTo": 1,
            "resolutionHours": {
                "$divide": [
                    {"$subtract": ["$resolvedAt", "$createdAt"]},
                    3600000,
                ]
            },
            "feedbackRating": 1,
        }},
        {"$group": {
            "_id": "$assignedTo",
            "total_resolved": {"$sum": 1},
            "avg_hours": {"$avg": "$resolutionHours"},
            "avg_rating": {"$avg": "$feedbackRating"},
        }},
        {"$sort": {"total_resolved": -1}},
        {"$limit": 20},
    ]
    rows = await grievances_col.aggregate(pipeline).to_list(length=20)

    admin_ids = [row["_id"] for row in rows]
    admin_docs = await users_col.find(
        {"_id": {"$in": admin_ids}},
        {"name": 1},
    ).to_list(length=20)
    admin_map = {str(d["_id"]): d.get("name", "Unknown") for d in admin_docs}

    # Compute benchmarks for relative scoring
    all_hours = [r["avg_hours"] for r in rows if r.get("avg_hours")]
    median_hours = float(np.median(all_hours)) if all_hours else 48.0

    scores = []
    for row in rows:
        avg_h = row.get("avg_hours") or 99.0
        avg_r = row.get("avg_rating") or 0.0
        total = row.get("total_resolved", 0)

        if avg_h < median_hours * 0.6 and avg_r >= 4.0:
            label = "excellent"
        elif avg_h <= median_hours and avg_r >= 3.5:
            label = "good"
        elif avg_h <= median_hours * 1.5:
            label = "average"
        else:
            label = "needs_improvement"

        insight = ""
        if label == "excellent":
            insight = f"Resolves {round((median_hours - avg_h) / median_hours * 100)}% faster than peers with high satisfaction."
        elif label == "needs_improvement":
            insight = f"Avg resolution time is {round(avg_h)}h — {round(avg_h - median_hours)}h above the team median."

        scores.append(AdminScore(
            admin_id=str(row["_id"]),
            name=admin_map.get(str(row["_id"]), "Unknown"),
            total_resolved=total,
            avg_resolution_hours=round(avg_h, 1),
            avg_feedback_rating=round(avg_r, 2),
            performance_label=label,
            insight=insight,
        ))

    return AdminScoresResponse(available=True, scores=scores)
