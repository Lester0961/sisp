from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.retrieval_service import retrieval_service

router = APIRouter(prefix="/retrieve", tags=["retrieve"])

class RetrieveRequest(BaseModel):
    query: str
    limit: Optional[int] = 3
    category: Optional[str] = None

class ChunkResponse(BaseModel):
    content: str
    source: str
    category: str
    similarity: float

@router.get("/health")
async def retrieve_health():
    return {"status": "ok", "router": "retrieve", "model_ready": retrieval_service.is_ready()}

@router.post("", response_model=List[ChunkResponse])
async def retrieve_chunks(payload: RetrieveRequest):
    if not retrieval_service.is_ready():
        raise HTTPException(status_code=503, detail="Retrieval service (embedding model) is not ready.")
        
    try:
        results = retrieval_service.retrieve(
            query=payload.query,
            limit=payload.limit or 3,
            category=payload.category
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))