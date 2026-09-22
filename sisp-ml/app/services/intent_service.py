"""Intent-prediction interface used by ARIA's chat orchestrator."""

from app.services.classifier_service import classifier_service


class IntentService:
    """Keep model prediction separate from routing and answer generation."""

    @staticmethod
    def predict(text: str) -> dict:
        return classifier_service.classify(text)


intent_service = IntentService()
