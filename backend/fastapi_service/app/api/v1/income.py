from fastapi import APIRouter, HTTPException

from app.schemas import IncomeInsightsRequest, IncomeInsightsResponse
from app.services.income_insights import generate_income_insights

router = APIRouter(tags=["income"])


@router.post("/income/insights", response_model=IncomeInsightsResponse)
def income_insights(payload: IncomeInsightsRequest):
    """
    Generate educational AI insights for a personal income profile.

    Public endpoint — no authentication required. The income analysis page
    is accessible to all users, and insights are purely educational with no
    user data stored. Uses the configured LLM provider (OpenAI / Gemini / Groq)
    with a deterministic rule-based fallback when no provider is available.
    Always returns HTTP 200 — the ``provider`` field indicates whether
    a real LLM or the fallback was used.
    """
    try:
        return generate_income_insights(payload)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
