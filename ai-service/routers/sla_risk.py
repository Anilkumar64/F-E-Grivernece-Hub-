"""
GET /sla-risk
Returns all open grievances with an AI-computed SLA breach risk score.
Uses time-to-deadline + priority + category SLA hours for scoring.
No Gemini needed - purely statistical, fast.
"""
import logging
from datetime import datetime
from fastapi import APIRouter
from pydantic import BaseModel

from services.db_service import get_collection

logger = logging.getLogger(__name__)
router = APIRouter()


class SlaRiskItem(BaseModel):
    grievance_id: str
    mongo_id: str
    title: str
    department: str
    priority: str
    status: str
    hours_remaining: float
    risk_score: float          # 0.0 (safe) – 1.0 (already breached)
    risk_label: str            # "safe" | "warning" | "danger" | "breached"


class SlaRiskResponse(BaseModel):
    available: bool = True
    items: list[SlaRiskItem] = []
    total_at_risk: int = 0


def _compute_risk(sla_deadline: datetime, priority: str) -> tuple[float, str]:
    now = datetime.utcnow()
    delta_hours = (sla_deadline - now).total_seconds() / 3600

    # Priority multiplier: High-priority items get flagged earlier
    priority_weight = {"Low": 1.0, "Medium": 1.2, "High": 1.5, "Critical": 2.0}.get(priority, 1.0)

    if delta_hours <= 0:
        return 1.0, "breached"

    # Risk increases as we approach (and exceed) deadline
    # At 24h remaining with High priority -> warning
    effective_hours = delta_hours / priority_weight

    if effective_hours <= 6:
        return min(0.95, 0.7 + (6 - effective_hours) / 20), "danger"
    elif effective_hours <= 24:
        return 0.5 + (24 - effective_hours) / 48, "warning"
    elif effective_hours <= 48:
        return 0.2 + (48 - effective_hours) / 280, "low"
    else:
        return 0.0, "safe"


@router.get("", response_model=SlaRiskResponse)
async def sla_risk(department_id: str = ""):
    grievances_col = get_collection("grievances")

    query: dict = {"status": {"$nin": ["Resolved", "Closed", "Escalated"]}}
    if department_id:
        from bson import ObjectId
        try:
            query["department"] = ObjectId(department_id)
        except Exception:
            pass

    cursor = grievances_col.find(
        query,
        {"grievanceId": 1, "title": 1, "priority": 1,
         "status": 1, "slaDeadline": 1, "department": 1},
    ).sort("slaDeadline", 1).limit(200)
    docs = await cursor.to_list(length=200)

    items = []
    at_risk = 0
    now = datetime.utcnow()

    # Fetch department names
    dept_ids = list({doc.get("department") for doc in docs if doc.get("department")})
    dept_col = get_collection("departments")
    dept_cursor = dept_col.find({"_id": {"$in": dept_ids}}, {"name": 1})
    dept_docs = await dept_cursor.to_list(length=200)
    dept_map = {str(d["_id"]): d.get("name", "Unknown") for d in dept_docs}

    for doc in docs:
        deadline = doc.get("slaDeadline")
        if not deadline:
            continue
        priority = doc.get("priority", "Medium")
        hours_remaining = (deadline - now).total_seconds() / 3600
        risk_score, risk_label = _compute_risk(deadline, priority)
        if risk_label in ("warning", "danger", "breached"):
            at_risk += 1
        items.append(SlaRiskItem(
            grievance_id=doc.get("grievanceId", ""),
            mongo_id=str(doc["_id"]),
            title=doc.get("title", ""),
            department=dept_map.get(str(doc.get("department")), "Unknown"),
            priority=priority,
            status=doc.get("status", ""),
            hours_remaining=round(hours_remaining, 1),
            risk_score=round(risk_score, 3),
            risk_label=risk_label,
        ))

    items.sort(key=lambda x: x.risk_score, reverse=True)
    return SlaRiskResponse(available=True, items=items, total_at_risk=at_risk)
