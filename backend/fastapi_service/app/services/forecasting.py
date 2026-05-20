"""
Enhanced forecasting service — multiple models, statistics, and automatic selection.

Mathematical models
───────────────────
  linear_trend      OLS y = a·x + b; prediction intervals via Student's t-distribution.
                    Widened for forecast steps further from the training mean (leverage).
  moving_average_N  Simple MA over window N; flat forecast; variance grows with horizon.
  weighted_ma_N     Linearly-weighted MA (recent obs carry more weight); flat forecast.
  exp_smoothing     Single exponential smoothing; α optimised by SSE on training data.
                    Forecast variance formula: Var(h) = σ²·[1 + (h-1)·α²]
  holt_linear       Holt's double exponential smoothing (level + trend);
                    α and β jointly optimised by SSE; available when n ≥ 10.

Model selection
───────────────
  Rolling-origin backtest on the last 5 observations: each model predicts one step
  ahead from an expanding window.  The model with the lowest RMSE is chosen.
  If backtest cannot run (n < 10), the model with the highest R² is selected instead.

Statistical utilities
─────────────────────
  - CAGR and average YoY growth rate
  - Anomaly detection via modified z-score (median/MAD — robust to non-normality)
  - Trend direction: slope relative to series mean
  - Coefficient of variation (volatility proxy)
  - Seasonality hint via lag-1 autocorrelation
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Tuple

import numpy as np
from scipy import stats
from sqlalchemy.orm import Session

from app.models import Country, Indicator, Observation
from app.models_forecast import ForecastPoint, ForecastRun

# ─── Constants ────────────────────────────────────────────────────────────────

MAX_TRAINING_POINTS = 25
MIN_TRAINING_POINTS = 8
CONFIDENCE_LEVEL = 0.95        # used for all prediction intervals
ANOMALY_Z_THRESHOLD = 2.5      # modified z-score cutoff
MIN_HOLT_POINTS = 10           # minimum series length for Holt's method


# ─── Data classes ─────────────────────────────────────────────────────────────

@dataclass
class ModelResult:
    name: str
    future_years: List[int]
    predictions: List[float]
    lower: List[float]
    upper: List[float]
    confidence_score: float      # 0-1; R² or equivalent fit quality
    rmse: Optional[float] = None
    mae: Optional[float] = None
    assumptions: str = ""


@dataclass
class ForecastBundle:
    """All outputs from one full forecasting pipeline run."""
    best: ModelResult
    trend_direction: str                   # "increasing" | "decreasing" | "stable"
    anomaly_years: List[int]
    statistical_summary: Dict
    model_comparison: List[Dict]


@dataclass
class ForecastResult:
    run: ForecastRun
    points: List[ForecastPoint]
    bundle: Optional[ForecastBundle] = None


# ─── Database helpers ─────────────────────────────────────────────────────────

def prepare_series(
    db: Session, country_code: str, indicator_code: str
) -> Tuple[Optional[object], Optional[object], list]:
    country = db.query(Country).filter(Country.code == country_code.upper()).first()
    indicator = db.query(Indicator).filter(Indicator.code == indicator_code).first()
    if not country or not indicator:
        return None, None, []
    series = (
        db.query(Observation)
        .filter(Observation.country_id == country.id)
        .filter(Observation.indicator_id == indicator.id)
        .order_by(Observation.year)
        .all()
    )
    return country, indicator, series


# ─── Data preparation ─────────────────────────────────────────────────────────

def sanitize_training_series(
    years: List, values: List, max_points: int = MAX_TRAINING_POINTS
) -> Tuple[List[int], List[float]]:
    """
    Keep the most recent `max_points` observations, remove nulls,
    and winsorize at 5th/95th percentile to reduce outlier influence.
    Returns (years, values) as plain Python lists.
    """
    paired = sorted(
        [(int(y), float(v)) for y, v in zip(years, values) if v is not None],
        key=lambda p: p[0],
    )
    if len(paired) > max_points:
        paired = paired[-max_points:]
    if not paired:
        return [], []

    y_arr = np.array([v for _, v in paired], dtype=float)
    if len(y_arr) >= MIN_TRAINING_POINTS:
        lo = float(np.percentile(y_arr, 5))
        hi = float(np.percentile(y_arr, 95))
        if lo <= hi:
            y_arr = np.clip(y_arr, lo, hi)

    return [yr for yr, _ in paired], [float(v) for v in y_arr.tolist()]


# ─── Statistical utilities ────────────────────────────────────────────────────

def _r_squared(actual: np.ndarray, predicted: np.ndarray) -> float:
    """Coefficient of determination R², clamped to [0, 1]."""
    ss_res = float(np.sum((actual - predicted) ** 2))
    ss_tot = float(np.sum((actual - np.mean(actual)) ** 2))
    if ss_tot == 0:
        return 1.0 if ss_res == 0 else 0.0
    return max(0.0, 1.0 - ss_res / ss_tot)


def _t_crit(df: int) -> float:
    """Two-tailed t critical value at the configured confidence level."""
    return float(stats.t.ppf((1 + CONFIDENCE_LEVEL) / 2, df=max(1, df)))


def detect_anomalies(years: List[int], values: List[float]) -> List[int]:
    """
    Robust outlier detection using the modified z-score (Iglewicz & Hoaglin).
    Score = 0.6745 * |x - median| / MAD.  Threshold: 2.5 ≈ ~1% false-positive rate.
    """
    if len(values) < 4:
        return []
    y = np.array(values, dtype=float)
    med = float(np.median(y))
    mad = float(np.median(np.abs(y - med)))
    if mad == 0:
        return []
    mz = 0.6745 * np.abs(y - med) / mad
    return [years[i] for i in range(len(years)) if mz[i] > ANOMALY_Z_THRESHOLD]


def calculate_growth_rates(
    years: List[int], values: List[float]
) -> Tuple[Optional[float], Optional[float]]:
    """
    Returns (CAGR, average YoY growth rate) as decimal fractions.
    CAGR = (end/start)^(1/n) - 1.  Only computed when both endpoints are positive.
    """
    if len(values) < 2:
        return None, None
    n_yrs = years[-1] - years[0]
    cagr = None
    if values[0] > 0 and values[-1] > 0 and n_yrs > 0:
        cagr = float((values[-1] / values[0]) ** (1.0 / n_yrs) - 1)
    yoy = [
        (values[i] - values[i - 1]) / abs(values[i - 1])
        for i in range(1, len(values))
        if values[i - 1] != 0
    ]
    avg_yoy = float(np.mean(yoy)) if yoy else None
    return cagr, avg_yoy


def calculate_volatility(values: List[float]) -> float:
    """Coefficient of variation = std / |mean|.  Returns std alone when mean ≈ 0."""
    if len(values) < 2:
        return 0.0
    arr = np.array(values, dtype=float)
    mean = float(np.mean(arr))
    return float(np.std(arr) / abs(mean)) if abs(mean) > 1e-12 else float(np.std(arr))


def detect_trend_direction(slope: float, values: List[float]) -> str:
    """
    Label trend based on slope magnitude relative to the series mean.
    Threshold < 0.5% of mean → "stable".
    """
    mean_abs = float(np.mean(np.abs(values))) if values else 0.0
    if mean_abs < 1e-12:
        return "stable"
    relative = abs(slope) / mean_abs
    if relative < 0.005:
        return "stable"
    return "increasing" if slope > 0 else "decreasing"


def build_statistical_summary(years: List[int], values: List[float]) -> Dict:
    """Comprehensive historical statistics for the training window."""
    y = np.array(values, dtype=float)
    cagr, avg_yoy = calculate_growth_rates(years, values)
    anomalies = detect_anomalies(years, values)
    volatility = calculate_volatility(values)

    slope = 0.0
    if len(years) >= 2:
        coeff = np.polyfit(np.array(years, dtype=float), y, 1)
        slope = float(coeff[0])
    trend_dir = detect_trend_direction(slope, values)

    pct_change = None
    if len(values) >= 2 and abs(values[0]) > 1e-12:
        pct_change = round((values[-1] - values[0]) / abs(values[0]) * 100, 3)

    return {
        "mean": round(float(np.mean(y)), 4),
        "std": round(float(np.std(y)), 4),
        "min": round(float(np.min(y)), 4),
        "max": round(float(np.max(y)), 4),
        "median": round(float(np.median(y)), 4),
        "trend_direction": trend_dir,
        "cagr_pct": round(cagr * 100, 3) if cagr is not None else None,
        "avg_yoy_growth_pct": round(avg_yoy * 100, 3) if avg_yoy is not None else None,
        "pct_change_total": pct_change,
        "volatility_cv": round(volatility, 4),
        "anomaly_years": anomalies,
        "data_points": len(values),
        "year_range": f"{years[0]}–{years[-1]}" if years else "",
    }


# ─── Forecasting models ───────────────────────────────────────────────────────

def linear_trend_forecast(
    values: List[float], years: List[int], horizon: int
) -> Tuple[ModelResult, str]:
    """
    OLS linear regression y = a·x + b.

    Prediction intervals use the full formula:
        margin = t * s * sqrt(1 + 1/n + (x* - x̄)² / Σ(xᵢ - x̄)²)
    which naturally widens the further the forecast year is from the training mean.
    """
    x = np.array(years, dtype=float)
    y = np.array(values, dtype=float)
    n = len(x)

    coeff = np.polyfit(x, y, 1)
    slope, intercept = float(coeff[0]), float(coeff[1])
    y_fit = slope * x + intercept
    residuals = y - y_fit
    s = float(np.std(residuals, ddof=min(2, n - 1))) if n > 1 else 0.0

    r2 = _r_squared(y, y_fit)
    t_val = _t_crit(n - 2)
    x_mean = float(np.mean(x))
    ss_xx = float(np.sum((x - x_mean) ** 2))

    future_years = list(range(years[-1] + 1, years[-1] + horizon + 1))
    preds, lows, highs = [], [], []
    for fy in future_years:
        pred = slope * fy + intercept
        spread = t_val * s * float(
            np.sqrt(1.0 + 1.0 / n + (fy - x_mean) ** 2 / max(ss_xx, 1e-12))
        )
        preds.append(float(pred))
        lows.append(float(pred - spread))
        highs.append(float(pred + spread))

    trend_dir = detect_trend_direction(slope, values)
    return (
        ModelResult(
            name="linear_trend",
            future_years=future_years,
            predictions=preds,
            lower=lows,
            upper=highs,
            confidence_score=round(max(0.0, r2), 3),
            assumptions=(
                f"OLS linear trend; slope={slope:.4f}; R²={r2:.3f}; "
                f"{int(CONFIDENCE_LEVEL * 100)}% prediction intervals (t-dist, widened by leverage)"
            ),
        ),
        trend_dir,
    )


def moving_average_forecast(
    values: List[float], years: List[int], horizon: int, window: int = 3
) -> ModelResult:
    """
    Simple moving average — flat forecast at the last window average.
    Prediction interval widens as sqrt(1 + h/m) where m is the number of MA values.
    """
    window = max(2, min(window, len(values)))
    y = np.array(values, dtype=float)
    ma_vals = np.convolve(y, np.ones(window) / window, mode="valid")
    last_ma = float(ma_vals[-1])

    actual_aligned = y[window - 1:]
    std = float(np.std(ma_vals)) if len(ma_vals) > 1 else float(np.std(y))
    r2 = _r_squared(actual_aligned, ma_vals) if len(ma_vals) >= 2 else 0.0
    t_val = _t_crit(max(1, len(ma_vals) - 1))
    m = len(ma_vals)

    future_years = list(range(years[-1] + 1, years[-1] + horizon + 1))
    preds = [last_ma] * horizon
    lows  = [last_ma - t_val * std * float(np.sqrt(1.0 + (i + 1) / m)) for i in range(horizon)]
    highs = [last_ma + t_val * std * float(np.sqrt(1.0 + (i + 1) / m)) for i in range(horizon)]

    return ModelResult(
        name=f"moving_average_{window}",
        future_years=future_years,
        predictions=preds,
        lower=lows,
        upper=highs,
        confidence_score=round(max(0.0, r2), 3),
        assumptions=f"Simple moving average (window={window}); flat forecast at {last_ma:.4f}",
    )


def weighted_moving_average_forecast(
    values: List[float], years: List[int], horizon: int, window: int = 5
) -> ModelResult:
    """
    Linearly-weighted moving average: weight_i = i / Σi (most recent = highest weight).
    Flat forecast, widening prediction intervals.
    """
    window = max(2, min(window, len(values)))
    y_full = np.array(values, dtype=float)
    weights = np.arange(1, window + 1, dtype=float)
    weights /= weights.sum()
    wma_val = float(np.dot(weights, y_full[-window:]))

    wma_series: List[float] = []
    for i in range(window - 1, len(y_full)):
        seg = y_full[i - window + 1: i + 1]
        w = np.arange(1, window + 1, dtype=float)
        w /= w.sum()
        wma_series.append(float(np.dot(w, seg)))

    std = float(np.std(wma_series)) if len(wma_series) > 1 else float(np.std(y_full))
    actual_aligned = y_full[window - 1:]
    r2 = _r_squared(actual_aligned, np.array(wma_series)) if len(wma_series) >= 2 else 0.0
    t_val = _t_crit(max(1, len(wma_series) - 1))
    m = len(wma_series)

    future_years = list(range(years[-1] + 1, years[-1] + horizon + 1))
    preds = [wma_val] * horizon
    lows  = [wma_val - t_val * std * float(np.sqrt(1.0 + (i + 1) / m)) for i in range(horizon)]
    highs = [wma_val + t_val * std * float(np.sqrt(1.0 + (i + 1) / m)) for i in range(horizon)]

    return ModelResult(
        name=f"weighted_ma_{window}",
        future_years=future_years,
        predictions=preds,
        lower=lows,
        upper=highs,
        confidence_score=round(max(0.0, r2), 3),
        assumptions=f"Weighted moving average (window={window}, linear weights); WMA={wma_val:.4f}",
    )


def exp_smoothing_forecast(
    values: List[float], years: List[int], horizon: int
) -> ModelResult:
    """
    Single exponential smoothing (SES / ETS(A,N,N)).
    α is chosen to minimise in-sample SSE (grid search over 0.05–0.95 step 0.05).
    Forecast is flat at the last smoothed level.
    Prediction variance: Var(h) = σ²·(1 + (h-1)·α²)  per the ETS prediction formula.
    """
    y = np.array(values, dtype=float)
    n = len(y)

    best_alpha, best_sse = 0.3, float("inf")
    for a_raw in np.arange(0.05, 0.96, 0.05):
        alpha = float(a_raw)
        level = float(y[0])
        sse = 0.0
        for t in range(1, n):
            sse += (float(y[t]) - level) ** 2
            level = alpha * float(y[t]) + (1.0 - alpha) * level
        if sse < best_sse:
            best_sse, best_alpha = sse, alpha

    alpha = best_alpha
    smoothed: List[float] = [float(y[0])]
    for t in range(1, n):
        smoothed.append(alpha * float(y[t]) + (1.0 - alpha) * smoothed[-1])

    residuals = y - np.array(smoothed)
    sigma = float(np.std(residuals, ddof=1)) if n > 1 else 0.0
    r2 = _r_squared(y[1:], np.array(smoothed[:-1])) if n > 2 else 0.5
    t_val = _t_crit(n - 2)
    last_level = smoothed[-1]

    future_years = list(range(years[-1] + 1, years[-1] + horizon + 1))
    preds = [last_level] * horizon
    lows = [
        last_level - t_val * sigma * float(np.sqrt(max(1.0, 1.0 + i * alpha ** 2)))
        for i in range(horizon)
    ]
    highs = [
        last_level + t_val * sigma * float(np.sqrt(max(1.0, 1.0 + i * alpha ** 2)))
        for i in range(horizon)
    ]

    return ModelResult(
        name=f"exp_smoothing_a{alpha:.2f}",
        future_years=future_years,
        predictions=preds,
        lower=lows,
        upper=highs,
        confidence_score=round(max(0.0, r2), 3),
        assumptions=(
            f"Single exponential smoothing; α={alpha:.2f} (SSE-optimised); "
            f"level={last_level:.4f}; variance grows as 1+(h-1)·α²"
        ),
    )


def holt_linear_forecast(
    values: List[float], years: List[int], horizon: int
) -> Optional[Tuple[ModelResult, str]]:
    """
    Holt's linear method (ETS(A,A,N) — double exponential smoothing).
    Both α (level smoothing) and β (trend smoothing) are jointly optimised by SSE.
    Forecast: F(h) = l_T + h·b_T.
    Prediction variance: σ²·h  (linear growth with horizon).
    Returns None when fewer than MIN_HOLT_POINTS observations are available.
    """
    y = np.array(values, dtype=float)
    n = len(y)
    if n < MIN_HOLT_POINTS:
        return None

    best_alpha, best_beta, best_sse = 0.3, 0.1, float("inf")
    for a_raw in np.arange(0.1, 0.9, 0.1):
        for b_raw in np.arange(0.05, 0.5, 0.05):
            alpha, beta = float(a_raw), float(b_raw)
            l_t = float(y[0])
            b_t = float(y[1] - y[0])
            sse = 0.0
            for t in range(1, n):
                sse += (float(y[t]) - (l_t + b_t)) ** 2
                l_new = alpha * float(y[t]) + (1.0 - alpha) * (l_t + b_t)
                b_new = beta * (l_new - l_t) + (1.0 - beta) * b_t
                l_t, b_t = l_new, b_new
            if sse < best_sse:
                best_sse = sse
                best_alpha, best_beta = alpha, beta

    alpha, beta = best_alpha, best_beta
    l_t = float(y[0])
    b_t = float(y[1] - y[0])
    fitted: List[float] = [float(y[0])]
    for t in range(1, n):
        fitted.append(l_t + b_t)
        l_new = alpha * float(y[t]) + (1.0 - alpha) * (l_t + b_t)
        b_new = beta * (l_new - l_t) + (1.0 - beta) * b_t
        l_t, b_t = l_new, b_new

    residuals = y - np.array(fitted)
    sigma = float(np.std(residuals, ddof=2)) if n > 2 else 0.0
    r2 = _r_squared(y[1:], np.array(fitted[:-1])) if n > 2 else 0.5
    t_val = _t_crit(n - 2)

    future_years = list(range(years[-1] + 1, years[-1] + horizon + 1))
    preds = [l_t + (h + 1) * b_t for h in range(horizon)]
    lows  = [p - t_val * sigma * float(np.sqrt(max(1.0, h + 1))) for h, p in enumerate(preds)]
    highs = [p + t_val * sigma * float(np.sqrt(max(1.0, h + 1))) for h, p in enumerate(preds)]

    trend_dir = detect_trend_direction(b_t, values)
    return (
        ModelResult(
            name="holt_linear",
            future_years=future_years,
            predictions=preds,
            lower=lows,
            upper=highs,
            confidence_score=round(max(0.0, r2), 3),
            assumptions=(
                f"Holt linear (ETS(A,A,N)); α={alpha:.2f}, β={beta:.2f}; "
                f"trend={b_t:.4f}/yr; variance grows linearly with horizon"
            ),
        ),
        trend_dir,
    )


# ─── Backtesting ──────────────────────────────────────────────────────────────

def backtest_model(
    values: List[float],
    years: List[int],
    forecast_fn: Callable,
    test_points: int = 5,
    **kwargs,
) -> Optional[Dict]:
    """
    Rolling-origin (walk-forward) backtest.
    For each of the last `test_points` observations, the model is trained on all
    preceding data and asked to predict one step ahead.
    Returns MAE and RMSE, or None if the test cannot run.
    """
    n = len(values)
    if n < 10:
        return None
    k = max(1, min(test_points, n - 5))
    errors: List[float] = []
    for idx in range(n - k, n):
        tv, ty = values[:idx], years[:idx]
        if len(tv) < MIN_TRAINING_POINTS:
            continue
        try:
            out = forecast_fn(tv, ty, 1, **kwargs)
            if isinstance(out, tuple):
                out = out[0]
            if out is None or not out.predictions:
                continue
            errors.append(float(values[idx]) - out.predictions[0])
        except Exception:
            continue
    if not errors:
        return None
    ae = [abs(e) for e in errors]
    return {
        "points": len(errors),
        "mae": round(float(np.mean(ae)), 6),
        "rmse": round(float(np.sqrt(np.mean([e ** 2 for e in errors]))), 6),
    }


# ─── Model selection ──────────────────────────────────────────────────────────

def select_best_model(
    candidates: List[Tuple[ModelResult, Optional[Dict]]]
) -> ModelResult:
    """
    Pick model by lowest backtest RMSE.
    Fall back to highest R²-based confidence_score when backtest was not possible.
    """
    with_bt = [(m, bt["rmse"]) for m, bt in candidates if bt and bt.get("rmse") is not None]
    if with_bt:
        return min(with_bt, key=lambda p: p[1])[0]
    return max(candidates, key=lambda p: p[0].confidence_score)[0]


# ─── Full pipeline ─────────────────────────────────────────────────────────────

def compute_forecast(
    values: List[float],
    years: List[int],
    horizon: int,
    preferred_model: str = "auto",
) -> Optional[ForecastBundle]:
    """
    Pure computation pipeline — does NOT touch the database.

    1. Build statistical summary of the historical series.
    2. Run all applicable models.
    3. Backtest each model with rolling-origin evaluation.
    4. Select best model (or use preferred_model when specified).
    5. Return ForecastBundle with predictions, statistics, and model comparison.
    """
    if len(values) < MIN_TRAINING_POINTS:
        return None

    stat = build_statistical_summary(years, values)
    window = min(5, max(3, len(values) // 4))
    candidates: List[Tuple[ModelResult, Optional[Dict]]] = []
    trend_dir: str = stat["trend_direction"]

    model_specs: List[Tuple[Callable, Dict]] = [
        (linear_trend_forecast, {}),
        (moving_average_forecast, {"window": window}),
        (weighted_moving_average_forecast, {"window": window}),
        (exp_smoothing_forecast, {}),
    ]
    if len(values) >= MIN_HOLT_POINTS:
        model_specs.append((holt_linear_forecast, {}))

    for fn, kwargs in model_specs:
        try:
            out = fn(values, years, horizon, **kwargs)
            if isinstance(out, tuple):
                model_res, td = out
                trend_dir = td
            else:
                model_res = out
            if model_res is None:
                continue
            bt = backtest_model(values, years, fn, test_points=5, **kwargs)
            if bt:
                model_res.rmse = bt["rmse"]
                model_res.mae = bt["mae"]
            candidates.append((model_res, bt))
        except Exception:
            continue

    if not candidates:
        return None

    if preferred_model != "auto":
        match = next((m for m, _ in candidates if m.name.startswith(preferred_model)), None)
        best = match if match else select_best_model(candidates)
    else:
        best = select_best_model(candidates)

    model_comparison = [
        {
            "model": m.name,
            "confidence_score": m.confidence_score,
            "rmse": m.rmse,
            "mae": m.mae,
            "selected": m.name == best.name,
        }
        for m, _ in candidates
    ]

    return ForecastBundle(
        best=best,
        trend_direction=trend_dir,
        anomaly_years=stat["anomaly_years"],
        statistical_summary=stat,
        model_comparison=model_comparison,
    )


# ─── DB-backed run ─────────────────────────────────────────────────────────────

def run_forecast(
    db: Session,
    country_code: str,
    indicator_code: str,
    horizon: int,
    model_name: str = "auto",
) -> Optional[ForecastResult]:
    """
    Full forecasting pipeline with database persistence.
    Loads observations from DB → sanitizes → runs compute_forecast →
    stores ForecastRun + ForecastPoints → returns ForecastResult.
    """
    country, indicator, series = prepare_series(db, country_code, indicator_code)
    if not series or len(series) < MIN_TRAINING_POINTS:
        return None

    raw_years = [row.year for row in series if row.value is not None]
    raw_values = [row.value for row in series if row.value is not None]
    years, values = sanitize_training_series(raw_years, raw_values)
    if len(values) < MIN_TRAINING_POINTS:
        return None

    bundle = compute_forecast(values, years, horizon, preferred_model=model_name)
    if bundle is None:
        return None

    best = bundle.best
    metrics_dict = {
        "model": best.name,
        "confidence_score": best.confidence_score,
        "rmse": best.rmse,
        "mae": best.mae,
        "trend_direction": bundle.trend_direction,
        "anomaly_years": bundle.anomaly_years,
        "statistical_summary": bundle.statistical_summary,
        "model_comparison": bundle.model_comparison,
    }

    run = ForecastRun(
        country_id=country.id,
        target_indicator_id=indicator.id,
        model_name=best.name,
        horizon_years=horizon,
        assumptions=best.assumptions,
        metrics=json.dumps(metrics_dict, ensure_ascii=False),
    )
    db.add(run)
    db.flush()

    points = [
        ForecastPoint(
            run_id=run.id,
            year=y,
            value=float(v),
            lower=float(lo),
            upper=float(hi),
        )
        for y, v, lo, hi in zip(best.future_years, best.predictions, best.lower, best.upper)
    ]
    db.add_all(points)
    db.commit()
    return ForecastResult(run=run, points=points, bundle=bundle)


# ─── Backward-compatibility aliases ───────────────────────────────────────────
# The API layer and tests imported these names; keep them callable.

def linear_forecast(values, years, horizon):
    """Legacy wrapper — returns (future_years, predictions, residual_std)."""
    result, _ = linear_trend_forecast(list(values), list(years), horizon)
    # Recover approximate std from the half-width of the first interval
    std = 0.0
    if result.upper and result.lower and result.upper[0] != result.lower[0]:
        t_val = _t_crit(len(years) - 2)
        if t_val > 0:
            std = (result.upper[0] - result.lower[0]) / (2.0 * t_val)
    return result.future_years, result.predictions, std


def backtest_linear(values, years, test_points=5):
    """Legacy wrapper — rolling-origin backtest for the linear trend model."""
    return backtest_model(list(values), list(years), linear_trend_forecast, test_points)
