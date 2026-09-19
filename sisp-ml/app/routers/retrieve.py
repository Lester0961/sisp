from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.retrieval_service import retrieval_service
from app.security import require_ml_secret

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
async def retrieve_chunks(payload: RetrieveRequest, _auth: None = Depends(require_ml_secret)):
    try:
        results = retrieval_service.retrieve(
            query=payload.query,
            limit=payload.limit or 3,
            category=payload.category
        )
        if not retrieval_service.is_ready():
            raise HTTPException(status_code=503, detail="Retrieval service is not ready.")
        return results
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
