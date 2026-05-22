from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.classifier_service import classifier_service

router = APIRouter(prefix="/classify", tags=["classify"])

class ClassifyRequest(BaseModel):
    query: str

class ClassifyResponse(BaseModel):
    intent: str
    confidence: float
    escalate: bool

@router.get("/health")
async def classify_health():
    return {"status": "ok", "router": "classify", "model_ready": classifier_service.is_ready()}

@router.post("", response_model=ClassifyResponse)
async def classify_query(payload: ClassifyRequest):
    if not classifier_service.is_ready():
        # Try reloading the model
        success = classifier_service.load_model()
        if not success:
            raise HTTPException(status_code=503, detail="Intent classifier model is not ready.")
            
    try:
        result = classifier_service.classify(payload.query)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))