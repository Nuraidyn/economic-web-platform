from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import Country, Indicator, Observation
from app.schemas import ObservationRead

router = APIRouter(tags=["observations"])


@router.get("/observations", response_model=list[ObservationRead])
def list_observations(
    country: str = Query(...),
    indicator: str = Query(...),
    start_year: int | None = Query(None),
    end_year: int | None = Query(None),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    country_row = db.query(Country).filter(Country.code == country.upper()).first()
    indicator_row = db.query(Indicator).filter(Indicator.code == indicator).first()
    if not country_row or not indicator_row:
        return []
    query = (
        db.query(Observation)
        .filter(Observation.country_id == country_row.id)
        .filter(Observation.indicator_id == indicator_row.id)
    )
    if start_year is not None:
        query = query.filter(Observation.year >= start_year)
    if end_year is not None:
        query = query.filter(Observation.year <= end_year)
    observations = query.order_by(Observation.year).all()
    return [
        ObservationRead(
            country=country_row.code,
            indicator=indicator_row.code,
            year=row.year,
            value=row.value,
        )
        for row in observations
    ]
