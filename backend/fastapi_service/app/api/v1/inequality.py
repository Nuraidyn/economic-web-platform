from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.v1.params import CountryCodeParam, OptionalYearParam, YearParam
from app.db import get_db
from app.deps import require_agreement
from app.models import Country, Indicator, Observation
from app.schemas import GiniRankingRow, GiniTrendMeta, GiniTrendPoint, GiniTrendResponse
from app.services.world_bank import fetch_indicator_series

router = APIRouter(tags=["inequality"])

GINI_INDICATOR = "SI.POV.GINI"


def _load_series(db: Session, country_code: str, indicator_code: str):
    """
    Prefer cached DB observations if present, otherwise fallback to World Bank.
    """
    country_row = db.query(Country).filter(Country.code == country_code.upper()).first()
    indicator_row = db.query(Indicator).filter(Indicator.code == indicator_code).first()
    if country_row and indicator_row:
        observations = (
            db.query(Observation)
            .filter(Observation.country_id == country_row.id)
            .filter(Observation.indicator_id == indicator_row.id)
            .order_by(Observation.year)
            .all()
        )
        if observations:
            return (
                [{"year": row.year, "value": row.value} for row in observations],
                GiniTrendMeta(source="cache_db", fetched_at=None),
            )

    series = fetch_indicator_series(country_code.upper(), indicator_code)
    return (
        [{"year": row["year"], "value": row["value"]} for row in series],
        GiniTrendMeta(source="world_bank_live", fetched_at=datetime.now(timezone.utc).isoformat()),
    )


@router.get("/inequality/gini/trend", response_model=GiniTrendResponse)
def gini_trend(
    country: CountryCodeParam,
    start_year: OptionalYearParam = None,
    end_year: OptionalYearParam = None,
    db: Session = Depends(get_db),
    _: dict = Depends(require_agreement),
):
    if start_year is not None and end_year is not None and start_year > end_year:
        raise HTTPException(status_code=400, detail="start_year must be <= end_year")

    try:
        series, meta = _load_series(db, country, GINI_INDICATOR)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if start_year is not None:
        series = [row for row in series if row["year"] >= start_year]
    if end_year is not None:
        series = [row for row in series if row["year"] <= end_year]

    points: list[GiniTrendPoint] = []
    prev_value = None
    for row in series:
        value = row["value"]
        yoy = None
        if isinstance(value, (int, float)) and isinstance(prev_value, (int, float)):
            yoy = float(value - prev_value)
        if isinstance(value, (int, float)):
            prev_value = value
        points.append(GiniTrendPoint(year=row["year"], value=value, yoy_change=yoy))

    return GiniTrendResponse(country=country.upper(), indicator=GINI_INDICATOR, points=points, meta=meta)


@router.get("/inequality/gini/ranking", response_model=list[GiniRankingRow])
def gini_ranking(
    year: YearParam,
    countries: str = Query(..., description="Comma-separated country codes, e.g. KZ,RU,US"),
    db: Session = Depends(get_db),
    _: dict = Depends(require_agreement),
):
    items = [item.strip() for item in countries.split(",") if item.strip()]
    if not items:
        raise HTTPException(status_code=400, detail="countries is required")
    if len(items) > 25:
        raise HTTPException(status_code=400, detail="Too many countries (max 25)")

    rows: list[GiniRankingRow] = []
    for code in items:
        try:
            series, _meta = _load_series(db, code, GINI_INDICATOR)
        except Exception:
            rows.append(GiniRankingRow(country=code.upper(), year=year, value=None))
            continue
        value = next((row["value"] for row in series if row["year"] == year), None)
        rows.append(GiniRankingRow(country=code.upper(), year=year, value=value))

    # Sort: known values first (descending inequality), then missing
    rows.sort(key=lambda item: (item.value is None, -(item.value or 0.0)))
    return rows
