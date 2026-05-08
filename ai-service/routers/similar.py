"""
GET /similar/{grievance_mongo_id}
Returns the top-N semantically similar grievances using stored embeddings.
If a grievance has no stored embedding, it is computed and stored on-the-fly.
"""
import logging
from datetime import datetime
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from bson import ObjectId

from services.embedding_service import embed, cosine_similarity_matrix
from services.db_service import get_collection
from config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()


class SimilarGrievance(BaseModel):
    grievance_id: str
    mongo_id: str
    title: str
    status: str
    similarity: float
    summary: str = ""


class SimilarResponse(BaseModel):
    available: bool = True
    similar: list[SimilarGrievance] = []


@router.get("/{grievance_mongo_id}", response_model=SimilarResponse)
async def find_similar(grievance_mongo_id: str):
    grievances_col = get_collection("grievances")

    try:
        oid = ObjectId(grievance_mongo_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")

    target = await grievances_col.find_one({"_id": oid})
    if not target:
        raise HTTPException(status_code=404, detail="Grievance not found")

    # Get or compute embedding for target
    target_embedding = (target.get("aiMetadata") or {}).get("embedding")
    if not target_embedding or len(target_embedding) != 384:
        target_text = f"{target.get('title', '')}. {target.get('description', '')}"
        target_embedding = embed([target_text])[0].tolist()
        await grievances_col.update_one(
            {"_id": oid},
            {"$set": {"aiMetadata.embedding": target_embedding,
                       "aiMetadata.embeddedAt": datetime.utcnow()}},
        )

    query_vec = np.array(target_embedding, dtype=np.float32)

    # Fetch corpus (exclude self, last 6 months, limit 500)
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(days=180)
    cursor = grievances_col.find(
        {"_id": {"$ne": oid}, "createdAt": {"$gte": cutoff}},
        {"_id": 1, "grievanceId": 1, "title": 1, "status": 1,
         "description": 1, "aiMetadata.embedding": 1, "aiMetadata.summary": 1},
    ).limit(500)
    docs = await cursor.to_list(length=500)

    if not docs:
        return SimilarResponse(available=True, similar=[])

    # Build embedding matrix
    vecs = []
    valid_docs = []
    for doc in docs:
        emb = (doc.get("aiMetadata") or {}).get("embedding")
        if emb and len(emb) == 384:
            vecs.append(emb)
            valid_docs.append(doc)

    if not vecs:
        return SimilarResponse(available=True, similar=[])

    corpus_matrix = np.array(vecs, dtype=np.float32)
    scores = cosine_similarity_matrix(query_vec, corpus_matrix)

    results = []
    for idx, score in enumerate(scores.tolist()):
        if score >= settings.similarity_threshold:
            doc = valid_docs[idx]
            results.append(SimilarGrievance(
                grievance_id=doc.get("grievanceId", ""),
                mongo_id=str(doc["_id"]),
                title=doc.get("title", ""),
                status=doc.get("status", ""),
                similarity=round(score, 3),
                summary=(doc.get("aiMetadata") or {}).get("summary", ""),
            ))

    results.sort(key=lambda r: r.similarity, reverse=True)
    return SimilarResponse(available=True, similar=results[:settings.max_similar_results])
