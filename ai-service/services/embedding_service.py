"""
Sentence-Transformers embedding service.
Lazy-loads the model on first call and caches it in process memory.
All-MiniLM-L6-v2 produces 384-dimensional embeddings — fast and accurate
enough for grievance similarity at university scale (<100k documents).
"""
import logging
from typing import Optional

import numpy as np
from sentence_transformers import SentenceTransformer

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_embedder: Optional[SentenceTransformer] = None


def load_embedding_model() -> SentenceTransformer:
    """Load (or return cached) embedding model."""
    global _embedder
    if _embedder is None:
        logger.info("Loading embedding model '%s' …", settings.embedding_model)
        _embedder = SentenceTransformer(settings.embedding_model)
        logger.info("Embedding model loaded ✅")
    return _embedder


def embed(texts: list[str]) -> np.ndarray:
    """
    Embed a list of texts.
    Returns a float32 ndarray of shape (len(texts), 384).
    """
    model = load_embedding_model()
    vectors = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return vectors.astype(np.float32)


def embed_one(text: str) -> list[float]:
    """Embed a single text, return as a Python list (for MongoDB storage)."""
    return embed([text])[0].tolist()


def cosine_similarity_matrix(query_vec: np.ndarray, corpus_vecs: np.ndarray) -> np.ndarray:
    """
    Compute cosine similarity between one query vector and a corpus matrix.
    Both inputs must already be L2-normalised (which SentenceTransformer does
    when normalize_embeddings=True), so dot-product == cosine similarity.
    Returns array of shape (len(corpus_vecs),).
    """
    return corpus_vecs @ query_vec


def top_k_similar(
    query_text: str,
    corpus_texts: list[str],
    corpus_embeddings: Optional[np.ndarray] = None,
    k: int = 5,
    threshold: float = 0.70,
) -> list[tuple[int, float]]:
    """
    Return the top-k most similar indices from corpus_texts to query_text.
    corpus_embeddings can be pre-computed to avoid re-encoding.
    Returns list of (index, score) tuples, filtered by threshold, sorted desc.
    """
    if not corpus_texts:
        return []
    query_vec = embed([query_text])[0]
    if corpus_embeddings is None:
        corpus_embeddings = embed(corpus_texts)
    scores = cosine_similarity_matrix(query_vec, corpus_embeddings)
    ranked = sorted(enumerate(scores.tolist()), key=lambda x: x[1], reverse=True)
    return [(idx, score) for idx, score in ranked if score >= threshold][:k]
