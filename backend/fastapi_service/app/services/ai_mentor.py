from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.core.config import (
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    OPENROUTER_MAX_TOKENS,
    OPENROUTER_MODEL,
    OPENROUTER_TIMEOUT_SECONDS,
)
from app.models import AIConversation, AIMessage
from app.schemas import StructuredAIResponse
from app.services import rag
from app.services.chart_explainer import _build_data_summary, _resolve_language

logger = logging.getLogger(__name__)

_LANGUAGE_NAMES = {"ru": "Russian", "kz": "Kazakh", "en": "English"}
_HISTORY_LIMIT = 6


# ── LLM call ─────────────────────────────────────────────────────────────────

def _call_openrouter(messages: list[dict], system_prompt: str) -> str:
    if not OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY is not configured")
    with httpx.Client(timeout=OPENROUTER_TIMEOUT_SECONDS) as client:
        response = client.post(
            f"{OPENROUTER_BASE_URL.rstrip('/')}/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://economic-web-platform",
                "X-Title": "Economic Web Platform",
            },
            json={
                "model": OPENROUTER_MODEL,
                "temperature": 0.3,
                "max_tokens": OPENROUTER_MAX_TOKENS,
                "messages": [{"role": "system", "content": system_prompt}, *messages],
            },
        )
        response.raise_for_status()
        body = response.json()
    choices = body.get("choices") or []
    if not choices:
        raise RuntimeError("OpenRouter returned no choices")
    content = (choices[0].get("message") or {}).get("content", "").strip()
    if not content:
        raise RuntimeError("OpenRouter returned empty content")
    return content


# ── Parsing ───────────────────────────────────────────────────────────────────

def _parse_structured(text: str) -> tuple[str, list[str], str, list[str]]:
    try:
        clean = re.sub(r"```(?:json)?\s*|\s*```", "", text.strip())
        data = json.loads(clean)
        return (
            str(data.get("summary", text[:300])),
            [str(x) for x in data.get("insights", [])],
            str(data.get("limitations", "")),
            [str(x) for x in data.get("suggested_next_steps", [])],
        )
    except (json.JSONDecodeError, AttributeError, ValueError):
        return text, [], "", []


def _parse_suggestions(text: str) -> list[str]:
    try:
        clean = re.sub(r"```(?:json)?\s*|\s*```", "", text.strip())
        result = json.loads(clean)
        if isinstance(result, list):
            return [str(s) for s in result[:5]]
    except (json.JSONDecodeError, ValueError):
        pass
    lines = [ln.strip().lstrip("•-0123456789. ") for ln in text.split("\n") if ln.strip()]
    return [ln for ln in lines if ln][:5]


# ── Conversation helpers ──────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _make_title(message: str) -> str:
    return message.strip()[:80] or "New Conversation"


def _get_or_create_conversation(
    user_id: int,
    conversation_id: Optional[int],
    first_message: str,
    db: Session,
) -> AIConversation:
    if conversation_id is not None:
        conv = db.query(AIConversation).filter_by(id=conversation_id, user_id=user_id).first()
        if conv is None:
            raise ValueError(f"Conversation {conversation_id} not found for user {user_id}")
        return conv
    conv = AIConversation(user_id=user_id, title=_make_title(first_message))
    db.add(conv)
    db.flush()
    return conv


def _load_history(conversation_id: int, db: Session, limit: int = _HISTORY_LIMIT) -> list[dict]:
    messages = (
        db.query(AIMessage)
        .filter_by(conversation_id=conversation_id)
        .order_by(AIMessage.created_at.desc())
        .limit(limit)
        .all()
    )
    return [{"role": m.role, "content": m.content} for m in reversed(messages)]


def _save_exchange(
    conversation_id: int,
    user_content: str,
    assistant_content: str,
    structured: dict,
    rag_chunks: list[str],
    db: Session,
) -> int:
    user_msg = AIMessage(
        conversation_id=conversation_id,
        role="user",
        content=user_content,
        created_at=_now(),
    )
    db.add(user_msg)
    db.flush()
    asst_msg = AIMessage(
        conversation_id=conversation_id,
        role="assistant",
        content=assistant_content,
        structured_response=structured,
        rag_chunks_used=rag_chunks,
        created_at=_now(),
    )
    db.add(asst_msg)
    db.flush()
    return asst_msg.id


def _system_prompt(language: str) -> str:
    lang_name = _LANGUAGE_NAMES.get(language, "English")
    return (
        "You are an AI Economic Mentor embedded in an economic analytics platform. "
        "You have access to a knowledge base of economic concepts and the user's chart data. "
        "Be precise, cite data when available, acknowledge uncertainty. "
        f"Always respond in {lang_name}. "
        "When asked to explain data, respond ONLY with a JSON object in this exact format "
        "(no markdown fences, no extra text outside the JSON):\n"
        '{"summary":"one-sentence key insight","insights":["bullet 1","bullet 2","bullet 3"],'
        '"limitations":"caveats or data gaps","suggested_next_steps":["question 1","question 2"]}'
    )


def _format_rag(chunks: list[str]) -> str:
    if not chunks:
        return ""
    joined = "\n\n".join(f"[Knowledge Base]\n{c}" for c in chunks)
    return f"\n\n{joined}"


def _format_context(context_snapshot: Optional[dict]) -> str:
    if not context_snapshot:
        return ""
    parts = []
    countries = context_snapshot.get("countries") or []
    indicators = context_snapshot.get("indicators") or []
    start = context_snapshot.get("start_year")
    end = context_snapshot.get("end_year")
    if countries:
        parts.append(f"Selected countries: {', '.join(str(c) for c in countries)}")
    if indicators:
        parts.append(f"Selected indicators: {', '.join(str(i) for i in indicators)}")
    if start or end:
        parts.append(f"Year range: {start or '?'} - {end or '?'}")
    if not parts:
        return ""
    return "\n\n[Chart Context]\n" + "\n".join(parts)


# ── Public service functions ──────────────────────────────────────────────────

def chat(
    user_id: int,
    conversation_id: Optional[int],
    message: str,
    context_snapshot: Optional[dict],
    language: str,
    db: Session,
) -> StructuredAIResponse:
    chunks = rag.retrieve(message, top_k=4)
    conv = _get_or_create_conversation(user_id, conversation_id, message, db)
    history = _load_history(conv.id, db)
    rag_text = _format_rag(chunks)
    ctx_text = _format_context(context_snapshot)
    user_content = f"{message}{rag_text}{ctx_text}"
    messages = [*history, {"role": "user", "content": user_content}]

    try:
        raw = _call_openrouter(messages, _system_prompt(language))
    except Exception as exc:
        logger.error("ai_mentor.chat: LLM call failed: %s", exc)
        raw = f"Error: {exc}"

    summary, insights, limitations, next_steps = _parse_structured(raw)
    structured = {
        "summary": summary,
        "insights": insights,
        "limitations": limitations,
        "suggested_next_steps": next_steps,
    }
    msg_id = _save_exchange(conv.id, message, raw, structured, chunks, db)
    conv.updated_at = _now()
    if context_snapshot:
        conv.context_snapshot = context_snapshot
    db.flush()

    return StructuredAIResponse(
        conversation_id=conv.id,
        message_id=msg_id,
        summary=summary,
        insights=insights,
        limitations=limitations,
        suggested_next_steps=next_steps,
        provider="openrouter",
        model=OPENROUTER_MODEL,
        rag_chunks_used=chunks,
    )


def explain_chart(
    user_id: int,
    conversation_id: Optional[int],
    payload,
    language: str,
    db: Session,
) -> StructuredAIResponse:
    indicator_names = " ".join(
        ds.indicator_label or ds.indicator for ds in payload.datasets
    )
    chunks = rag.retrieve(f"{payload.question} {indicator_names}", top_k=4)

    try:
        data_summary = _build_data_summary(payload, language)
    except Exception as exc:
        logger.warning("ai_mentor.explain_chart: data summary failed: %s", exc)
        data_summary = ""

    conv = _get_or_create_conversation(user_id, conversation_id, payload.question, db)
    history = _load_history(conv.id, db)
    rag_text = _format_rag(chunks)
    user_content = f"{payload.question}\n\n[Chart Data]\n{data_summary}{rag_text}"
    messages = [*history, {"role": "user", "content": user_content}]

    try:
        raw = _call_openrouter(messages, _system_prompt(language))
    except Exception as exc:
        logger.error("ai_mentor.explain_chart: LLM call failed: %s", exc)
        raw = f"Error: {exc}"

    summary, insights, limitations, next_steps = _parse_structured(raw)
    structured = {
        "summary": summary,
        "insights": insights,
        "limitations": limitations,
        "suggested_next_steps": next_steps,
    }
    msg_id = _save_exchange(conv.id, payload.question, raw, structured, chunks, db)
    conv.updated_at = _now()
    db.flush()

    return StructuredAIResponse(
        conversation_id=conv.id,
        message_id=msg_id,
        summary=summary,
        insights=insights,
        limitations=limitations,
        suggested_next_steps=next_steps,
        provider="openrouter",
        model=OPENROUTER_MODEL,
        rag_chunks_used=chunks,
    )


def suggest_next(
    user_id: int,
    conversation_id: Optional[int],
    context_snapshot: Optional[dict],
    language: str,
    db: Session,
) -> list[str]:
    lang_name = _LANGUAGE_NAMES.get(language, "English")
    history: list[dict] = []
    if conversation_id is not None:
        history = _load_history(conversation_id, db, limit=4)

    ctx_text = _format_context(context_snapshot)
    system = (
        f"You are an economic analysis assistant. Respond in {lang_name}. "
        "Suggest 3-5 specific follow-up questions based on the conversation and chart context. "
        "Respond ONLY with a JSON array of strings, no other text:\n"
        '["question 1", "question 2", "question 3"]'
    )
    user_content = f"Suggest follow-up questions.{ctx_text}"
    messages = [*history, {"role": "user", "content": user_content}]

    try:
        raw = _call_openrouter(messages, system)
        return _parse_suggestions(raw)
    except Exception as exc:
        logger.warning("ai_mentor.suggest_next: failed: %s", exc)
        return []


def report_summary(
    user_id: int,
    conversation_id: int,
    context_snapshot: Optional[dict],
    language: str,
    db: Session,
) -> tuple[str, int]:
    lang_name = _LANGUAGE_NAMES.get(language, "English")
    conv = db.query(AIConversation).filter_by(id=conversation_id, user_id=user_id).first()
    if conv is None:
        raise ValueError(f"Conversation {conversation_id} not found")

    all_messages = (
        db.query(AIMessage)
        .filter_by(conversation_id=conversation_id)
        .order_by(AIMessage.created_at)
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in all_messages]
    ctx_text = _format_context(context_snapshot)

    system = (
        f"You are an economic research assistant. Respond in {lang_name}. "
        "Generate a structured analytical report in Markdown with these sections: "
        "## Executive Summary, ## Key Findings, ## Indicator Analysis, "
        "## Limitations, ## Recommendations. Be concise and data-driven."
    )
    user_content = f"Generate a report from our conversation.{ctx_text}"
    messages = [*history, {"role": "user", "content": user_content}]

    try:
        markdown = _call_openrouter(messages, system)
    except Exception as exc:
        logger.error("ai_mentor.report_summary: LLM call failed: %s", exc)
        markdown = f"# Report\n\nCould not generate report: {exc}"

    msg = AIMessage(
        conversation_id=conversation_id,
        role="assistant",
        content=markdown,
        created_at=_now(),
    )
    db.add(msg)
    db.flush()
    conv.updated_at = _now()
    db.flush()

    return markdown, msg.id
