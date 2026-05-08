"""
GET /summary/{grievance_mongo_id}
Returns a one-paragraph AI summary, sentiment label, and urgency level
for a given grievance. Result is cached in aiMetadata.summary.
"""
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from bson import ObjectId

from services.gemini_client import generate_json
from services.db_service import get_collection

logger = logging.getLogger(__name__)
router = APIRouter()

PROMPT_TEMPLATE = """
You are summarizing a student grievance for a university admin dashboard.
Read the grievance and return a concise JSON assessment.

Title: {title}
Description: {description}
Category: {category}
Priority: {priority}
Status: {status}
Comments ({num_comments} total): {comment_snippet}

Return ONLY valid JSON:
{{
  "summary": "1-2 sentence plain-English summary of the core issue and current state",
  "sentiment": one of ["positive", "neutral", "negative", "distressed"],
  "urgency_level": one of ["low", "medium", "high", "critical"],
  "key_issue": "The single most important thing the admin needs to address"
}}
"""


class SummaryResponse(BaseModel):
    available: bool = True
    summary: str = ""
    sentiment: str = "neutral"
    urgency_level: str = "medium"
    key_issue: str = ""


@router.get("/{grievance_mongo_id}", response_model=SummaryResponse)
async def get_summary(grievance_mongo_id: str):
    grievances_col = get_collection("grievances")

    try:
        oid = ObjectId(grievance_mongo_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")

    doc = await grievances_col.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Grievance not found")

    # Return cached summary if fresh (< 6 hours old)
    meta = doc.get("aiMetadata") or {}
    cached_at = meta.get("analyzedAt")
    if meta.get("summary") and cached_at:
        age_hours = (datetime.utcnow() - cached_at).total_seconds() / 3600
        if age_hours < 6:
            return SummaryResponse(
                available=True,
                summary=meta["summary"],
                sentiment=meta.get("sentiment", "neutral"),
                urgency_level=meta.get("urgencyLevel", "medium"),
                key_issue=meta.get("keyIssue", ""),
            )

    # Build comment snippet
    comments = doc.get("comments", [])[-3:]
    comment_text = " | ".join(c.get("text", "")[:150] for c in comments) or "None"

    prompt = PROMPT_TEMPLATE.format(
        title=doc.get("title", ""),
        description=doc.get("description", "")[:1000],
        category=str(doc.get("category", "General")),
        priority=doc.get("priority", "Medium"),
        status=doc.get("status", ""),
        num_comments=len(doc.get("comments", [])),
        comment_snippet=comment_text,
    )

    result = await generate_json(prompt)
    if result is None:
        return SummaryResponse(available=False)

    # Cache result in Mongo
    await grievances_col.update_one(
        {"_id": oid},
        {"$set": {
            "aiMetadata.summary": result.get("summary", ""),
            "aiMetadata.sentiment": result.get("sentiment", "neutral"),
            "aiMetadata.urgencyLevel": result.get("urgency_level", "medium"),
            "aiMetadata.keyIssue": result.get("key_issue", ""),
            "aiMetadata.analyzedAt": datetime.utcnow(),
        }},
    )

    return SummaryResponse(
        available=True,
        summary=result.get("summary", ""),
        sentiment=result.get("sentiment", "neutral"),
        urgency_level=result.get("urgency_level", "medium"),
        key_issue=result.get("key_issue", ""),
    )
