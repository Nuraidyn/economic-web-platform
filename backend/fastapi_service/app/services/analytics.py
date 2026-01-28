import json
from typing import Iterable

from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.models import Country, Indicator, Observation
from app.models_analytics import LorenzResult

LORENZ_INDICATORS = [
    ("SI.DST.FRST.20", 0.2),
    ("SI.DST.02ND.20", 0.2),
    ("SI.DST.03RD.20", 0.2),
    ("SI.DST.04TH.20", 0.2),
    ("SI.DST.05TH.20", 0.2),
]


def build_lorenz_points(shares: Iterable[float], populations: Iterable[float]):
    cumulative_population = 0.0
    cumulative_income = 0.0
    points = [{"x": 0.0, "y": 0.0}]
    for share, population in zip(shares, populations):
        cumulative_population = round(cumulative_population + population, 4)
        cumulative_income = round(cumulative_income + (share / 100), 4)
        points.append({"x": cumulative_population, "y": cumulative_income})
    return points


def compute_gini(points):
    area = 0.0
    for idx in range(1, len(points)):
        x1, y1 = points[idx - 1]["x"], points[idx - 1]["y"]
        x2, y2 = points[idx]["x"], points[idx]["y"]
        area += (y1 + y2) * (x2 - x1) / 2
    return max(0.0, min(1.0, 1 - 2 * area))


def get_lorenz_segments(db: Session, country_code: str, year: int):
    country = db.query(Country).filter(Country.code == country_code.upper()).first()
    if not country:
        return None
    indicator_codes = [code for code, _ in LORENZ_INDICATORS]
    indicators = {
        row.code: row for row in db.query(Indicator).filter(Indicator.code.in_(indicator_codes)).all()
    }
    missing = []
    shares = []
    populations = []
    for code, pop_share in LORENZ_INDICATORS:
        indicator = indicators.get(code)
        if not indicator:
            missing.append(code)
            continue
        obs = (
            db.query(Observation)
            .filter(
                Observation.country_id == country.id,
                Observation.indicator_id == indicator.id,
                Observation.year <= year,
            )
            .order_by(Observation.year.desc())
            .first()
        )
        if not obs or obs.value is None:
            missing.append(code)
            continue
        shares.append(obs.value)
        populations.append(pop_share)
    return {
        "country": country.code,
        "year": year,
        "shares": shares,
        "populations": populations,
        "missing": missing,
    }


def get_or_create_lorenz_result(db: Session, country_code: str, year: int):
    country = db.query(Country).filter(Country.code == country_code.upper()).first()
    if not country:
        return None
    cached = (
        db.query(LorenzResult)
        .filter(LorenzResult.country_id == country.id)
        .filter(LorenzResult.year == year)
        .first()
    )
    if cached:
        return {
            "country": country.code,
            "year": cached.year,
            "points": cached.points(),
            "gini": cached.gini,
        }
    segments = get_lorenz_segments(db, country_code, year)
    if not segments or segments["missing"]:
        return None
    points = build_lorenz_points(segments["shares"], segments["populations"])
    gini = compute_gini(points)
    result = LorenzResult(
        country_id=country.id,
        year=year,
        points_json=json.dumps(points),
        gini=gini,
        created_at=func.now(),
    )
    db.add(result)
    db.commit()
    return {"country": country.code, "year": year, "points": points, "gini": gini}
