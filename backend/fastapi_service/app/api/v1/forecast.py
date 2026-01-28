from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import require_agreement
from app.models import Country, Indicator
from app.models_forecast import ForecastPoint, ForecastRun
from app.schemas import ForecastRequest, ForecastResponse, ForecastSeries
from app.services.forecasting import run_forecast

router = APIRouter(tags=["forecast"])


@router.post("/forecast", response_model=ForecastResponse)
def create_forecast(
    country: str = Query(...),
    indicator: str = Query(...),
    horizon_years: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    _: dict = Depends(require_agreement),
):
    result = run_forecast(db, country, indicator, horizon_years)
    if not result:
        raise HTTPException(status_code=400, detail="Not enough data to forecast")
    return ForecastResponse.from_run(result.run, result.points, country, indicator)


@router.get("/forecast/latest", response_model=ForecastResponse)
def latest_forecast(
    country: str = Query(...),
    indicator: str = Query(...),
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
