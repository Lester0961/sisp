from logging import INFO, getLogger
from time import monotonic
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel

from app.security import require_ml_secret
from app.services.chat_service import chat_service
from app.services.chat_request_deduplication import (
    ChatRequestConflict,
    ChatRequestPreviouslyFailed,
    chat_request_deduplicator,
)
from app.services.llm.router import llm_router
from app.services.retrieval_service import retrieval_service


router = APIRouter(prefix="/chat", tags=["chat"])
logger = getLogger("aria.chat")
logger.setLevel(INFO)


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
    usage = llm_router.usage_snapshot()
    deepseek_usage = next((item for item in usage if item.get("provider") == "deepseek"), None)
    deepseek_configured = any(
        provider.get("provider") == "deepseek" and provider.get("configured") is True
        for provider in providers
    )
    deepseek_budget_ready = bool(
        deepseek_usage and deepseek_usage.get("usage_ledger_available") is True
    )
    llm_ready = any(
        provider.get("configured") is True
        and (
            provider.get("provider") != "deepseek"
            or deepseek_budget_ready
        )
        for provider in providers
    )
    retrieval_ready = retrieval_service.is_ready()
    return {
        "status": "ready" if llm_ready and retrieval_ready else "degraded",
        "router": "chat",
        "llm_ready": llm_ready,
        "deepseek_budget_ready": deepseek_budget_ready if deepseek_configured else None,
        "retrieval_ready": retrieval_ready,
        "providers": providers,
        "approved_static_chunks": len(retrieval_service.text_documents),
        "database_connected": retrieval_service.pgvector_index_ready(),
    }


@router.post("", response_model=ChatResponse)
async def chat_query(
    payload: ChatRequest,
    request: Request,
    response: Response,
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
    async def process_chat_request():
        history_dicts = [
            {"role": message.role, "content": message.content}
            for message in (payload.history or [])
        ]
        return await chat_service.process_query(
            query=payload.query,
            conversation_history=history_dicts,
            preferred_language=payload.preferred_language,
        )

    try:
        result, replayed = await chat_request_deduplicator.run_once(
            request_id,
            payload.model_dump(mode="json"),
            process_chat_request,
        )
        if replayed:
            response.headers["X-ARIA-Request-Replayed"] = "true"
        logger.info(
            "request_id=%s completed route=%s intent=%s sources=%d replayed=%s duration_ms=%d",
            request_id,
            result.get("route", "unknown"),
            result.get("intent", "unknown"),
            len(result.get("sources") or []),
            replayed,
            round((monotonic() - started_at) * 1000),
        )
        return result
    except ChatRequestConflict as exc:
        raise HTTPException(
            status_code=409,
            detail="The request ID was reused with different chat content.",
            headers={"X-ARIA-Retry-Safe": "false"},
        ) from exc
    except ChatRequestPreviouslyFailed as exc:
        raise HTTPException(
            status_code=503,
            detail="This request already failed during processing. Send a new message to retry.",
            headers={"X-ARIA-Retry-Safe": "false"},
        ) from exc
    except Exception as exc:
        import traceback

        logger.exception("request_id=%s failed during ARIA processing", request_id)
        traceback.print_exc()
        raise HTTPException(
            status_code=503,
            detail="ARIA advisory processing is temporarily unavailable",
            headers={"X-ARIA-Retry-Safe": "false"},
        ) from exc
