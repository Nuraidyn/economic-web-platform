import re

import httpx

from app.core.config import (
    CHART_EXPLAIN_PROVIDER,
    CHART_EXPLAIN_MAX_COUNTRIES,
    CHART_EXPLAIN_MAX_INDICATORS,
    GEMINI_API_KEY,
    GEMINI_BASE_URL,
    GEMINI_MODEL,
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
    OPENAI_MODEL,
    OPENAI_TIMEOUT_SECONDS,
)
from app.schemas import ChartExplainRequest, ChartExplainResponse

LANGUAGE_NAMES = {
    "ru": "Russian",
    "kz": "Kazakh",
    "en": "English",
}

SUMMARY_I18N = {
    "en": {
        "range": "Range: {start} - {end}",
        "indicators_selected": "Indicators selected: {count}",
        "indicator": "Indicator: {label} ({code})",
        "no_points": "- {country}: no numeric points",
        "trend.flat": "flat",
        "trend.upward": "upward",
        "trend.downward": "downward",
        "series": "- {country}: points={count}, years={first_year}-{last_year}, first={first_value:.2f}, last={last_value:.2f}, change={change:+.2f} ({pct_text}), trend={trend}, min={min_value:.2f}, max={max_value:.2f}",
        "spread": "- Latest spread: top={top_country} ({top_value:.2f}), low={low_country} ({low_value:.2f}), gap={gap:.2f}",
        "intro": "LLM is unavailable, so the response below is a local analytical summary.",
        "question_label": "User question",
        "reason_label": "Reason",
    },
    "ru": {
        "range": "Диапазон: {start} - {end}",
        "indicators_selected": "Выбрано индикаторов: {count}",
        "indicator": "Индикатор: {label} ({code})",
        "no_points": "- {country}: нет числовых точек",
        "trend.flat": "стабильно",
        "trend.upward": "рост",
        "trend.downward": "снижение",
        "series": "- {country}: точек={count}, годы={first_year}-{last_year}, первое={first_value:.2f}, последнее={last_value:.2f}, изменение={change:+.2f} ({pct_text}), тренд={trend}, min={min_value:.2f}, max={max_value:.2f}",
        "spread": "- Последний разрыв: максимум={top_country} ({top_value:.2f}), минимум={low_country} ({low_value:.2f}), разница={gap:.2f}",
        "intro": "LLM недоступна, поэтому ниже локальный аналитический разбор.",
        "question_label": "Вопрос пользователя",
        "reason_label": "Причина",
    },
    "kz": {
        "range": "Аралығы: {start} - {end}",
        "indicators_selected": "Таңдалған индикатор саны: {count}",
        "indicator": "Индикатор: {label} ({code})",
        "no_points": "- {country}: сандық нүктелер жоқ",
        "trend.flat": "тұрақты",
        "trend.upward": "өсу",
        "trend.downward": "төмендеу",
        "series": "- {country}: нүкте={count}, жылдар={first_year}-{last_year}, бастапқы={first_value:.2f}, соңғы={last_value:.2f}, өзгеріс={change:+.2f} ({pct_text}), тренд={trend}, min={min_value:.2f}, max={max_value:.2f}",
        "spread": "- Соңғы айырма: жоғары={top_country} ({top_value:.2f}), төмен={low_country} ({low_value:.2f}), айырма={gap:.2f}",
        "intro": "LLM қолжетімсіз, сондықтан төменде жергілікті аналитикалық қорытынды берілді.",
        "question_label": "Пайдаланушы сұрағы",
        "reason_label": "Себеп",
    },
}


def _is_russian(text: str) -> bool:
    return bool(re.search(r"[А-Яа-яЁё]", text or ""))


def _resolve_language(payload: ChartExplainRequest) -> str:
    selected = (payload.language or "").strip().lower()
    if selected in LANGUAGE_NAMES:
        return selected
    return "ru" if _is_russian(payload.question) else "en"


def _localize(lang: str, key: str) -> str:
    local = SUMMARY_I18N.get(lang) or SUMMARY_I18N["en"]
    return local.get(key, SUMMARY_I18N["en"][key])


def _build_system_prompt(language: str) -> str:
    language_name = LANGUAGE_NAMES.get(language, "English")
    return (
        "You are an economics chart analyst. Explain clearly, ground statements only "
        "in provided data, mention uncertainty and missing data if relevant. "
        f"Always answer in {language_name}."
    )


def _series_stats(points):
    valid = sorted(
        [row for row in points if row.value is not None],
        key=lambda item: item.year,
    )
    if not valid:
        return None

    first = valid[0]
    last = valid[-1]
    values = [item.value for item in valid]
    change = last.value - first.value
    base = abs(first.value) if first.value != 0 else max(abs(last.value), 1.0)
    pct_change = (change / base) * 100 if base else None
    if abs(change) <= max(0.01, abs(first.value) * 0.03):
        trend = "flat"
    elif change > 0:
        trend = "upward"
    else:
        trend = "downward"

    return {
        "count": len(valid),
        "first_year": first.year,
        "last_year": last.year,
        "first_value": first.value,
        "last_value": last.value,
        "min": min(values),
        "max": max(values),
        "mean": sum(values) / len(values),
        "change": change,
        "pct_change": pct_change,
        "trend": trend,
    }


def _build_data_summary(payload: ChartExplainRequest, language: str) -> str:
    lines = []
    if payload.start_year is not None or payload.end_year is not None:
        lines.append(
            _localize(language, "range").format(
                start=payload.start_year if payload.start_year is not None else "n/a",
                end=payload.end_year if payload.end_year is not None else "n/a",
            )
        )
    lines.append(
        _localize(language, "indicators_selected").format(count=len(payload.datasets))
    )

    for dataset in payload.datasets:
        label = dataset.indicator_label or dataset.indicator
        lines.append(
            _localize(language, "indicator").format(label=label, code=dataset.indicator)
        )
        latest_values = []
        for series in dataset.series:
            stats = _series_stats(series.data)
            if not stats:
                lines.append(_localize(language, "no_points").format(country=series.country))
                continue
            pct_text = (
                "n/a"
                if stats["pct_change"] is None
                else f"{stats['pct_change']:+.2f}%"
            )
            trend_text = _localize(language, f"trend.{stats['trend']}")
            lines.append(
                _localize(language, "series").format(
                    country=series.country,
                    count=stats["count"],
                    first_year=stats["first_year"],
                    last_year=stats["last_year"],
                    first_value=stats["first_value"],
                    last_value=stats["last_value"],
                    change=stats["change"],
                    pct_text=pct_text,
                    trend=trend_text,
                    min_value=stats["min"],
                    max_value=stats["max"],
                )
            )
            latest_values.append((series.country, stats["last_value"]))
        if len(latest_values) >= 2:
            ranking = sorted(latest_values, key=lambda item: item[1], reverse=True)
            top_country, top_value = ranking[0]
            low_country, low_value = ranking[-1]
            lines.append(
                _localize(language, "spread").format(
                    top_country=top_country,
                    top_value=top_value,
                    low_country=low_country,
                    low_value=low_value,
                    gap=top_value - low_value,
                )
            )

    return "\n".join(lines)


def _fallback_answer(
    payload: ChartExplainRequest,
    summary: str,
    language: str,
    warning: str | None = None,
) -> str:
    intro = _localize(language, "intro")
    question_label = _localize(language, "question_label")
    reason_label = _localize(language, "reason_label")
    note = f"\n{reason_label}: {warning}" if warning else ""
    return f"{intro}\n{question_label}: {payload.question}{note}\n\n{summary}"


def _prompt_text(payload: ChartExplainRequest, summary: str, language: str) -> str:
    language_name = LANGUAGE_NAMES.get(language, "English")
    return (
        f"Response language: {language_name}\n\n"
        f"User question:\n{payload.question}\n\n"
        f"Data summary:\n{summary}\n\n"
        "Provide a concise explanation with 3-6 bullet points and a short conclusion."
    )


def _openai_answer(payload: ChartExplainRequest, summary: str, language: str) -> str:
    base_url = OPENAI_BASE_URL.rstrip("/")
    prompt = _prompt_text(payload, summary, language)
    with httpx.Client(timeout=OPENAI_TIMEOUT_SECONDS) as client:
        response = client.post(
            f"{base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": OPENAI_MODEL,
                "temperature": 0.2,
                "max_tokens": 700,
                "messages": [
                    {
                        "role": "system",
                        "content": _build_system_prompt(language),
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    },
                ],
            },
        )
        response.raise_for_status()
        body = response.json()

    choices = body.get("choices") or []
    if not choices:
        raise RuntimeError("OpenAI returned no choices")
    content = (choices[0].get("message") or {}).get("content", "").strip()
    if not content:
        raise RuntimeError("OpenAI returned empty content")
    return content


def _gemini_answer(payload: ChartExplainRequest, summary: str, language: str) -> str:
    base_url = GEMINI_BASE_URL.rstrip("/")
    prompt = f"{_build_system_prompt(language)}\n\n{_prompt_text(payload, summary, language)}"
    with httpx.Client(timeout=OPENAI_TIMEOUT_SECONDS) as client:
        response = client.post(
            f"{base_url}/models/{GEMINI_MODEL}:generateContent",
            headers={
                "x-goog-api-key": GEMINI_API_KEY,
                "Content-Type": "application/json",
            },
            json={
                "contents": [
                    {
                        "parts": [
                            {
                                "text": prompt,
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 700,
                },
            },
        )
        response.raise_for_status()
        body = response.json()

    candidates = body.get("candidates") or []
    if not candidates:
        raise RuntimeError("Gemini returned no candidates")

    parts = ((candidates[0].get("content") or {}).get("parts")) or []
    texts = [part.get("text", "").strip() for part in parts if isinstance(part, dict)]
    content = "\n".join([item for item in texts if item]).strip()
    if not content:
        raise RuntimeError("Gemini returned empty content")
    return content


def _resolve_provider() -> str:
    provider = (CHART_EXPLAIN_PROVIDER or "").strip().lower()
    if provider == "auto":
        if GEMINI_API_KEY:
            return "gemini"
        if OPENAI_API_KEY:
            return "openai"
    return provider or "openai"


def explain_chart(payload: ChartExplainRequest) -> ChartExplainResponse:
    question = (payload.question or "").strip()
    if not question:
        raise ValueError("question is required")
    if not payload.datasets:
        raise ValueError("datasets are required")
    if len(payload.datasets) > CHART_EXPLAIN_MAX_INDICATORS:
        raise ValueError(
            f"Too many indicators. Maximum is {CHART_EXPLAIN_MAX_INDICATORS}."
        )
    for dataset in payload.datasets:
        if len(dataset.series) > CHART_EXPLAIN_MAX_COUNTRIES:
            raise ValueError(
                f"Too many countries for indicator {dataset.indicator}. "
                f"Maximum is {CHART_EXPLAIN_MAX_COUNTRIES}."
            )

    language = _resolve_language(payload)
    summary = _build_data_summary(payload, language)
    provider = _resolve_provider()

    if provider == "openai" and not OPENAI_API_KEY:
        return ChartExplainResponse(
            answer=_fallback_answer(payload, summary, language, warning="OPENAI_API_KEY is not set"),
            provider="local-fallback",
            model=None,
            warning="OPENAI_API_KEY is not configured; returned local summary.",
        )

    if provider == "gemini" and not GEMINI_API_KEY:
        return ChartExplainResponse(
            answer=_fallback_answer(payload, summary, language, warning="GEMINI_API_KEY is not set"),
            provider="local-fallback",
            model=None,
            warning="GEMINI_API_KEY is not configured; returned local summary.",
        )

    if provider not in {"openai", "gemini"}:
        return ChartExplainResponse(
            answer=_fallback_answer(
                payload,
                summary,
                language,
                warning=f"Unknown CHART_EXPLAIN_PROVIDER: {provider}",
            ),
            provider="local-fallback",
            model=None,
            warning=f"Unknown CHART_EXPLAIN_PROVIDER: {provider}",
        )

    try:
        if provider == "gemini":
            answer = _gemini_answer(payload, summary, language)
            return ChartExplainResponse(
                answer=answer,
                provider="gemini",
                model=GEMINI_MODEL,
                warning=None,
            )

        answer = _openai_answer(payload, summary, language)
        return ChartExplainResponse(
            answer=answer,
            provider="openai",
            model=OPENAI_MODEL,
            warning=None,
        )
    except Exception as exc:
        engine = "Gemini" if provider == "gemini" else "OpenAI"
        return ChartExplainResponse(
            answer=_fallback_answer(payload, summary, language, warning=str(exc)),
            provider="local-fallback",
            model=None,
            warning=f"{engine} call failed: {exc}",
        )
