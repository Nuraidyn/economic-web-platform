from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.v1.params import CountryCodeParam, IndicatorCodeParam
from app.db import get_db
from app.deps import require_agreement
from app.models import Country, Indicator
from app.models_forecast import ForecastPoint, ForecastRun
from app.schemas import ForecastPointSchema, ForecastRequest, ForecastResponse, ForecastSeries
from app.services.forecasting import backtest_linear, linear_forecast, run_forecast, sanitize_training_series
from app.services.world_bank import fetch_indicator_series

router = APIRouter(tags=["forecast"])


@router.post("/forecast", response_model=ForecastResponse)
def create_forecast(
    country: CountryCodeParam,
    indicator: IndicatorCodeParam,
    horizon_years: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    _: dict = Depends(require_agreement),
):
    result = run_forecast(db, country, indicator, horizon_years)
    if result:
        return ForecastResponse.from_run(result.run, result.points, country, indicator)

    try:
        series = fetch_indicator_series(country.upper(), indicator)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    years = [row["year"] for row in series]
    values = [row["value"] for row in series]
    years, values = sanitize_training_series(years, values)
    if len(values) < 8:
        raise HTTPException(status_code=400, detail="Not enough data to forecast")

    future_years, predictions, std = linear_forecast(values, years, horizon_years)
    backtest = backtest_linear(values, years, test_points=5) or {}
    metrics = f"residual_std={std:.4f}"
    if backtest:
        metrics = f"{metrics}; backtest_points={backtest.get('points')}; mae={backtest.get('mae'):.4f}; rmse={backtest.get('rmse'):.4f}"
    points = [
        ForecastPointSchema(
            year=year,
            value=float(value),
            lower=float(value - 1.96 * std),
            upper=float(value + 1.96 * std),
        )
        for year, value in zip(future_years, predictions)
    ]

    return ForecastResponse(
        country=country.upper(),
        indicator=indicator,
        model_name="linear_trend",
        horizon_years=horizon_years,
        assumptions=(
            "Linear trend on recent historical values (up to last 25 years); "
            "training values winsorized at 5th/95th percentile; residual std used for intervals."
        ),
        metrics=metrics,
        points=points,
    )


@router.get("/forecast/latest", response_model=ForecastResponse)
def latest_forecast(
    country: CountryCodeParam,
    indicator: IndicatorCodeParam,
    db: Session = Depends(get_db),
    _: dict = Depends(require_agreement),
):
    country_row = db.query(Country).filter(Country.code == country.upper()).first()
    indicator_row = db.query(Indicator).filter(Indicator.code == indicator).first()
    if not country_row or not indicator_row:
        raise HTTPException(status_code=404, detail="Unknown country or indicator")
    run = (
        db.query(ForecastRun)
        .filter(ForecastRun.country_id == country_row.id)
        .filter(ForecastRun.target_indicator_id == indicator_row.id)
        .order_by(ForecastRun.id.desc())
        .first()
    )
    if not run:
        raise HTTPException(status_code=404, detail="No forecast available")
    points = (
        db.query(ForecastPoint)
        .filter(ForecastPoint.run_id == run.id)
        .order_by(ForecastPoint.year)
        .all()
    )
    return ForecastResponse.from_run(run, points, country_row.code, indicator_row.code)
