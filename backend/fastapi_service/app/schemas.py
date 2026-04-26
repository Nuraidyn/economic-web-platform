from typing import Optional

from pydantic import BaseModel, Field


class CountryCreate(BaseModel):
    code: str
    name: str


class CountryRead(BaseModel):
    id: int
    code: str
    name: str

    class Config:
        from_attributes = True


class IndicatorCreate(BaseModel):
    code: str
    name: str
    source: str
    unit: Optional[str] = None
    description: Optional[str] = None


class IndicatorRead(BaseModel):
    id: int
    code: str
    name: str
    source: str
    unit: Optional[str] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True


class ObservationRead(BaseModel):
    country: str
    indicator: str
    year: int
    value: Optional[float]


class IngestionRequest(BaseModel):
    country: str
    indicator: str
    start_year: Optional[int] = None
    end_year: Optional[int] = None


class IngestionRunRead(BaseModel):
    id: int
    source: str
    country_code: str
    indicator_code: str
    status: str
    inserted: int
    total: int
    expected: int
    missing: int
    error: Optional[str] = None

    class Config:
        from_attributes = True


class LorenzPoint(BaseModel):
    x: float
    y: float


class LorenzResponse(BaseModel):
    country: str
    year: int
    points: list[LorenzPoint]
    missing: list[str]


class GiniResponse(BaseModel):
    country: str
    year: int
    gini: float


class CorrelationResponse(BaseModel):
    country: str
    indicator_a: str
    indicator_b: str
    points: int
    correlation: float | None = None


class ForecastPointSchema(BaseModel):
    year: int
    value: float
    lower: float | None = None
    upper: float | None = None


class ForecastRequest(BaseModel):
    country: str
    indicator: str
    horizon_years: int = 5


class ForecastSeries(BaseModel):
    points: list[ForecastPointSchema]


class ForecastResponse(BaseModel):
    country: str
    indicator: str
    model_name: str
    horizon_years: int
    assumptions: str | None = None
    metrics: str | None = None
    points: list[ForecastPointSchema]

    @classmethod
    def from_run(cls, run, points, country, indicator):
        return cls(
            country=country,
            indicator=indicator,
            model_name=run.model_name,
            horizon_years=run.horizon_years,
            assumptions=run.assumptions,
            metrics=run.metrics,
            points=[
                ForecastPointSchema(
                    year=item.year,
                    value=item.value,
                    lower=item.lower,
                    upper=item.upper,
                )
                for item in points
            ],
        )


class GiniTrendPoint(BaseModel):
    year: int
    value: float | None = None
    yoy_change: float | None = None


class GiniTrendMeta(BaseModel):
    source: str
    fetched_at: str | None = None


class GiniTrendResponse(BaseModel):
    country: str
    indicator: str
    points: list[GiniTrendPoint]
    meta: GiniTrendMeta


class GiniRankingRow(BaseModel):
    country: str
    year: int
    value: float | None = None


class ChartExplainPoint(BaseModel):
    year: int
    value: float | None = None


class ChartExplainSeries(BaseModel):
    country: str
    data: list[ChartExplainPoint]


class ChartExplainDataset(BaseModel):
    indicator: str
    indicator_label: str | None = None
    series: list[ChartExplainSeries]


class ChartExplainRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    datasets: list[ChartExplainDataset]
    language: str | None = None
    start_year: int | None = None
    end_year: int | None = None


class ChartExplainResponse(BaseModel):
    answer: str
    provider: str
    model: str | None = None
    warning: str | None = None


# ── Income Insights ───────────────────────────────────────────────────────────

class IncomeInsightsRequest(BaseModel):
    age: int = Field(..., ge=16, le=100)
    country: str = Field(..., min_length=1, max_length=100)
    profession: str = Field(..., min_length=1, max_length=200)
    experience_years: int = Field(..., ge=0, le=60)
    monthly_income: float = Field(..., ge=0)
    monthly_expenses: float = Field(..., ge=0)
    yearly_growth_percent: float = Field(default=0.0, ge=0, le=100)
    currency: str = Field(default="USD", min_length=1, max_length=10)
    comparison_countries: list[str] = Field(default_factory=list, max_length=10)
    period_years: int = Field(default=1, ge=1, le=5)
    inflation_adjusted: bool = Field(default=False)


class PotentialCountry(BaseModel):
    country: str
    reason: str
    estimated_income_range: str


class IncomeInsightsResponse(BaseModel):
    summary: str
    income_benchmark: list[str]
    action_plan: dict[str, list[str]]
    potential_countries: list[PotentialCountry]
    disclaimer: str
    provider: str
