from fastapi import APIRouter

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.get("/health")
async def feedback_health():
    return {"status": "ok", "router": "feedback"}