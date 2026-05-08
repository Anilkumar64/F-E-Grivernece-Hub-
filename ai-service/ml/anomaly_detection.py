"""
Statistical anomaly detection for grievance volume spikes per department.
Uses Z-score method on weekly grievance counts.
No ML model needed - purely statistical, fast and interpretable.
"""
import logging
import numpy as np

logger = logging.getLogger(__name__)


def detect_anomalies(
    dept_weekly_counts: dict[str, list[int]],
    threshold_z: float = 2.0,
    min_weeks: int = 3,
) -> list[tuple[str, int, float, float]]:
    """
    Detect departments with anomalously high grievance volume this week.

    Args:
        dept_weekly_counts: dict mapping dept_id -> list of weekly counts
                            The LAST element is the current week.
        threshold_z:        Z-score threshold above which we flag a spike.
        min_weeks:          Minimum history weeks required to flag anything.

    Returns:
        List of (dept_id, current_count, baseline_mean, z_score)
        sorted by z_score descending.
    """
    anomalies = []

    for dept_id, weekly in dept_weekly_counts.items():
        if len(weekly) < min_weeks:
            continue

        current = weekly[-1]
        history = weekly[:-1]

        if not history:
            continue

        mean = float(np.mean(history))
        std = float(np.std(history))

        if std < 0.5:
            # Near-zero variance: flag only if current >> historical mean
            if current > mean * 3 and current >= 5:
                anomalies.append((dept_id, current, mean, 999.0))
            continue

        z = (current - mean) / std
        if z >= threshold_z and current >= 3:
            anomalies.append((dept_id, current, mean, z))

    anomalies.sort(key=lambda x: x[3], reverse=True)
    return anomalies
