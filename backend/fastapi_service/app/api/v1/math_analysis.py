"""
Mathematical analysis endpoints.

These routes accept raw numeric arrays (no DB lookup) and return
derivative, integral, and correlation computations.

All computations are CPU-bound but fast for typical time-series lengths
(< 100 points). FastAPI runs sync handlers in a thread pool automatically,
so the async event loop is not blocked.
"""
from fastapi import APIRouter, HTTPException

from app.schemas import (
    AnalysisSeriesRequest,
    DerivativeResponse,
    IntegralResponse,
    RawCorrelationRequest,
    RawCorrelationResponse,
)
from app.services.math_analysis import (
    compute_derivative,
    compute_integral,
    compute_raw_correlation,
    describe_series,
)

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/derivative", response_model=DerivativeResponse)
def derivative(payload: AnalysisSeriesRequest):
    """
    Compute the first derivative (rate of change) of a time series.

    Uses numpy.gradient with central differences — handles non-uniform
    year spacing correctly. The result at each point represents how fast
    the indicator is changing per year.
    """
    try:
        dy = compute_derivative(payload.years, payload.values)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return DerivativeResponse(
        years=payload.years,
        derivative=dy,
        stats=describe_series(dy),
    )


@router.post("/integral", response_model=IntegralResponse)
def integral(payload: AnalysisSeriesRequest):
    """
    Compute the cumulative trapezoidal integral of a time series.

    The result at each point is the area under the curve from the first
    year to that year — i.e., the total accumulated value over time.
    Useful for measuring cumulative GDP growth, accumulated inflation, etc.
    """
    try:
        cumulative = compute_integral(payload.years, payload.values)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return IntegralResponse(
        years=payload.years,
        cumulative=cumulative,
        total=cumulative[-1] if cumulative else 0.0,
    )


@router.post("/correlation", response_model=RawCorrelationResponse)
def correlation_raw(payload: RawCorrelationRequest):
    """
    Compute Pearson correlation between two indicator value arrays.

    Both arrays must be the same length and aligned by year.
    Returns the correlation coefficient r ∈ [-1, 1], a two-tailed
    p-value, and a plain-language interpretation.

    Use this endpoint when you already have the data client-side.
    For DB-backed correlation, use GET /correlation.
    """
    try:
        r, p_value, interpretation = compute_raw_correlation(
            payload.values_a, payload.values_b
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return RawCorrelationResponse(
        correlation=r,
        p_value=p_value,
        points=len(payload.values_a),
        interpretation=interpretation,
    )
