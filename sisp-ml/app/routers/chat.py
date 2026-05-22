from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.services.chat_service import chat_service

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatMessage(BaseModel):
    role: str  # 'user', 'assistant', 'system'
    content: str

class ChatRequest(BaseModel):
    query: str
    history: Optional[List[ChatMessage]] = None

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

@router.get("/health")
async def chat_health():
    return {"status": "ok", "router": "chat"}

@router.post("", response_model=ChatResponse)
async def chat_query(payload: ChatRequest):
    try:
        # Convert Pydantic ChatMessage list to dictionaries
        history_dicts = []
        if payload.history:
            for msg in payload.history:
                history_dicts.append({
                    "role": msg.role,
                    "content": msg.content
                })
                
        result = chat_service.process_query(
            query=payload.query,
            conversation_history=history_dicts
        )
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))