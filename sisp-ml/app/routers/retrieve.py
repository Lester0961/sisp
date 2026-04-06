from fastapi import APIRouter

router = APIRouter(prefix="/retrieve", tags=["retrieve"])


@router.get("/health")
async def retrieve_health():
    return {"status": "ok", "router": "retrieve"}