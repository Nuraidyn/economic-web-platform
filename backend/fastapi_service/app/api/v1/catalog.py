from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Country, Indicator
from app.schemas import CountryRead, IndicatorRead

router = APIRouter(tags=["catalog"])


@router.get("/countries", response_model=list[CountryRead])
def list_countries(db: Session = Depends(get_db)):
    return db.query(Country).order_by(Country.name).all()


@router.get("/indicators", response_model=list[IndicatorRead])
def list_indicators(db: Session = Depends(get_db)):
    return db.query(Indicator).order_by(Indicator.code).all()
