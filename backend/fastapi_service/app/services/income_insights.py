"""
AI-powered income insights service.

Reuses the provider/fallback pattern from chart_explainer.py.
Returns structured JSON (not free text) so the frontend can render
section-by-section without parsing.

Provider order (auto):  Groq → Gemini → OpenAI → fallback
"""
from __future__ import annotations

import json
import logging
import re

import httpx

from app.core.config import (
    GEMINI_API_KEY, GEMINI_BASE_URL, GEMINI_MODEL, GEMINI_TIMEOUT_SECONDS,
    GROQ_API_KEY, GROQ_BASE_URL, GROQ_MODEL, GROQ_TIMEOUT_SECONDS,
    OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, OPENAI_TIMEOUT_SECONDS,
    CHART_EXPLAIN_PROVIDER,
)
from app.schemas import IncomeInsightsRequest, IncomeInsightsResponse, PotentialCountry

logger = logging.getLogger(__name__)

# env key re-used from chart_explainer config; can be overridden per-service if needed
AI_INSIGHTS_PROVIDER = CHART_EXPLAIN_PROVIDER   # openai | gemini | groq | auto | fallback

_SYSTEM_PROMPT = """\
You are an educational career and financial advisor.
Your role is to provide general educational guidance — NOT financial advice,
investment recommendations, or income guarantees.

Rules:
- Never promise specific income numbers or returns.
- Never make statements like "you will earn X" or "guaranteed growth".
- Always frame suggestions as general educational patterns and possibilities.
- Include a clear disclaimer that this is for educational purposes only.
- Be concise, practical, and actionable.
"""

_USER_PROMPT_TEMPLATE = """\
A user has provided the following financial profile for educational analysis:
- Age: {age}
- Country: {country}
- Profession: {profession}
- Experience: {experience_years} years
- Monthly income: {monthly_income} {currency}
- Monthly expenses: {monthly_expenses} {currency}
- Yearly growth target: {yearly_growth_percent}%
- Analysis period: {period_years} year(s)
- Inflation-adjusted view: {inflation_adjusted}
- Comparison countries of interest: {comparison_countries}

Based on this profile, provide educational insights in the following JSON structure.
Return ONLY valid JSON, no markdown, no extra text:

{{
  "summary": "<2-3 sentence overview of the financial profile>",
  "income_benchmark": [
    "<benchmark observation 1>",
    "<benchmark observation 2>",
    "<benchmark observation 3>"
  ],
  "action_plan": {{
    "next_3_months": ["<action 1>", "<action 2>"],
    "next_6_months": ["<action 1>", "<action 2>"],
    "next_12_months": ["<action 1>", "<action 2>"]
  }},
  "potential_countries": [
    {{
      "country": "<country name>",
      "reason": "<why it could be interesting for this profession>",
      "estimated_income_range": "<educational estimate range, not a guarantee>"
    }}
  ],
  "disclaimer": "This analysis is for educational purposes only and does not constitute financial or career advice."
}}
"""


def _resolve_provider() -> str:
    p = (AI_INSIGHTS_PROVIDER or "").strip().lower()
    if p == "auto":
        if GROQ_API_KEY:   return "groq"
        if GEMINI_API_KEY: return "gemini"
        if OPENAI_API_KEY: return "openai"
        return "fallback"
    return p or "openai"


def _build_prompt(req: IncomeInsightsRequest) -> str:
    return _USER_PROMPT_TEMPLATE.format(
        age=req.age,
        country=req.country,
        profession=req.profession,
        experience_years=req.experience_years,
        monthly_income=req.monthly_income,
        monthly_expenses=req.monthly_expenses,
        yearly_growth_percent=req.yearly_growth_percent,
        period_years=req.period_years,
        inflation_adjusted=req.inflation_adjusted,
        currency=req.currency,
        comparison_countries=", ".join(req.comparison_countries) if req.comparison_countries else "none specified",
    )


def _parse_llm_json(raw: str) -> dict:
    """Extract JSON from LLM response (may be wrapped in markdown code blocks)."""
    # strip ```json ... ``` fences
    raw = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.MULTILINE)
    raw = re.sub(r"\s*```$", "", raw.strip(), flags=re.MULTILINE)
    return json.loads(raw.strip())


def _make_response(data: dict, provider: str) -> IncomeInsightsResponse:
    countries = [
        PotentialCountry(**c)
        for c in (data.get("potential_countries") or [])
        if isinstance(c, dict)
    ]
    action = data.get("action_plan") or {}
    return IncomeInsightsResponse(
        summary=data.get("summary", ""),
        income_benchmark=data.get("income_benchmark") or [],
        action_plan={
            "next_3_months": action.get("next_3_months") or [],
            "next_6_months": action.get("next_6_months") or [],
            "next_12_months": action.get("next_12_months") or [],
        },
        potential_countries=countries,
        disclaimer=data.get("disclaimer", _DISCLAIMER),
        provider=provider,
    )


_DISCLAIMER = (
    "This analysis is for educational purposes only and does not constitute "
    "financial, career, or investment advice. Always consult a qualified professional."
)


def _fallback_response(req: IncomeInsightsRequest) -> IncomeInsightsResponse:
    """Deterministic rule-based fallback when no LLM is available."""
    savings = req.monthly_income - req.monthly_expenses
    savings_rate = (savings / req.monthly_income * 100) if req.monthly_income > 0 else 0
    projected_1y = req.monthly_income * (1 + req.yearly_growth_percent / 100) * 12

    if savings_rate >= 30:
        status = "strong"
        summary = (
            f"Your profile shows a strong savings rate of {savings_rate:.0f}%, "
            f"which is above the commonly cited 20% benchmark. "
            f"With {req.experience_years} years in {req.profession}, you appear well-positioned "
            "for further growth."
        )
        benchmarks = [
            f"Your savings rate ({savings_rate:.0f}%) exceeds the 20% guideline.",
            f"With {req.experience_years}+ years of experience, senior roles may be accessible.",
            f"Projected annual income at current growth: ~{projected_1y:,.0f} {req.currency}.",
        ]
    elif savings_rate >= 10:
        status = "stable"
        summary = (
            f"Your profile shows a stable savings rate of {savings_rate:.0f}%. "
            f"With {req.experience_years} years in {req.profession}, there are opportunities "
            "to optimize expenses or increase income through skill development."
        )
        benchmarks = [
            f"Savings rate of {savings_rate:.0f}% is stable; target 20%+ for stronger resilience.",
            f"At {req.experience_years} years experience, mid-senior transitions may boost income.",
            f"Projected annual income at current growth: ~{projected_1y:,.0f} {req.currency}.",
        ]
    else:
        status = "deficit" if savings < 0 else "low"
        summary = (
            f"Your profile shows a {'negative' if savings < 0 else 'low'} savings rate. "
            "Reviewing recurring expenses and exploring skill-based income increases "
            "could improve your financial resilience."
        )
        benchmarks = [
            "Consider a budget audit to identify the top 3 expense categories.",
            "Skill certifications or freelance work may provide supplementary income.",
            f"Projected annual income at current growth: ~{projected_1y:,.0f} {req.currency}.",
        ]

    countries = [
        PotentialCountry(
            country="Germany",
            reason=f"{req.profession} professionals are in demand; strong job market.",
            estimated_income_range="Educational estimate only — varies widely by role and location.",
        ),
        PotentialCountry(
            country="Canada",
            reason="High demand for tech and professional roles; immigration pathways available.",
            estimated_income_range="Educational estimate only — varies widely by role and location.",
        ),
        PotentialCountry(
            country="Netherlands",
            reason="English-friendly work environment; competitive professional salaries.",
            estimated_income_range="Educational estimate only — varies widely by role and location.",
        ),
    ]

    return IncomeInsightsResponse(
        summary=summary,
        income_benchmark=benchmarks,
        action_plan={
            "next_3_months": [
                "Review your budget and categorize all monthly expenses.",
                "Research one skill certification relevant to your profession.",
            ],
            "next_6_months": [
                "Complete one certification or course to improve career prospects.",
                "Build a 1-month emergency fund if not already in place.",
            ],
            "next_12_months": [
                "Negotiate a salary review or explore new opportunities based on new skills.",
                f"Target a savings rate of {min(savings_rate + 5, 30):.0f}% through incremental adjustments.",
            ],
        },
        potential_countries=countries,
        disclaimer=_DISCLAIMER,
        provider="fallback",
    )


def _call_openai(prompt: str) -> str:
    with httpx.Client(timeout=OPENAI_TIMEOUT_SECONDS) as client:
        resp = client.post(
            f"{OPENAI_BASE_URL.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": OPENAI_MODEL,
                "temperature": 0.3,
                "max_tokens": 900,
                "messages": [
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
            },
        )
        resp.raise_for_status()
    choices = resp.json().get("choices") or []
    if not choices:
        raise RuntimeError("OpenAI returned no choices")
    content = (choices[0].get("message") or {}).get("content", "").strip()
    if not content:
        raise RuntimeError("OpenAI returned empty content")
    return content


def _call_gemini(prompt: str) -> str:
    full_prompt = f"{_SYSTEM_PROMPT}\n\n{prompt}"
    with httpx.Client(timeout=GEMINI_TIMEOUT_SECONDS) as client:
        resp = client.post(
            f"{GEMINI_BASE_URL.rstrip('/')}/models/{GEMINI_MODEL}:generateContent",
            headers={"x-goog-api-key": GEMINI_API_KEY, "Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": full_prompt}]}],
                "generationConfig": {"temperature": 0.3, "maxOutputTokens": 900},
            },
        )
        resp.raise_for_status()
    candidates = resp.json().get("candidates") or []
    if not candidates:
        raise RuntimeError("Gemini returned no candidates")
    parts = ((candidates[0].get("content") or {}).get("parts")) or []
    content = "\n".join(p.get("text", "").strip() for p in parts if isinstance(p, dict)).strip()
    if not content:
        raise RuntimeError("Gemini returned empty content")
    return content


def _call_groq(prompt: str) -> str:
    with httpx.Client(timeout=GROQ_TIMEOUT_SECONDS) as client:
        resp = client.post(
            f"{GROQ_BASE_URL.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": GROQ_MODEL,
                "temperature": 0.3,
                "max_tokens": 900,
                "messages": [
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
            },
        )
        resp.raise_for_status()
    choices = resp.json().get("choices") or []
    if not choices:
        raise RuntimeError("Groq returned no choices")
    content = (choices[0].get("message") or {}).get("content", "").strip()
    if not content:
        raise RuntimeError("Groq returned empty content")
    return content


import sys as _sys

_KEY_FNS = {
    "openai": lambda: OPENAI_API_KEY,
    "gemini": lambda: GEMINI_API_KEY,
    "groq":   lambda: GROQ_API_KEY,
}

_SUPPORTED = frozenset(_KEY_FNS)


def generate_income_insights(req: IncomeInsightsRequest) -> IncomeInsightsResponse:
    provider = _resolve_provider()

    if provider == "fallback" or provider not in _SUPPORTED:
        return _fallback_response(req)

    if not _KEY_FNS[provider]():
        logger.info("income_insights: %s key not set, using fallback", provider)
        return _fallback_response(req)

    _mod = _sys.modules[__name__]
    call_fn = getattr(_mod, f"_call_{provider}")
    prompt = _build_prompt(req)
    try:
        raw = call_fn(prompt)
        data = _parse_llm_json(raw)
        return _make_response(data, provider)
    except json.JSONDecodeError as exc:
        logger.warning("income_insights: JSON parse failed (%s), using fallback", exc)
        return _fallback_response(req)
    except Exception as exc:
        logger.warning("income_insights: %s call failed (%s), using fallback", provider, exc)
        return _fallback_response(req)
