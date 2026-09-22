from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.security import require_ml_secret
from app.services.chat_service import chat_service
from app.services.llm.router import llm_router
from app.services.retrieval_service import retrieval_service


router = APIRouter(prefix="/chat", tags=["chat"])


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
async def chat_query(payload: ChatRequest, _auth: None = Depends(require_ml_secret)):
    try:
        history_dicts = [
            {"role": message.role, "content": message.content}
            for message in (payload.history or [])
        ]
        return await chat_service.process_query(
            query=payload.query,
            conversation_history=history_dicts,
            preferred_language=payload.preferred_language,
        )
    except Exception as exc:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=503, detail="ARIA advisory processing is temporarily unavailable") from exc
