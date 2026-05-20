import json
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
    # ── Enhanced analytics fields (optional; backward-compatible) ─────────────
    confidence_score: float | None = None
    trend_direction: str | None = None
    anomaly_years: list[int] = Field(default_factory=list)
    statistical_summary: dict | None = None
    model_comparison: list[dict] = Field(default_factory=list)

    @classmethod
    def from_run(cls, run, points, country, indicator, bundle=None):
        """
        Build a ForecastResponse from ORM objects.
        When `bundle` is provided (fresh run), the rich analytics fields are
        populated directly.  For stored runs the metrics JSON is parsed instead.
        """
        base_points = [
            ForecastPointSchema(
                year=item.year,
                value=item.value,
                lower=item.lower,
                upper=item.upper,
            )
            for item in points
        ]

        confidence_score: float | None = None
        trend_direction: str | None = None
        anomaly_years: list[int] = []
        statistical_summary: dict | None = None
        model_comparison: list[dict] = []

        if bundle is not None:
            confidence_score = bundle.best.confidence_score
            trend_direction = bundle.trend_direction
            anomaly_years = bundle.anomaly_years
            statistical_summary = bundle.statistical_summary
            model_comparison = bundle.model_comparison
        elif run.metrics:
            try:
                md = json.loads(run.metrics)
                confidence_score = md.get("confidence_score")
                trend_direction = md.get("trend_direction")
                anomaly_years = md.get("anomaly_years") or []
                statistical_summary = md.get("statistical_summary")
                model_comparison = md.get("model_comparison") or []
            except (json.JSONDecodeError, TypeError, AttributeError):
                pass

        return cls(
            country=country,
            indicator=indicator,
            model_name=run.model_name,
            horizon_years=run.horizon_years,
            assumptions=run.assumptions,
            metrics=run.metrics,
            points=base_points,
            confidence_score=confidence_score,
            trend_direction=trend_direction,
            anomaly_years=anomaly_years,
            statistical_summary=statistical_summary,
            model_comparison=model_comparison,
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


# ── AI Mentor ─────────────────────────────────────────────────────────────────

class AIChatRequest(BaseModel):
    conversation_id: Optional[int] = None
    message: str = Field(..., min_length=1, max_length=4000)
    context_snapshot: Optional[dict] = None
    language: str = Field(default="en", max_length=5)


class AIExplainChartRequest(BaseModel):
    conversation_id: Optional[int] = None
    question: str = Field(..., min_length=1, max_length=2000)
    datasets: list[ChartExplainDataset]
    language: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    context_snapshot: Optional[dict] = None


class AISuggestNextRequest(BaseModel):
    conversation_id: Optional[int] = None
    context_snapshot: Optional[dict] = None
    language: str = Field(default="en", max_length=5)


class AIReportRequest(BaseModel):
    conversation_id: int
    context_snapshot: Optional[dict] = None
    language: str = Field(default="en", max_length=5)


class StructuredAIResponse(BaseModel):
    conversation_id: int
    message_id: int
    summary: str
    insights: list[str] = []
    limitations: str = ""
    suggested_next_steps: list[str] = []
    provider: str
    model: Optional[str] = None
    rag_chunks_used: list[str] = []


class AISuggestNextResponse(BaseModel):
    suggestions: list[str]


class AIReportResponse(BaseModel):
    report_markdown: str
    message_id: int
    conversation_id: int


class AIConversationRead(BaseModel):
    id: int
    title: str
    created_at: str
    updated_at: str
    message_count: int = 0

    class Config:
        from_attributes = True


class AIMessageRead(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    structured_response: Optional[dict] = None
    rag_chunks_used: Optional[list[str]] = None
    created_at: str

    class Config:
        from_attributes = True
