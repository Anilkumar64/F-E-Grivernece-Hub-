"""
POST /suggest-response
Generates a professional admin response draft for a grievance using Gemini.
Looks up past resolved similar grievances for context.
"""
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from bson import ObjectId

from services.gemini_client import generate_text
from services.db_service import get_collection

logger = logging.getLogger(__name__)
router = APIRouter()

PROMPT_TEMPLATE = """
You are a professional university administrator responding to a student grievance.
Write a formal, empathetic, and action-oriented response to the following grievance.

Grievance ID: {grievance_id}
Category: {category}
Priority: {priority}
Title: {title}
Description: {description}
Current Status: {status}

{past_context}

Requirements:
- Begin with an acknowledgement of the student's concern
- State the action being taken or the reason for the current status
- Mention the expected timeline for resolution (if applicable)
- Close professionally
- Keep it under 200 words
- Do NOT include a subject line or salutation header

Write only the response body text.
"""


class SuggestRequest(BaseModel):
    grievance_mongo_id: str = Field(..., min_length=10)


class SuggestResponse(BaseModel):
    available: bool = True
    draft: str = ""


@router.post("", response_model=SuggestResponse)
async def suggest_response(body: SuggestRequest):
    grievances_col = get_collection("grievances")

    try:
        oid = ObjectId(body.grievance_mongo_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid grievance ID")

    doc = await grievances_col.find_one(
        {"_id": oid},
        {"title": 1, "description": 1, "status": 1, "priority": 1,
         "grievanceId": 1, "category": 1},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Grievance not found")

    # Fetch 2 similar resolved grievances for context
    past_cursor = grievances_col.find(
        {"status": {"$in": ["Resolved", "Closed"]},
         "comments": {"$exists": True, "$ne": []}},
        {"title": 1, "comments": 1},
    ).sort("createdAt", -1).limit(3)
    past_docs = await past_cursor.to_list(length=3)

    past_context = ""
    if past_docs:
        examples = []
        for p in past_docs:
            admin_comments = [
                c["text"] for c in p.get("comments", [])
                if c.get("role") in ("admin", "superadmin")
            ]
            if admin_comments:
                examples.append(f'- "{p["title"]}": {admin_comments[-1][:200]}')
        if examples:
            past_context = "Examples of past admin responses for similar issues:\n" + "\n".join(examples)

    prompt = PROMPT_TEMPLATE.format(
        grievance_id=doc.get("grievanceId", ""),
        category=str(doc.get("category", "General")),
        priority=doc.get("priority", "Medium"),
        title=doc.get("title", ""),
        description=doc.get("description", ""),
        status=doc.get("status", ""),
        past_context=past_context,
    )

    draft = await generate_text(prompt, temperature=0.4, max_tokens=400)
    if draft is None:
        return SuggestResponse(available=False)

    return SuggestResponse(available=True, draft=draft)
