from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.schemas import CorrelationResponse, GiniResponse, LorenzResponse
from app.services.analytics import get_lorenz_segments, get_or_create_lorenz_result
from app.services.correlation import correlation_for_country

router = APIRouter(tags=["analytics"])


@router.get("/lorenz", response_model=LorenzResponse)
def lorenz_curve(
    country: str = Query(...),
    year: int = Query(..., ge=1960),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
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
    country: str = Query(...),
    year: int = Query(..., ge=1960),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    cached = get_or_create_lorenz_result(db, country, year)
    if not cached:
        raise HTTPException(status_code=404, detail="Gini not available for this year")
    return GiniResponse(country=cached["country"], year=year, gini=cached["gini"])


@router.get("/correlation", response_model=CorrelationResponse)
def correlation(
    country: str = Query(...),
    indicator_a: str = Query(...),
    indicator_b: str = Query(...),
    start_year: int | None = Query(None),
    end_year: int | None = Query(None),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = correlation_for_country(db, country, indicator_a, indicator_b, start_year, end_year)
    if not result:
        raise HTTPException(status_code=404, detail="Correlation not available")
    return CorrelationResponse(**result)
