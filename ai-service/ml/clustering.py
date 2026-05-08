"""
Root cause clustering using sentence-transformer embeddings + KMeans.
Automatically selects the number of clusters using silhouette scoring.
"""
import logging
import numpy as np
from sklearn.cluster import KMeans, MiniBatchKMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import normalize

from services.embedding_service import embed

logger = logging.getLogger(__name__)


def cluster_grievances(
    texts: list[str],
    min_clusters: int = 2,
    max_clusters: int = 10,
) -> tuple[list[int], int]:
    """
    Cluster a list of grievance texts.

    Returns:
        labels     - cluster assignment for each text (-1 = noise)
        n_clusters - number of clusters found
    """
    if len(texts) < 5:
        return [0] * len(texts), 1

    logger.info("Embedding %d texts for clustering …", len(texts))
    embeddings = embed(texts)           # shape (N, 384), already L2-normed
    embeddings = normalize(embeddings)  # ensure normalised

    n = len(texts)
    best_k = min_clusters
    best_score = -1.0
    best_labels = None

    upper = min(max_clusters + 1, n)
    for k in range(min_clusters, upper):
        try:
            km = MiniBatchKMeans(n_clusters=k, random_state=42, n_init=5)
            labels = km.fit_predict(embeddings)
            if len(set(labels)) < 2:
                continue
            score = silhouette_score(embeddings, labels, metric="cosine", sample_size=min(500, n))
            logger.debug("k=%d silhouette=%.3f", k, score)
            if score > best_score:
                best_score = score
                best_k = k
                best_labels = labels
        except Exception as exc:
            logger.warning("Clustering k=%d failed: %s", k, exc)
            continue

    if best_labels is None:
        best_labels = [0] * n
        best_k = 1

    logger.info("Best clustering: k=%d, silhouette=%.3f", best_k, best_score)
    return best_labels.tolist(), best_k
