import logging
import time

from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.models import Country, Indicator, Observation
from app.models_ingestion import IngestionRun
from app.services.world_bank import fetch_indicator_series

logger = logging.getLogger(__name__)

WORLD_BANK_SOURCE = "world_bank"


def get_or_create_country(db: Session, code: str):
    country = db.query(Country).filter(Country.code == code.upper()).first()
    if country:
        return country
    country = Country(code=code.upper(), name=code.upper())
    db.add(country)
    db.flush()
    return country


def get_or_create_indicator(db: Session, code: str):
    indicator = db.query(Indicator).filter(Indicator.code == code).first()
    if indicator:
        return indicator
    indicator = Indicator(code=code, name=code, source=WORLD_BANK_SOURCE)
    db.add(indicator)
    db.flush()
    return indicator


def calculate_expected(series):
    if not series:
        return 0
    years = [row["year"] for row in series]
    return max(years) - min(years) + 1


def _load_existing_years(db: Session, country_id: int, indicator_id: int) -> set[int]:
    """One query: fetch all years already stored for this country+indicator."""
    rows = (
        db.query(Observation.year)
        .filter(
            Observation.country_id == country_id,
            Observation.indicator_id == indicator_id,
        )
        .all()
    )
    return {r.year for r in rows}


def ingest_indicator(db: Session, country_code: str, indicator_code: str):
    t_start = time.perf_counter()

    run = IngestionRun(
        source=WORLD_BANK_SOURCE,
        country_code=country_code.upper(),
        indicator_code=indicator_code,
        status="started",
    )
    db.add(run)
    db.flush()

    try:
        series = fetch_indicator_series(country_code, indicator_code)
        country = get_or_create_country(db, country_code)
        indicator = get_or_create_indicator(db, indicator_code)

        rows_in_input = len(series)

        # --- batch dedup: 1 query instead of N --------------------------
        existing_years = _load_existing_years(db, country.id, indicator.id)
        rows_existing = len(existing_years)

        new_observations = [
            Observation(
                country_id=country.id,
                indicator_id=indicator.id,
                year=entry["year"],
                value=entry["value"],
                source=WORLD_BANK_SOURCE,
            )
            for entry in series
            if entry["year"] not in existing_years
        ]
        rows_inserted = len(new_observations)

        if new_observations:
            db.add_all(new_observations)
        # ----------------------------------------------------------------

        expected = calculate_expected(series)
        missing = max(expected - rows_in_input, 0)

        elapsed_ms = (time.perf_counter() - t_start) * 1000
        logger.info(
            "ingest_indicator country=%s indicator=%s "
            "rows_in_input=%d rows_existing=%d rows_inserted=%d elapsed_ms=%.1f",
            country_code.upper(), indicator_code,
            rows_in_input, rows_existing, rows_inserted, elapsed_ms,
        )

        run.status = "completed"
        run.inserted = rows_inserted
        run.total = rows_in_input
        run.expected = expected
        run.missing = missing
        run.finished_at = func.now()
        db.commit()

        return {
            "inserted": rows_inserted,
            "total": rows_in_input,
            "expected": expected,
            "missing": missing,
            "run_id": run.id,
        }

    except Exception as exc:
        run.status = "failed"
        run.error = str(exc)
        run.finished_at = func.now()
        db.commit()
        raise


def persist_observations(db: Session, country_code: str, indicator_code: str, series: list) -> int:
    """Write-through cache: persist an already-fetched series without creating an IngestionRun."""
    if not series:
        return 0
    try:
        country = get_or_create_country(db, country_code)
        indicator = get_or_create_indicator(db, indicator_code)
        existing_years = _load_existing_years(db, country.id, indicator.id)
        new_obs = [
            Observation(
                country_id=country.id,
                indicator_id=indicator.id,
                year=entry["year"],
                value=entry["value"],
                source=WORLD_BANK_SOURCE,
            )
            for entry in series
            if entry["year"] not in existing_years
        ]
        if new_obs:
            db.add_all(new_obs)
            db.commit()
            logger.debug(
                "persist_observations country=%s indicator=%s inserted=%d",
                country_code, indicator_code, len(new_obs),
            )
        return len(new_obs)
    except Exception as exc:
        db.rollback()
        logger.warning("persist_observations failed %s/%s: %s", country_code, indicator_code, exc)
        return 0
