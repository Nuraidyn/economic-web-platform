import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.api.v1.params import CountryCodeParam, IndicatorCodeParam, LimitParam, OffsetParam, OptionalYearParam
from app.db import SessionLocal, get_db
from app.deps import require_agreement
from app.models import Country, Indicator, Observation
from app.schemas import ObservationRead
from app.services.world_bank import async_fetch_indicator_series

logger = logging.getLogger(__name__)
router = APIRouter(tags=["observations"])


def _bg_persist(country_code: str, indicator_code: str, series: list) -> None:
    """Background task: persist a live-fetched series to DB (write-through cache)."""
    from app.services.ingestion import persist_observations
    db = SessionLocal()
    try:
        persist_observations(db, country_code, indicator_code, series)
    except Exception as exc:
        logger.warning("bg_persist failed %s/%s: %s", country_code, indicator_code, exc)
    finally:
        db.close()


@router.get("/observations", response_model=list[ObservationRead])
async def list_observations(
    country: CountryCodeParam,
    indicator: IndicatorCodeParam,
    response: Response,
    background_tasks: BackgroundTasks,
    start_year: OptionalYearParam = None,
    end_year: OptionalYearParam = None,
    limit: LimitParam = 100,
    offset: OffsetParam = 0,
    db: Session = Depends(get_db),
    _: dict = Depends(require_agreement),
):
    if start_year is not None and end_year is not None and start_year > end_year:
        raise HTTPException(status_code=400, detail="start_year must be <= end_year")

    country_code = country.upper()
    indicator_code = indicator
    country_row = db.query(Country).filter(Country.code == country_code).first()
    indicator_row = db.query(Indicator).filter(Indicator.code == indicator_code).first()

    if country_row and indicator_row:
        query = (
            db.query(Observation)
            .filter(Observation.country_id == country_row.id)
            .filter(Observation.indicator_id == indicator_row.id)
        )
        if start_year is not None:
            query = query.filter(Observation.year >= start_year)
        if end_year is not None:
            query = query.filter(Observation.year <= end_year)

        total = query.count()
        observations = query.order_by(Observation.year).offset(offset).limit(limit).all()

        if observations:
            response.headers["X-Data-Source"] = "cache_db"
            response.headers["X-Total-Count"] = str(total)
            return [
                ObservationRead(
                    country=country_row.code,
                    indicator=indicator_row.code,
                    year=row.year,
                    value=row.value,
                )
                for row in observations
            ]

    try:
        series = await async_fetch_indicator_series(country_code, indicator_code)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    # Persist to DB in background so future requests are served from cache
    if series:
        background_tasks.add_task(_bg_persist, country_code, indicator_code, series)

    if start_year is not None:
        series = [row for row in series if row["year"] >= start_year]
    if end_year is not None:
        series = [row for row in series if row["year"] <= end_year]

    total = len(series)
    page = series[offset : offset + limit]

    response.headers["X-Data-Source"] = "world_bank_live"
    response.headers["X-Fetched-At"] = datetime.now(timezone.utc).isoformat()
    response.headers["X-Total-Count"] = str(total)
    if total == 0:
        response.headers["X-Data-Empty"] = "true"

    return [
        ObservationRead(
            country=country_code,
            indicator=indicator_code,
            year=row["year"],
            value=row["value"],
        )
        for row in page
    ]
