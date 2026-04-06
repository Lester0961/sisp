from fastapi import APIRouter

router = APIRouter(prefix="/classify", tags=["classify"])


@router.get("/health")
async def classify_health():
    return {"status": "ok", "router": "classify"}