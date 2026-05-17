from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import require_agreement, require_staff
from app.models import AIConversation, AIMessage
from app.schemas import (
    AIChatRequest,
    AIConversationRead,
    AIExplainChartRequest,
    AIMessageRead,
    AIReportRequest,
    AIReportResponse,
    AISuggestNextRequest,
    AISuggestNextResponse,
    StructuredAIResponse,
)
from app.services import ai_mentor
from app.services.authz import AuthzContext

router = APIRouter(prefix="/ai", tags=["ai-mentor"])


@router.post("/chat", response_model=StructuredAIResponse)
def chat(
    body: AIChatRequest,
    ctx: AuthzContext = Depends(require_agreement),
    db: Session = Depends(get_db),
):
    try:
        result = ai_mentor.chat(
            user_id=ctx.user_id,
            conversation_id=body.conversation_id,
            message=body.message,
            context_snapshot=body.context_snapshot,
            language=body.language,
            db=db,
        )
        db.commit()
        return result
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post("/explain-chart", response_model=StructuredAIResponse)
def explain_chart(
    body: AIExplainChartRequest,
    ctx: AuthzContext = Depends(require_agreement),
    db: Session = Depends(get_db),
):
    from app.services.chart_explainer import _resolve_language
    language = body.language if body.language else _resolve_language(body)
    try:
        result = ai_mentor.explain_chart(
            user_id=ctx.user_id,
            conversation_id=body.conversation_id,
            payload=body,
            language=language,
            db=db,
        )
        db.commit()
        return result
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post("/suggest-next", response_model=AISuggestNextResponse)
def suggest_next(
    body: AISuggestNextRequest,
    ctx: AuthzContext = Depends(require_agreement),
    db: Session = Depends(get_db),
):
    suggestions = ai_mentor.suggest_next(
        user_id=ctx.user_id,
        conversation_id=body.conversation_id,
        context_snapshot=body.context_snapshot,
        language=body.language,
        db=db,
    )
    return AISuggestNextResponse(suggestions=suggestions)


@router.post("/report-summary", response_model=AIReportResponse)
def report_summary(
    body: AIReportRequest,
    ctx: AuthzContext = Depends(require_agreement),
    db: Session = Depends(get_db),
):
    try:
        markdown, msg_id = ai_mentor.report_summary(
            user_id=ctx.user_id,
            conversation_id=body.conversation_id,
            context_snapshot=body.context_snapshot,
            language=body.language,
            db=db,
        )
        db.commit()
        return AIReportResponse(
            report_markdown=markdown,
            message_id=msg_id,
            conversation_id=body.conversation_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("/conversations", response_model=list[AIConversationRead])
def list_conversations(
    ctx: AuthzContext = Depends(require_agreement),
    db: Session = Depends(get_db),
):
    convs = (
        db.query(AIConversation)
        .filter_by(user_id=ctx.user_id)
        .order_by(AIConversation.updated_at.desc())
        .all()
    )
    return [
        AIConversationRead(
            id=conv.id,
            title=conv.title,
            created_at=conv.created_at.isoformat() if conv.created_at else "",
            updated_at=conv.updated_at.isoformat() if conv.updated_at else "",
            message_count=len(conv.messages),
        )
        for conv in convs
    ]


@router.get("/conversations/{conversation_id}/messages", response_model=list[AIMessageRead])
def get_messages(
    conversation_id: int,
    ctx: AuthzContext = Depends(require_agreement),
    db: Session = Depends(get_db),
):
    conv = db.query(AIConversation).filter_by(id=conversation_id, user_id=ctx.user_id).first()
    if conv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return [
        AIMessageRead(
            id=m.id,
            conversation_id=m.conversation_id,
            role=m.role,
            content=m.content,
            structured_response=m.structured_response,
            rag_chunks_used=m.rag_chunks_used,
            created_at=m.created_at.isoformat() if m.created_at else "",
        )
        for m in conv.messages
    ]


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: int,
    ctx: AuthzContext = Depends(require_agreement),
    db: Session = Depends(get_db),
):
    conv = db.query(AIConversation).filter_by(id=conversation_id, user_id=ctx.user_id).first()
    if conv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    db.delete(conv)
    db.commit()


@router.post("/reindex", status_code=status.HTTP_200_OK)
def reindex(
    _: AuthzContext = Depends(require_staff),
):
    from app.core.config import KNOWLEDGE_BASE_DIR
    from app.services.rag import build_index
    build_index(KNOWLEDGE_BASE_DIR)
    return {"status": "ok", "message": "RAG index rebuilt"}
