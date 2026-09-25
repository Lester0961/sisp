from logging import getLogger
from time import monotonic
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.security import require_ml_secret
from app.services.chat_service import chat_service
from app.services.llm.router import llm_router
from app.services.retrieval_service import retrieval_service


router = APIRouter(prefix="/chat", tags=["chat"])
logger = getLogger("aria.chat")


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    query: str
    history: Optional[List[ChatMessage]] = None
    preferred_language: Optional[str] = None


class SourceCitation(BaseModel):
    source: str
    category: str
    similarity: float
    content_snippet: str


class ChatResponse(BaseModel):
    response: str
    intent: str
    confidence: float
    escalate: bool
    sources: List[SourceCitation]
    route: str
    action: Optional[str] = None
    language: Dict[str, Any]
    moderationCategories: List[str] = []
    second_intent: Optional[str] = None
    second_confidence: Optional[float] = None
    margin: Optional[float] = None
    model_version: Optional[str] = None
    quotaRefund: bool = False


@router.get("/health")
async def chat_health():
    providers = llm_router.configured_providers()
    llm_ready = any(provider["configured"] for provider in providers)
    retrieval_ready = retrieval_service.is_ready()
    return {
        "status": "ready" if llm_ready and retrieval_ready else "degraded",
        "router": "chat",
        "llm_ready": llm_ready,
        "retrieval_ready": retrieval_ready,
        "providers": providers,
        "approved_static_chunks": len(retrieval_service.text_documents),
        "database_connected": retrieval_service.pgvector_index_ready(),
    }


@router.post("", response_model=ChatResponse)
async def chat_query(
    payload: ChatRequest,
    request: Request,
    _auth: None = Depends(require_ml_secret),
):
    try:
        request_id = str(UUID(request.headers.get("x-request-id", "")))
    except (ValueError, TypeError):
        request_id = "untracked"

    started_at = monotonic()
    logger.info(
        "request_id=%s received query_chars=%d preferred_language=%s",
        request_id,
        len(payload.query),
        payload.preferred_language or "auto",
    )
    try:
        history_dicts = [
            {"role": message.role, "content": message.content}
            for message in (payload.history or [])
        ]
        result = await chat_service.process_query(
            query=payload.query,
            conversation_history=history_dicts,
            preferred_language=payload.preferred_language,
        )
        logger.info(
            "request_id=%s completed route=%s intent=%s sources=%d duration_ms=%d",
            request_id,
            result.get("route", "unknown"),
            result.get("intent", "unknown"),
            len(result.get("sources") or []),
            round((monotonic() - started_at) * 1000),
        )
        return result
    except Exception as exc:
        import traceback

        logger.exception("request_id=%s failed during ARIA processing", request_id)
        traceback.print_exc()
        raise HTTPException(status_code=503, detail="ARIA advisory processing is temporarily unavailable") from exc
