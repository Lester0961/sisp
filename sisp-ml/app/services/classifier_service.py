import os
import re
import joblib
import sklearn
from app.config import get_settings

settings = get_settings()

SUPPORTED_INTENTS = {
    "enrollment_inquiry",
    "grade_inquiry",
    "payment_inquiry",
    "document_request",
    "general_inquiry",
    "curriculum_inquiry",
}

class ClassifierService:
    def __init__(self):
        self.model = None
        self.metadata = None
        self.is_loaded = False
        self.load_model()

    def load_model(self) -> bool:
        """Find and load the latest serialized intent classifier pipeline."""
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            models_dir = os.path.join(base_dir, "ml", "models")
            
            if not os.path.exists(models_dir):
                print(f"Models directory not found at: {models_dir}")
                return False

            # Sort by the numeric artifact version (lexical sort puts v10
            # before v2 and can silently keep an older model active).
            pkl_files = [
                f for f in os.listdir(models_dir)
                if re.fullmatch(r"intent_classifier_v\d+\.pkl", f)
            ]
            if not pkl_files:
                print("No classifier model (.pkl) files found.")
                return False

            pkl_files.sort(key=lambda filename: int(re.search(r"_v(\d+)\.pkl$", filename).group(1)))
            latest_model_name = pkl_files[-1]
            model_path = os.path.join(models_dir, latest_model_name)

            print(f"Loading intent classifier: {model_path}")
            metadata = joblib.load(model_path)

            model = metadata.get("model") if isinstance(metadata, dict) else None
            if model is None or not callable(getattr(model, "predict_proba", None)):
                raise ValueError("Classifier artifact does not contain a probability-capable model.")

            saved_labels = set(metadata.get("labels", getattr(model, "classes_", [])))
            if saved_labels != SUPPORTED_INTENTS:
                raise ValueError(
                    "Classifier artifact intents do not match the six supported intent labels."
                )

            artifact_sklearn_version = metadata.get("sklearn_version")
            if artifact_sklearn_version and artifact_sklearn_version != sklearn.__version__:
                print(
                    "Classifier artifact was trained with scikit-learn "
                    f"{artifact_sklearn_version}; runtime is {sklearn.__version__}. "
                    "Loading without automatic retraining; re-train and evaluate explicitly if needed."
                )

            # Model changes are explicit: a dataset edit never triggers a
            # training job or silently changes the artifact selected at startup.
            self.model = model
            self.metadata = metadata
            self.is_loaded = True
            print(f"Successfully loaded model version: {metadata.get('version', 'unknown')}")
            return True
        except Exception as e:
            print(f"Error loading classifier model: {e}")
            self.model = None
            self.metadata = None
            self.is_loaded = False
            return False

    def is_ready(self) -> bool:
        return self.is_loaded

    def classify(self, text: str) -> dict:
        """Classify user query intent and determine if it should be escalated."""
        if not (text or "").strip():
            return self._unavailable_result()

        if not self.is_loaded:
            print("Classifier not loaded. Attempting to reload...")
            loaded = self.load_model()
            if not loaded:
                return self._unavailable_result()

        try:
            # Get class probabilities
            probs = self.model.predict_proba([text])[0]
            classes = self.model.classes_
            
            ranked_indices = sorted(range(len(probs)), key=lambda index: float(probs[index]), reverse=True)
            top_index = ranked_indices[0]
            second_index = ranked_indices[1] if len(ranked_indices) > 1 else None
            predicted_intent = str(classes[top_index])
            confidence = float(probs[top_index])
            second_intent = str(classes[second_index]) if second_index is not None else None
            second_confidence = float(probs[second_index]) if second_index is not None else 0.0
            margin = confidence - second_confidence
            escalate = (
                confidence < settings.intent_min_confidence
                or margin < settings.intent_min_margin
            )
            
            return {
                "intent": predicted_intent,
                "confidence": confidence,
                "second_intent": second_intent,
                "second_confidence": second_confidence,
                "margin": margin,
                "escalate": escalate,
                "model_version": (self.metadata or {}).get("version", "unknown"),
            }
        except Exception as e:
            print(f"Error during intent classification: {e}")
            return self._unavailable_result()

    def _unavailable_result(self) -> dict:
        return {
            "intent": "general_inquiry",
            "confidence": 0.0,
            "second_intent": None,
            "second_confidence": 0.0,
            "margin": 0.0,
            "escalate": True,
            "model_version": (self.metadata or {}).get("version", "unknown"),
        }

classifier_service = ClassifierService()
