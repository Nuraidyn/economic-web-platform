"""
Forecasting service — supports three models:
  linear     : OLS linear trend (fast, interpretable)
  arima      : ARIMA(1,1,1) via statsmodels (captures autocorrelation)
  monte_carlo: drift-volatility simulation (probabilistic fan chart)
"""
from __future__ import annotations

import logging
import warnings
from dataclasses import dataclass
from typing import List, Literal, Optional, Tuple

import numpy as np
from sqlalchemy.orm import Session

from app.models import Country, Indicator, Observation
from app.models_forecast import ForecastPoint, ForecastRun

logger = logging.getLogger(__name__)

ModelName = Literal["linear", "arima", "monte_carlo"]

MAX_TRAINING_POINTS = 25
MIN_TRAINING_POINTS = 8
MONTE_CARLO_SIMULATIONS = 500
MONTE_CARLO_SAMPLE_PATHS = 10  # paths returned for visualisation


@dataclass
class ForecastResult:
    run: ForecastRun
    points: List[ForecastPoint]
    simulation_paths: Optional[List[List[float]]] = None  # monte_carlo only


# ── Data loading & cleaning ────────────────────────────────────────────────────

def prepare_series(
    db: Session, country_code: str, indicator_code: str
) -> Tuple[Optional[Country], Optional[Indicator], list]:
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


def sanitize_training_series(
    years: list, values: list, max_points: int = MAX_TRAINING_POINTS
) -> Tuple[list, list]:
    """
    Prepare model input: keep recent points, winsorize outliers.
    Returns (years, values) as plain Python lists.
    """
    paired = sorted(
        [(int(year), float(value)) for year, value in zip(years, values) if value is not None],
        key=lambda item: item[0],
    )
    if len(paired) > max_points:
        paired = paired[-max_points:]
    if not paired:
        return [], []

    y = np.array([v for _, v in paired], dtype=float)
    if len(y) >= MIN_TRAINING_POINTS:
        lower = float(np.percentile(y, 5))
        upper = float(np.percentile(y, 95))
        if lower <= upper:
            y = np.clip(y, lower, upper)

    x = [yr for yr, _ in paired]
    return x, y.tolist()


# ── Linear regression ──────────────────────────────────────────────────────────

def linear_forecast(
    values: list, years: list, horizon: int
) -> Tuple[list, list, float]:
    """OLS trend: returns (future_years, predictions, residual_std)."""
    x = np.array(years, dtype=float)
    y = np.array(values, dtype=float)
    coeff = np.polyfit(x, y, deg=1)
    slope, intercept = coeff[0], coeff[1]
    future_years = list(range(years[-1] + 1, years[-1] + horizon + 1))
    predictions = [float(slope * yr + intercept) for yr in future_years]
    residuals = y - (slope * x + intercept)
    std = float(np.std(residuals)) if len(residuals) > 1 else 0.0
    return future_years, predictions, std


def backtest_linear(values: list, years: list, test_points: int = 5) -> Optional[dict]:
    """Rolling-origin backtest for the linear model. Returns MAE/RMSE or None."""
    if len(values) < 10:
        return None
    n = len(values)
    k = max(1, min(int(test_points), n - 5))
    errors = []
    for idx in range(n - k, n):
        train_x = np.array(years[:idx], dtype=float)
        train_y = np.array(values[:idx], dtype=float)
        if len(train_y) < 5:
            continue
        slope, intercept = np.polyfit(train_x, train_y, deg=1)
        pred = float(slope * years[idx] + intercept)
        errors.append(float(values[idx]) - pred)
    if not errors:
        return None
    abs_errors = np.abs(errors)
    return {
        "points": len(errors),
        "mae": float(np.mean(abs_errors)),
        "rmse": float(np.sqrt(np.mean(np.square(errors)))),
    }


# ── ARIMA ──────────────────────────────────────────────────────────────────────

def arima_forecast(
    values: list, years: list, horizon: int
) -> Tuple[list, list, list, list, str]:
    """
    ARIMA(1,1,1) forecast with 95% confidence intervals.
    Falls back to ARIMA(0,1,0) (random walk) on fit failure.
    Returns (future_years, mean, lower, upper, assumptions).
    """
    from statsmodels.tsa.arima.model import ARIMA  # local import — heavy dependency

    y = np.array(values, dtype=float)
    future_years = list(range(years[-1] + 1, years[-1] + horizon + 1))
    order = (1, 1, 1)
    assumptions = "ARIMA(1,1,1) with 95% confidence intervals from forecast standard errors."

    for attempt_order in [(1, 1, 1), (1, 1, 0), (0, 1, 1), (0, 1, 0)]:
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                fit = ARIMA(y, order=attempt_order).fit()
            fc = fit.get_forecast(steps=horizon)
            mean = fc.predicted_mean.tolist()
            ci = fc.conf_int(alpha=0.05)
            lower = ci.iloc[:, 0].tolist()
            upper = ci.iloc[:, 1].tolist()
            order = attempt_order
            assumptions = (
                f"ARIMA{attempt_order} fitted on {len(y)} observations; "
                "95% confidence intervals from forecast standard errors."
            )
            return future_years, mean, lower, upper, assumptions
        except Exception as exc:
            logger.debug("ARIMA%s failed: %s", attempt_order, exc)
            continue

    # Final fallback: treat as linear
    logger.warning("All ARIMA orders failed — falling back to linear trend.")
    fut, preds, std = linear_forecast(values, years, horizon)
    lower = [v - 1.96 * std for v in preds]
    upper = [v + 1.96 * std for v in preds]
    return fut, preds, lower, upper, "ARIMA unavailable — linear trend used as fallback."


# ── Monte Carlo ────────────────────────────────────────────────────────────────

def monte_carlo_forecast(
    values: list,
    years: list,
    horizon: int,
    n_simulations: int = MONTE_CARLO_SIMULATIONS,
    n_sample_paths: int = MONTE_CARLO_SAMPLE_PATHS,
) -> Tuple[list, list, list, list, List[List[float]], str]:
    """
    Drift-volatility Monte Carlo simulation.

    Models each step as: v[t+1] = v[t] * (1 + N(mu, sigma))
    where mu/sigma are estimated from historical year-over-year relative changes.

    Returns (future_years, mean, lower_5pct, upper_95pct, sample_paths, assumptions).
    """
    y = np.array(values, dtype=float)
    future_years = list(range(years[-1] + 1, years[-1] + horizon + 1))

    if len(y) < 2:
        # Not enough for drift estimation — use zero drift
        mu, sigma = 0.0, 0.01
    else:
        # Relative year-over-year changes; guard against zero denominator
        denom = np.where(np.abs(y[:-1]) < 1e-10, 1e-10, y[:-1])
        returns = np.diff(y) / np.abs(denom)
        # Winsorize extreme shocks at 2.5/97.5 percentile
        lo, hi = np.percentile(returns, 2.5), np.percentile(returns, 97.5)
        returns = np.clip(returns, lo, hi)
        mu = float(np.mean(returns))
        sigma = float(np.std(returns)) if len(returns) > 1 else 0.01

    # Run simulations — fully vectorised
    rng = np.random.default_rng()
    shocks = rng.normal(mu, sigma, size=(n_simulations, horizon))  # (N, H)
    growth = 1.0 + shocks  # (N, H)

    last_value = float(y[-1])
    # Cumprod along horizon axis, then scale by last observed value
    paths = last_value * np.cumprod(growth, axis=1)  # (N, H)

    mean_path = np.mean(paths, axis=0).tolist()
    lower_path = np.percentile(paths, 5, axis=0).tolist()
    upper_path = np.percentile(paths, 95, axis=0).tolist()

    # Return a limited number of sample simulation paths for fan-chart rendering
    idx = rng.choice(n_simulations, size=min(n_sample_paths, n_simulations), replace=False)
    sample_paths = paths[idx].tolist()

    assumptions = (
        f"Monte Carlo simulation: {n_simulations} paths, "
        f"drift μ={mu:.4f}, volatility σ={sigma:.4f} estimated from "
        f"{len(y) - 1} historical YoY relative changes; "
        "shocks winsorized at 2.5/97.5 pct; "
        "confidence band = 5th/95th percentile across simulations."
    )
    return future_years, mean_path, lower_path, upper_path, sample_paths, assumptions


# ── Unified forecast entry point ────────────────────────────────────────────────

def run_forecast(
    db: Session,
    country_code: str,
    indicator_code: str,
    horizon: int,
    model_name: ModelName = "linear",
) -> Optional[ForecastResult]:
    """
    Load historical data, run the selected model, persist and return ForecastResult.
    Returns None if there is not enough data.
    """
    country, indicator, series = prepare_series(db, country_code, indicator_code)
    if not series or len(series) < MIN_TRAINING_POINTS:
        return None

    values = [row.value for row in series if row.value is not None]
    years = [row.year for row in series if row.value is not None]
    years, values = sanitize_training_series(years, values)
    if len(values) < MIN_TRAINING_POINTS:
        return None

    simulation_paths: Optional[List[List[float]]] = None

    if model_name == "arima":
        future_years, predictions, lower_ci, upper_ci, assumptions = arima_forecast(
            values, years, horizon
        )
        backtest = backtest_linear(values, years, test_points=5) or {}
        std = float(np.mean(np.array(upper_ci) - np.array(lower_ci)) / (2 * 1.96))
        metrics = f"model=ARIMA; forecast_std≈{std:.4f}"

    elif model_name == "monte_carlo":
        future_years, predictions, lower_ci, upper_ci, simulation_paths, assumptions = (
            monte_carlo_forecast(values, years, horizon)
        )
        spread = float(np.mean(np.array(upper_ci) - np.array(lower_ci)))
        metrics = f"model=monte_carlo; mean_90pct_spread={spread:.4f}"

    else:  # linear (default)
        future_years, predictions, std = linear_forecast(values, years, horizon)
        backtest = backtest_linear(values, years, test_points=5) or {}
        lower_ci = [v - 1.96 * std for v in predictions]
        upper_ci = [v + 1.96 * std for v in predictions]
        metrics = f"model=linear; residual_std={std:.4f}"
        if backtest:
            metrics += (
                f"; backtest_points={backtest.get('points')}"
                f"; mae={backtest.get('mae'):.4f}"
                f"; rmse={backtest.get('rmse'):.4f}"
            )
        is_constant = float(np.std(values)) == 0.0
        assumptions = (
            "Linear OLS trend on recent historical values (up to last 25 years); "
            "training values winsorized at 5th/95th percentile; "
            "CI = ±1.96 × residual_std."
        )
        if is_constant:
            assumptions += (
                " WARNING: series is constant — forecast is a flat line "
                "with zero-width confidence interval."
            )

    run = ForecastRun(
        country_id=country.id,
        target_indicator_id=indicator.id,
        model_name=model_name,
        horizon_years=horizon,
        assumptions=assumptions,
        metrics=metrics,
    )
    db.add(run)
    db.flush()

    points = [
        ForecastPoint(
            run_id=run.id,
            year=yr,
            value=float(val),
            lower=float(lo),
            upper=float(hi),
        )
        for yr, val, lo, hi in zip(future_years, predictions, lower_ci, upper_ci)
    ]
    db.add_all(points)
    db.commit()
    return ForecastResult(run=run, points=points, simulation_paths=simulation_paths)
