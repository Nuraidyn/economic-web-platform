from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Country, Indicator
from app.schemas import CountryRead, IndicatorRead

router = APIRouter(tags=["catalog"])


DEFAULT_COUNTRIES = [
    {"code": "KZ", "name": "Kazakhstan"},
    {"code": "RU", "name": "Russia"},
    {"code": "US", "name": "United States"},
    {"code": "CN", "name": "China"},
    {"code": "DE", "name": "Germany"},
    {"code": "JP", "name": "Japan"},
    {"code": "FR", "name": "France"},
    {"code": "IN", "name": "India"},
    {"code": "BR", "name": "Brazil"},
    {"code": "ZA", "name": "South Africa"},
    {"code": "AU", "name": "Australia"},
]


DEFAULT_INDICATORS = [
    {"code": "SI.POV.GINI", "name": "Gini Index", "source": "world_bank"},
    {"code": "NY.GDP.MKTP.CD", "name": "GDP (current US$)", "source": "world_bank"},
    {"code": "NY.GDP.PCAP.CD", "name": "GDP per capita (current US$)", "source": "world_bank"},
    {"code": "NY.GDP.PCAP.KD.ZG", "name": "GDP per capita growth (annual %)", "source": "world_bank"},
    {"code": "FP.CPI.TOTL.ZG", "name": "Inflation (annual %)", "source": "world_bank"},
    {"code": "SL.UEM.TOTL.ZS", "name": "Unemployment rate (%)", "source": "world_bank"},
    {"code": "SI.POV.DDAY", "name": "Poverty headcount ($2.15/day)", "source": "world_bank"},
    {"code": "NE.CON.GOVT.ZS", "name": "Government consumption (% of GDP)", "source": "world_bank"},
    {"code": "SI.DST.FRST.20", "name": "Income share lowest 20%", "source": "world_bank"},
    {"code": "SI.DST.05TH.20", "name": "Income share highest 20%", "source": "world_bank"},
]


@router.get("/countries", response_model=list[CountryRead])
def list_countries(db: Session = Depends(get_db)):
    rows = db.query(Country).order_by(Country.name).all()
    if rows:
        return rows
    return [CountryRead(id=index + 1, **row) for index, row in enumerate(DEFAULT_COUNTRIES)]


@router.get("/indicators", response_model=list[IndicatorRead])
def list_indicators(db: Session = Depends(get_db)):
    rows = db.query(Indicator).order_by(Indicator.code).all()
    if rows:
        return rows
    return [
        IndicatorRead(
            id=index + 1,
            code=row["code"],
            name=row["name"],
            source=row["source"],
            unit=None,
            description=None,
        )
        for index, row in enumerate(DEFAULT_INDICATORS)
    ]
