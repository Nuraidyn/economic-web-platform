from math import sqrt

from sqlalchemy.orm import Session

from app.models import Country, Indicator, Observation


def compute_correlation(values):
    if len(values) < 3:
        return None
    mean_a = sum(a for a, _ in values) / len(values)
    mean_b = sum(b for _, b in values) / len(values)
    numerator = 0
    denom_a = 0
    denom_b = 0
    for a, b in values:
        diff_a = a - mean_a
        diff_b = b - mean_b
        numerator += diff_a * diff_b
        denom_a += diff_a * diff_a
        denom_b += diff_b * diff_b
    denom = sqrt(denom_a * denom_b)
    if denom == 0:
        return None
    return numerator / denom


def correlation_for_country(
    db: Session,
    country_code: str,
    indicator_a: str,
    indicator_b: str,
    start_year: int | None = None,
    end_year: int | None = None,
):
    country = db.query(Country).filter(Country.code == country_code.upper()).first()
    ind_a = db.query(Indicator).filter(Indicator.code == indicator_a).first()
    ind_b = db.query(Indicator).filter(Indicator.code == indicator_b).first()
    if not country or not ind_a or not ind_b:
        return None
    query = (
        db.query(Observation)
        .filter(Observation.country_id == country.id)
        .filter(Observation.indicator_id.in_([ind_a.id, ind_b.id]))
    )
    if start_year is not None:
        query = query.filter(Observation.year >= start_year)
    if end_year is not None:
        query = query.filter(Observation.year <= end_year)
    observations = query.order_by(Observation.year).all()
    by_indicator = {ind_a.id: {}, ind_b.id: {}}
    for row in observations:
        if row.value is None:
            continue
        by_indicator[row.indicator_id][row.year] = row.value
    overlap = []
    for year, value in by_indicator[ind_a.id].items():
        if year in by_indicator[ind_b.id]:
            overlap.append((value, by_indicator[ind_b.id][year]))
    correlation = compute_correlation(overlap)
    return {
        "country": country.code,
        "indicator_a": ind_a.code,
        "indicator_b": ind_b.code,
        "points": len(overlap),
        "correlation": correlation,
    }
