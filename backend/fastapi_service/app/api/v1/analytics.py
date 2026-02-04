from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.v1.params import CountryCodeParam, IndicatorCodeParam, OptionalYearParam, YearParam
from app.db import get_db
from app.deps import require_agreement
from app.schemas import CorrelationResponse, GiniResponse, LorenzResponse
from app.services.analytics import get_lorenz_segments, get_or_create_lorenz_result
from app.services.correlation import correlation_for_country

router = APIRouter(tags=["analytics"])


@router.get("/lorenz", response_model=LorenzResponse)
def lorenz_curve(
    country: CountryCodeParam,
    year: YearParam,
    db: Session = Depends(get_db),
    _: dict = Depends(require_agreement),
):
    cached = get_or_create_lorenz_result(db, country, year)
    if cached:
        return LorenzResponse(
            country=cached["country"],
            year=cached["year"],
            points=cached["points"],
            missing=[],
        )
    data = get_lorenz_segments(db, country, year)
    if not data:
        raise HTTPException(status_code=404, detail="Country not found")
    return LorenzResponse(country=data["country"], year=year, points=[], missing=data["missing"])


@router.get("/gini", response_model=GiniResponse)
def gini_index(
    country: CountryCodeParam,
    year: YearParam,
    db: Session = Depends(get_db),
    _: dict = Depends(require_agreement),
):
    cached = get_or_create_lorenz_result(db, country, year)
    if not cached:
        raise HTTPException(status_code=404, detail="Gini not available for this year")
    return GiniResponse(country=cached["country"], year=year, gini=cached["gini"])


@router.get("/correlation", response_model=CorrelationResponse)
def correlation(
    country: CountryCodeParam,
    indicator_a: IndicatorCodeParam,
    indicator_b: IndicatorCodeParam,
    start_year: OptionalYearParam = None,
    end_year: OptionalYearParam = None,
    db: Session = Depends(get_db),
    _: dict = Depends(require_agreement),
):
    if start_year is not None and end_year is not None and start_year > end_year:
        raise HTTPException(status_code=400, detail="start_year must be <= end_year")
    result = correlation_for_country(db, country, indicator_a, indicator_b, start_year, end_year)
    if not result:
        raise HTTPException(status_code=404, detail="Correlation not available")
    return CorrelationResponse(**result)
