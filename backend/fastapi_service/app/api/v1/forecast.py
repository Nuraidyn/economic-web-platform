from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.v1.params import CountryCodeParam, IndicatorCodeParam
from app.db import get_db
from app.deps import require_agreement
from app.models import Country, Indicator
from app.models_forecast import ForecastPoint, ForecastRun
from app.schemas import ForecastPointSchema, ForecastRequest, ForecastResponse, ForecastSeries
from app.services.forecasting import (
    MIN_TRAINING_POINTS,
    arima_forecast,
    backtest_linear,
    linear_forecast,
    monte_carlo_forecast,
    run_forecast,
    sanitize_training_series,
)
from app.services.world_bank import fetch_indicator_series

router = APIRouter(tags=["forecast"])

ModelParam = Literal["linear", "arima", "monte_carlo"]


@router.post("/forecast", response_model=ForecastResponse)
def create_forecast(
    country: CountryCodeParam,
    indicator: IndicatorCodeParam,
    horizon_years: int = Query(5, ge=1, le=20),
    model: ModelParam = Query("linear", description="Forecasting model to use"),
    db: Session = Depends(get_db),
    _: dict = Depends(require_agreement),
):
    """
    Generate a forecast for a country×indicator pair.

    **model** options:
    - `linear` — OLS linear trend (fast, stable baseline)
    - `arima` — ARIMA(1,1,1) time-series model (captures autocorrelation)
    - `monte_carlo` — probabilistic simulation with drift+volatility;
      response includes `simulation_paths` for fan-chart rendering.
    """
    result = run_forecast(db, country, indicator, horizon_years, model_name=model)
    if result:
        return ForecastResponse.from_run(
            result.run,
            result.points,
            country,
            indicator,
            simulation_paths=result.simulation_paths,
        )

    # DB had no data — fall back to live World Bank fetch
    try:
        series = fetch_indicator_series(country.upper(), indicator)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    raw_years = [row["year"] for row in series]
    raw_values = [row["value"] for row in series]
    years, values = sanitize_training_series(raw_years, raw_values)
    if len(values) < MIN_TRAINING_POINTS:
        raise HTTPException(status_code=400, detail="Not enough data to forecast.")

    simulation_paths: Optional[list] = None

    if model == "arima":
        future_years, predictions, lower_ci, upper_ci, assumptions = arima_forecast(
            values, years, horizon_years
        )
        metrics = "model=ARIMA (live fetch)"

    elif model == "monte_carlo":
        future_years, predictions, lower_ci, upper_ci, simulation_paths, assumptions = (
            monte_carlo_forecast(values, years, horizon_years)
        )
        metrics = "model=monte_carlo (live fetch)"

    else:  # linear
        future_years, predictions, std = linear_forecast(values, years, horizon_years)
        lower_ci = [v - 1.96 * std for v in predictions]
        upper_ci = [v + 1.96 * std for v in predictions]
        backtest = backtest_linear(values, years, test_points=5) or {}
        metrics = f"model=linear; residual_std={std:.4f}"
        if backtest:
            metrics += (
                f"; backtest_points={backtest.get('points')}"
                f"; mae={backtest.get('mae'):.4f}"
                f"; rmse={backtest.get('rmse'):.4f}"
            )
        assumptions = (
            "Linear OLS trend on recent historical values (up to last 25 years); "
            "training values winsorized at 5th/95th percentile; CI = ±1.96 × residual_std."
        )

    points = [
        ForecastPointSchema(
            year=yr,
            value=float(val),
            lower=float(lo),
            upper=float(hi),
        )
        for yr, val, lo, hi in zip(future_years, predictions, lower_ci, upper_ci)
    ]

    return ForecastResponse(
        country=country.upper(),
        indicator=indicator,
        model_name=model,
        horizon_years=horizon_years,
        assumptions=assumptions,
        metrics=metrics,
        points=points,
        simulation_paths=simulation_paths,
    )


@router.get("/forecast/latest", response_model=ForecastResponse)
def latest_forecast(
    country: CountryCodeParam,
    indicator: IndicatorCodeParam,
    db: Session = Depends(get_db),
    _: dict = Depends(require_agreement),
):
    """Return the most recently stored forecast run for a country×indicator pair."""
    country_row = db.query(Country).filter(Country.code == country.upper()).first()
    indicator_row = db.query(Indicator).filter(Indicator.code == indicator).first()
    if not country_row or not indicator_row:
        raise HTTPException(status_code=404, detail="Unknown country or indicator.")
    run = (
        db.query(ForecastRun)
        .filter(ForecastRun.country_id == country_row.id)
        .filter(ForecastRun.target_indicator_id == indicator_row.id)
        .order_by(ForecastRun.id.desc())
        .first()
    )
    if not run:
        raise HTTPException(status_code=404, detail="No forecast available.")
    points = (
        db.query(ForecastPoint)
        .filter(ForecastPoint.run_id == run.id)
        .order_by(ForecastPoint.year)
        .all()
    )
    return ForecastResponse.from_run(run, points, country_row.code, indicator_row.code)
