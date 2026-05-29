from fastapi import APIRouter, Header, HTTPException, BackgroundTasks, status
from app.ml.retrain import retrain_model
from app.services.classifier_service import classifier_service
from app.config import get_settings

router = APIRouter(prefix="/admin", tags=["admin"])

settings = get_settings()

def run_retraining_task():
    try:
        print("[BG_TASK] Starting background retraining loop...")
        new_version = retrain_model()
        print(f"[BG_TASK] Model retrained to version: {new_version}")
        
        # Hot-reload the classifier service dynamically!
        reloaded = classifier_service.load_model()
        if reloaded:
            print(f"[BG_TASK] Successfully hot-swapped classifier to version: {new_version}")
        else:
            print("[BG_TASK] Failed to reload classifier after retraining.")
    except Exception as e:
        print(f"[BG_TASK] Retraining task failed: {e}")

@router.get("/health")
async def admin_health():
    return {
        "status": "ok",
        "router": "admin",
        "classifier_loaded": classifier_service.is_ready(),
        "classifier_version": classifier_service.metadata.get("version", "unknown") if classifier_service.is_ready() else "N/A"
    }

@router.post("/retrain", status_code=status.HTTP_202_ACCEPTED)
async def trigger_retrain(background_tasks: BackgroundTasks, x_ml_secret: str = Header(None)):
    """
    Triggers asynchronous retraining of the intent classifier model.
    Must be authenticated with 'X-ML-Secret' header matching ML_SECRET_TOKEN.
    """
    if x_ml_secret != settings.ml_secret_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid ML Secret Header token."
        )
    
    background_tasks.add_task(run_retraining_task)
    return {
        "status": "accepted",
        "message": "Retraining task scheduled successfully in background."
    }