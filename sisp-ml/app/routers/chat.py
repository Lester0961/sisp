from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.chat_service import chat_service


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


@router.get("/health")
async def chat_health():
    return {"status": "ok", "router": "chat"}


@router.post("", response_model=ChatResponse)
async def chat_query(payload: ChatRequest):
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
