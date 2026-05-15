import logging
import threading as _threading
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response
from sqlalchemy import and_, func
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


_seeding_indicators: set[str] = set()
_seeding_lock = _threading.Lock()


def _seed_indicator_bg(indicator_code: str) -> None:
    """Seed baseline countries for a specific indicator (deduplicated by indicator code)."""
    with _seeding_lock:
        if indicator_code in _seeding_indicators:
            return
        _seeding_indicators.add(indicator_code)
    try:
        from app.data.baseline import BASELINE_COUNTRIES
        from app.services.ingestion import ingest_indicator
        db = SessionLocal()
        try:
            for country in BASELINE_COUNTRIES:
                try:
                    country_row = db.query(Country).filter(Country.code == country).first()
                    indicator_row = db.query(Indicator).filter(Indicator.code == indicator_code).first()
                    if country_row and indicator_row:
                        count = (
                            db.query(Observation)
                            .filter(
                                Observation.country_id == country_row.id,
                                Observation.indicator_id == indicator_row.id,
                            )
                            .count()
                        )
                        if count > 0:
                            continue
                    ingest_indicator(db, country, indicator_code)
                except Exception as exc:
                    logger.warning("world_seed %s/%s: %s", country, indicator_code, exc)
        finally:
            db.close()
    finally:
        with _seeding_lock:
            _seeding_indicators.discard(indicator_code)


@router.get("/observations/world", response_model=dict[str, Any])
def get_world_snapshot(
    indicator: IndicatorCodeParam,
    background_tasks: BackgroundTasks,
    year: int | None = Query(None, ge=1960, le=2100),
    db: Session = Depends(get_db),
):
    """Return all DB-cached country values for a given indicator and year.
    When year is omitted, uses the most recent year with cached data.
    If no data exists, triggers a background seed of baseline countries."""
    indicator_row = db.query(Indicator).filter(Indicator.code == indicator).first()
    if not indicator_row:
        background_tasks.add_task(_seed_indicator_bg, indicator)
        return {"year": year or 0, "data": {}}

    if year is None:
        latest = (
            db.query(func.max(Observation.year))
            .filter(
                Observation.indicator_id == indicator_row.id,
                Observation.value.isnot(None),
            )
            .scalar()
        )
        if latest is None:
            background_tasks.add_task(_seed_indicator_bg, indicator)
            return {"year": 0, "data": {}}
        year = latest

    # For each country get the latest available year <= selected year.
    # This prevents countries from disappearing when they lack data for the
    # exact selected year but have data from an earlier year.
    latest_per_country = (
        db.query(
            Observation.country_id,
            func.max(Observation.year).label("max_year"),
        )
        .filter(
            Observation.indicator_id == indicator_row.id,
            Observation.year <= year,
            Observation.value.isnot(None),
        )
        .group_by(Observation.country_id)
        .subquery()
    )

    rows = (
        db.query(Observation, Country)
        .join(Country, Observation.country_id == Country.id)
        .join(
            latest_per_country,
            and_(
                Observation.country_id == latest_per_country.c.country_id,
                Observation.year == latest_per_country.c.max_year,
            ),
        )
        .filter(
            Observation.indicator_id == indicator_row.id,
            Observation.value.isnot(None),
        )
        .all()
    )
    return {
        "year": year,
        "data": {country.code: obs.value for obs, country in rows},
    }
