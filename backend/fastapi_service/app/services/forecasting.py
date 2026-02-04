from dataclasses import dataclass
from typing import List

import numpy as np
from sqlalchemy.orm import Session

from app.models import Country, Indicator, Observation
from app.models_forecast import ForecastPoint, ForecastRun


@dataclass
class ForecastResult:
    run: ForecastRun
    points: List[ForecastPoint]


def prepare_series(db: Session, country_code: str, indicator_code: str):
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


def linear_forecast(values, years, horizon):
    x = np.array(years)
    y = np.array(values)
    coeff = np.polyfit(x, y, deg=1)
    slope, intercept = coeff[0], coeff[1]
    future_years = list(range(years[-1] + 1, years[-1] + horizon + 1))
    predictions = [slope * year + intercept for year in future_years]
    residuals = y - (slope * x + intercept)
    std = float(np.std(residuals)) if len(residuals) > 1 else 0.0
    return future_years, predictions, std


def backtest_linear(values, years, test_points: int = 5):
    """
    Simple rolling-origin backtest for linear trend model.

    Fits on the prefix and predicts the next observed point.
    Returns MAE/RMSE on the last `test_points` observations.
    """
    if len(values) < 10:
        return None
    n = len(values)
    k = max(1, min(int(test_points), n - 5))
    errors = []
    for idx in range(n - k, n):
        train_x = np.array(years[:idx])
        train_y = np.array(values[:idx])
        if len(train_y) < 5:
            continue
        slope, intercept = np.polyfit(train_x, train_y, deg=1)
        pred = float(slope * years[idx] + intercept)
        actual = float(values[idx])
        errors.append(actual - pred)
    if not errors:
        return None
    abs_errors = [abs(e) for e in errors]
    mae = float(np.mean(abs_errors))
    rmse = float(np.sqrt(np.mean([e * e for e in errors])))
    return {"points": len(errors), "mae": mae, "rmse": rmse}


def run_forecast(
    db: Session,
    country_code: str,
    indicator_code: str,
    horizon: int,
    model_name: str = "linear_trend",
):
    country, indicator, series = prepare_series(db, country_code, indicator_code)
    if not series or len(series) < 8:
        return None
    values = [row.value for row in series if row.value is not None]
    years = [row.year for row in series if row.value is not None]
    if len(values) < 8:
        return None
    future_years, predictions, std = linear_forecast(values, years, horizon)
    backtest = backtest_linear(values, years, test_points=5) or {}
    metrics = f"residual_std={std:.4f}"
    if backtest:
        metrics = f"{metrics}; backtest_points={backtest.get('points')}; mae={backtest.get('mae'):.4f}; rmse={backtest.get('rmse'):.4f}"
    run = ForecastRun(
        country_id=country.id,
        target_indicator_id=indicator.id,
        model_name=model_name,
        horizon_years=horizon,
        assumptions="Linear trend on historical values; residual std used for intervals.",
        metrics=metrics,
    )
    db.add(run)
    db.flush()
    points = []
    for year, value in zip(future_years, predictions):
        points.append(
            ForecastPoint(
                run_id=run.id,
                year=year,
                value=float(value),
                lower=float(value - 1.96 * std),
                upper=float(value + 1.96 * std),
            )
        )
    db.add_all(points)
    db.commit()
    return ForecastResult(run=run, points=points)
