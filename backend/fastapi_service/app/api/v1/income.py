from fastapi import APIRouter, HTTPException

from app.schemas import IncomeChatRequest, IncomeChatResponse, IncomeInsightsRequest, IncomeInsightsResponse
from app.services.income_insights import generate_income_chat, generate_income_insights

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


@router.post("/income/chat", response_model=IncomeChatResponse)
def income_chat(payload: IncomeChatRequest):
    """
    Conversational financial advisor chat grounded in the user's income profile.

    Public endpoint — stateless, no conversation persistence. The full message
    history is sent by the client each request. The financial profile is used
    as system context so answers reference the user's specific numbers.
    Always returns HTTP 200 with a ``provider`` field (llm name or "fallback").
    """
    try:
        return generate_income_chat(payload)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
