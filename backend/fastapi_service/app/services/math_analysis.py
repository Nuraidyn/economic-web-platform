"""
Mathematical analysis utilities for economic time-series data.

All functions are stateless and work on plain Python lists / numpy arrays.
They are intentionally kept pure so they can be called from background
workers or Celery tasks in the future without DB dependencies.
"""
from __future__ import annotations

from typing import List, Optional, Tuple

import numpy as np
from scipy import integrate, stats


def validate_series(years: list, values: list, label: str = "series") -> None:
    """Raise ValueError if the series is unusable."""
    if len(years) != len(values):
        raise ValueError(f"{label}: 'years' and 'values' must have the same length.")
    if len(years) < 2:
        raise ValueError(f"{label}: at least 2 data points required.")


# ── Derivative ─────────────────────────────────────────────────────────────────

def compute_derivative(years: List[int], values: List[float]) -> List[float]:
    """
    First derivative of a time series using numpy.gradient (central differences).

    numpy.gradient uses second-order accurate central differences for interior
    points and first-order accurate one-side differences at the boundaries.
    This correctly handles non-uniform year spacing.

    Returns a list of rate-of-change values, same length as input.
    """
    validate_series(years, values)
    x = np.array(years, dtype=float)
    y = np.array(values, dtype=float)
    dy_dx = np.gradient(y, x)
    return dy_dx.tolist()


# ── Integral ───────────────────────────────────────────────────────────────────

def compute_integral(years: List[int], values: List[float]) -> List[float]:
    """
    Cumulative trapezoidal integral over time.

    Uses scipy.integrate.cumulative_trapezoid with initial=0 so the result
    has the same length as the input and starts at 0.

    Interpretation: cumulative[i] is the area under the curve from years[0]
    to years[i], i.e. the total 'accumulated' value up to that point.
    """
    validate_series(years, values)
    x = np.array(years, dtype=float)
    y = np.array(values, dtype=float)
    cumulative = integrate.cumulative_trapezoid(y, x, initial=0)
    return cumulative.tolist()


# ── Correlation ────────────────────────────────────────────────────────────────

def compute_raw_correlation(
    values_a: List[float],
    values_b: List[float],
) -> Tuple[float, float, str]:
    """
    Pearson correlation between two equal-length value arrays.

    Returns (r, p_value, interpretation).
    Uses scipy.stats.pearsonr which also provides a two-tailed p-value.
    """
    if len(values_a) != len(values_b):
        raise ValueError("'values_a' and 'values_b' must have the same length.")
    if len(values_a) < 2:
        raise ValueError("At least 2 data points required.")

    a = np.array(values_a, dtype=float)
    b = np.array(values_b, dtype=float)

    # Guard against constant arrays (correlation undefined)
    if np.std(a) == 0 or np.std(b) == 0:
        return 0.0, 1.0, "Correlation undefined — one or both series are constant."

    result = stats.pearsonr(a, b)
    r = float(result.statistic)
    p = float(result.pvalue)
    interpretation = _interpret_correlation(r, p)
    return r, p, interpretation


def _interpret_correlation(r: float, p: float) -> str:
    sig = "statistically significant (p<0.05)" if p < 0.05 else "not statistically significant"
    abs_r = abs(r)
    direction = "positive" if r > 0 else "negative"
    if abs_r >= 0.8:
        strength = "very strong"
    elif abs_r >= 0.6:
        strength = "strong"
    elif abs_r >= 0.4:
        strength = "moderate"
    elif abs_r >= 0.2:
        strength = "weak"
    else:
        strength = "negligible"
    return f"{strength.capitalize()} {direction} correlation (r={r:.3f}), {sig}."


# ── Descriptive statistics helper ──────────────────────────────────────────────

def describe_series(values: List[float]) -> dict:
    """
    Basic descriptive statistics for a value array.
    Used internally by analysis endpoints to enrich responses.
    """
    y = np.array(values, dtype=float)
    return {
        "count": int(len(y)),
        "mean": float(np.mean(y)),
        "std": float(np.std(y)),
        "min": float(np.min(y)),
        "max": float(np.max(y)),
        "median": float(np.median(y)),
    }
