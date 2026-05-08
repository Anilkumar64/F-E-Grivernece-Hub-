"""
Time-series grievance volume forecasting.
Uses linear regression on log-transformed counts with 7-day rolling average
smoothing to produce a 30-day ahead forecast.
Lightweight - no heavy dependencies like Prophet needed.
"""
import logging
from datetime import datetime, timedelta
import numpy as np

logger = logging.getLogger(__name__)


def _moving_average(values: list[float], window: int = 7) -> list[float]:
    """Simple moving average."""
    result = []
    for i in range(len(values)):
        start = max(0, i - window + 1)
        result.append(float(np.mean(values[start : i + 1])))
    return result


def _linear_trend(x: np.ndarray, y: np.ndarray) -> tuple[float, float]:
    """Fit y = slope*x + intercept via OLS."""
    A = np.vstack([x, np.ones_like(x)]).T
    slope, intercept = np.linalg.lstsq(A, y, rcond=None)[0]
    return float(slope), float(intercept)


def forecast_volume(
    dates: list[str],
    counts: list[int],
    horizon: int = 30,
    smoothing_window: int = 7,
) -> tuple[list[tuple[str, float]], str]:
    """
    Forecast grievance volume for the next `horizon` days.

    Args:
        dates:   List of date strings "YYYY-MM-DD" (ascending).
        counts:  Corresponding daily grievance counts.
        horizon: Number of days to forecast ahead.

    Returns:
        predictions - list of (date_str, predicted_count)
        trend       - "rising" | "falling" | "stable"
    """
    if len(dates) < 7:
        logger.warning("Not enough data for forecasting (%d days)", len(dates))
        return [], "stable"

    # Smooth to reduce noise
    smoothed = _moving_average([float(c) for c in counts], smoothing_window)

    x = np.arange(len(smoothed), dtype=float)
    y = np.array(smoothed)

    slope, intercept = _linear_trend(x, y)

    # Determine trend label
    if slope > 0.3:
        trend = "rising"
    elif slope < -0.3:
        trend = "falling"
    else:
        trend = "stable"

    # Generate forecast
    last_date = datetime.strptime(dates[-1], "%Y-%m-%d")
    predictions: list[tuple[str, float]] = []
    n = len(smoothed)

    for i in range(1, horizon + 1):
        future_date = last_date + timedelta(days=i)
        predicted = slope * (n + i - 1) + intercept
        # Clamp to a sensible range
        predicted = max(0.0, predicted)
        predictions.append((future_date.strftime("%Y-%m-%d"), predicted))

    logger.info("Forecast: slope=%.3f trend=%s horizon=%d", slope, trend, horizon)
    return predictions, trend
