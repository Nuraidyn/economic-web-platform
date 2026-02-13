from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import Query

MIN_SAFE_YEAR = 1990
MAX_SAFE_YEAR = datetime.now(timezone.utc).year

CountryCodeParam = Annotated[
    str,
    Query(
        ...,
        min_length=2,
        max_length=8,
        pattern=r"^[A-Za-z0-9-]{2,8}$",
        description="Country code (ISO2/ISO3 or platform code).",
    ),
]

IndicatorCodeParam = Annotated[
    str,
    Query(
        ...,
        min_length=3,
        max_length=64,
        pattern=r"^[A-Za-z0-9_.-]{3,64}$",
        description="Indicator code (World Bank-style, e.g. SI.POV.GINI).",
    ),
]

YearParam = Annotated[int, Query(..., ge=MIN_SAFE_YEAR, le=MAX_SAFE_YEAR)]
OptionalYearParam = Annotated[int | None, Query(ge=MIN_SAFE_YEAR, le=MAX_SAFE_YEAR)]
