import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.v1.params import CountryCodeParam, IndicatorCodeParam
from app.db import get_db
from app.deps import require_agreement
from app.models import Country, Indicator
from app.models_forecast import ForecastPoint, ForecastRun
from app.schemas import ForecastPointSchema, ForecastRequest, ForecastResponse, ForecastSeries
from app.services.forecasting import (
    backtest_linear,
    compute_forecast,
    linear_forecast,
    run_forecast,
    sanitize_training_series,
)
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
    # Primary path: use observations already ingested into the database.
    result = run_forecast(db, country, indicator, horizon_years)
    if result:
        return ForecastResponse.from_run(
            result.run, result.points, country, indicator, bundle=result.bundle
        )

    # Fallback: fetch live series from the World Bank API.
    try:
        series = fetch_indicator_series(country.upper(), indicator)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    raw_years = [row["year"] for row in series]
    raw_values = [row["value"] for row in series]
    years, values = sanitize_training_series(raw_years, raw_values)
    if len(values) < 8:
        raise HTTPException(status_code=400, detail="Not enough data to forecast")

    bundle = compute_forecast(values, years, horizon_years)
    if bundle is None:
        raise HTTPException(status_code=400, detail="Not enough data to forecast")

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
    points_schema = [
        ForecastPointSchema(year=y, value=float(v), lower=float(lo), upper=float(hi))
        for y, v, lo, hi in zip(best.future_years, best.predictions, best.lower, best.upper)
    ]

    return ForecastResponse(
        country=country.upper(),
        indicator=indicator,
        model_name=best.name,
        horizon_years=horizon_years,
        assumptions=best.assumptions,
        metrics=json.dumps(metrics_dict, ensure_ascii=False),
        points=points_schema,
        confidence_score=best.confidence_score,
        trend_direction=bundle.trend_direction,
        anomaly_years=bundle.anomaly_years,
        statistical_summary=bundle.statistical_summary,
        model_comparison=bundle.model_comparison,
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
    # from_run will parse the JSON metrics field if the run was produced by the new engine.
    return ForecastResponse.from_run(run, points, country_row.code, indicator_row.code)
