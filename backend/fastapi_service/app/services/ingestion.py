from sqlalchemy.orm import Session

from sqlalchemy.sql import func

from app.models import Country, Indicator, Observation
from app.models_ingestion import IngestionRun
from app.services.world_bank import fetch_indicator_series

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


def ingest_indicator(db: Session, country_code: str, indicator_code: str):
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
        new_rows = 0
        for entry in series:
            exists = (
                db.query(Observation)
                .filter(
                    Observation.country_id == country.id,
                    Observation.indicator_id == indicator.id,
                    Observation.year == entry["year"],
                )
                .first()
            )
            if exists:
                continue
            db.add(
                Observation(
                    country_id=country.id,
                    indicator_id=indicator.id,
                    year=entry["year"],
                    value=entry["value"],
                    source=WORLD_BANK_SOURCE,
                )
            )
            new_rows += 1
        expected = calculate_expected(series)
        missing = max(expected - len(series), 0)
        run.status = "completed"
        run.inserted = new_rows
        run.total = len(series)
        run.expected = expected
        run.missing = missing
        run.finished_at = func.now()
        db.commit()
        return {
            "inserted": new_rows,
            "total": len(series),
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
