"""
POST /search
Dual-mode search:
  mode=semantic  — embed query, find similar grievances by cosine similarity
  mode=nlfilter  — convert natural language to a MongoDB filter via Gemini
"""
import json
import logging
import re
from datetime import datetime, timedelta
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.embedding_service import embed
from services.gemini_client import generate_json
from services.db_service import get_collection

logger = logging.getLogger(__name__)
router = APIRouter()

NL_FILTER_PROMPT = """
Convert this natural language search query into a MongoDB filter JSON for a grievances collection.

Query: "{query}"

The grievances collection has these fields:
- status: "Pending"|"InProgress"|"UnderReview"|"Resolved"|"Closed"|"Escalated"
- priority: "Low"|"Medium"|"High"|"Critical"
- isEscalated: boolean
- isAcademicUrgent: boolean
- createdAt: ISODate
- department: ObjectId (do NOT filter by this unless the user explicitly names a dept)

Return ONLY a valid JSON object representing the MongoDB filter.
Use $gte/$lte for date ranges, e.g. {{"createdAt": {{"$gte": "2024-01-01T00:00:00Z"}}}}.
If no filter applies, return {{}}.
"""


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=300)
    mode: str = Field(default="semantic", pattern="^(semantic|nlfilter)$")
    limit: int = Field(default=10, ge=1, le=50)


class SearchHit(BaseModel):
    grievance_id: str
    mongo_id: str
    title: str
    status: str
    priority: str
    similarity: float = 0.0
    created_at: str


class SearchResponse(BaseModel):
    available: bool = True
    mode: str
    hits: list[SearchHit] = Field(default_factory=list)
    mongo_filter: dict = Field(default_factory=dict)


@router.post("", response_model=SearchResponse)
async def semantic_search(body: SearchRequest):
    grievances_col = get_collection("grievances")

    if body.mode == "nlfilter":
        prompt = NL_FILTER_PROMPT.format(query=body.query)
        result = await generate_json(prompt)
        if result is None:
            return SearchResponse(available=False, mode=body.mode)

        # Sanitise the filter — only allow known safe keys
        allowed = {"status", "priority", "isEscalated", "isAcademicUrgent", "createdAt"}
        safe_filter = {k: v for k, v in result.items() if k in allowed}

        cursor = grievances_col.find(
            safe_filter,
            {"grievanceId": 1, "title": 1, "status": 1, "priority": 1, "createdAt": 1},
        ).sort("createdAt", -1).limit(body.limit)
        docs = await cursor.to_list(length=body.limit)

        hits = [
            SearchHit(
                grievance_id=d.get("grievanceId", ""),
                mongo_id=str(d["_id"]),
                title=d.get("title", ""),
                status=d.get("status", ""),
                priority=d.get("priority", ""),
                created_at=d.get("createdAt", datetime.utcnow()).isoformat(),
            )
            for d in docs
        ]
        return SearchResponse(available=True, mode=body.mode, hits=hits, mongo_filter=safe_filter)

    # Semantic mode — embed query, compare against stored embeddings
    cutoff = datetime.utcnow() - timedelta(days=180)
    cursor = grievances_col.find(
        {"createdAt": {"$gte": cutoff}, "aiMetadata.embedding": {"$exists": True}},
        {"grievanceId": 1, "title": 1, "status": 1, "priority": 1,
         "createdAt": 1, "aiMetadata.embedding": 1},
    ).limit(1000)
    docs = await cursor.to_list(length=1000)

    if not docs:
        return SearchResponse(available=True, mode=body.mode, hits=[])

    query_vec = embed([body.query])[0]
    vecs, valid_docs = [], []
    for doc in docs:
        emb = (doc.get("aiMetadata") or {}).get("embedding")
        if emb and len(emb) == 384:
            vecs.append(emb)
            valid_docs.append(doc)

    if not vecs:
        return SearchResponse(available=True, mode=body.mode, hits=[])

    corpus = np.array(vecs, dtype=np.float32)
    scores = (corpus @ query_vec).tolist()
    ranked = sorted(zip(scores, valid_docs), key=lambda x: x[0], reverse=True)

    hits = []
    for score, doc in ranked[:body.limit]:
        if score < 0.4:
            break
        hits.append(SearchHit(
            grievance_id=doc.get("grievanceId", ""),
            mongo_id=str(doc["_id"]),
            title=doc.get("title", ""),
            status=doc.get("status", ""),
            priority=doc.get("priority", ""),
            similarity=round(score, 3),
            created_at=doc.get("createdAt", datetime.utcnow()).isoformat(),
        ))

    return SearchResponse(available=True, mode=body.mode, hits=hits)
