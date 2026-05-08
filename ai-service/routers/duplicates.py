"""
POST /duplicates
Detects if a new grievance is semantically similar to existing open grievances
using sentence-transformer embeddings + cosine similarity.
Fetches embeddings from MongoDB grievances collection.
"""
import logging
from datetime import datetime, timedelta

import numpy as np
from bson import ObjectId
from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.embedding_service import embed, cosine_similarity_matrix
from services.db_service import get_collection
from config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()


class DuplicateRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10, max_length=5000)
    department_id: str = ""


class DuplicateMatch(BaseModel):
    grievance_id: str
    mongo_id: str
    title: str
    status: str
    similarity: float
    submitted_at: str


class DuplicateResponse(BaseModel):
    available: bool = True
    matches: list[DuplicateMatch] = []


@router.post("", response_model=DuplicateResponse)
async def detect_duplicates(body: DuplicateRequest):
    grievances_col = get_collection("grievances")

    # Look at grievances from the last 90 days
    cutoff = datetime.utcnow() - timedelta(days=90)
    query: dict = {
        "createdAt": {"$gte": cutoff},
        "status": {"$nin": ["Closed"]},
    }
    if body.department_id:
        try:
            query["department"] = ObjectId(body.department_id)
        except Exception:
            pass

    # Fetch grievances (only fields we need)
    cursor = grievances_col.find(
        query,
        {"_id": 1, "grievanceId": 1, "title": 1, "description": 1,
         "status": 1, "createdAt": 1, "aiMetadata.embedding": 1},
    ).limit(500)

    docs = await cursor.to_list(length=500)
    if not docs:
        return DuplicateResponse(available=True, matches=[])

    # Build query text
    query_text = f"{body.title}. {body.description}"
    query_vec = embed([query_text])[0]

    matches: list[DuplicateMatch] = []

    for doc in docs:
        # Use stored embedding if available, else recompute
        stored = (doc.get("aiMetadata") or {}).get("embedding")
        if stored and len(stored) == 384:
            doc_vec = np.array(stored, dtype=np.float32)
        else:
            doc_text = f"{doc.get('title', '')}. {doc.get('description', '')}"
            doc_vec = embed([doc_text])[0]

        score = float(np.dot(query_vec, doc_vec))   # both L2-normalised

        if score >= settings.similarity_threshold:
            matches.append(
                DuplicateMatch(
                    grievance_id=doc.get("grievanceId", ""),
                    mongo_id=str(doc["_id"]),
                    title=doc.get("title", ""),
                    status=doc.get("status", ""),
                    similarity=round(score, 3),
                    submitted_at=doc.get("createdAt", datetime.utcnow()).isoformat(),
                )
            )

    matches.sort(key=lambda m: m.similarity, reverse=True)
    return DuplicateResponse(
        available=True,
        matches=matches[: settings.max_similar_results],
    )
