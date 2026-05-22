import os
import joblib
from app.config import get_settings

settings = get_settings()

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

            # List and sort all pkl files to auto-select the latest version
            pkl_files = [f for f in os.listdir(models_dir) if f.endswith(".pkl")]
            if not pkl_files:
                print("No classifier model (.pkl) files found.")
                return False

            # Sort files (e.g. intent_classifier_v1.pkl) to get the latest one
            pkl_files.sort()
            latest_model_name = pkl_files[-1]
            model_path = os.path.join(models_dir, latest_model_name)

            print(f"Loading intent classifier: {model_path}")
            metadata = joblib.load(model_path)
            
            # The pickled object is a dict with keys: 'model', 'version', 'accuracy', etc.
            self.model = metadata["model"]
            self.metadata = metadata
            self.is_loaded = True
            print(f"Successfully loaded model version: {metadata.get('version', 'unknown')}")
            return True
        except Exception as e:
            print(f"Error loading classifier model: {e}")
            self.model = None
            self.is_loaded = False
            return False

    def is_ready(self) -> bool:
        return self.is_loaded

    def classify(self, text: str) -> dict:
        """Classify user query intent and determine if it should be escalated."""
        if not self.is_loaded:
            print("Classifier not loaded. Attempting to reload...")
            loaded = self.load_model()
            if not loaded:
                return {
                    "intent": "general_inquiry",
                    "confidence": 0.0,
                    "escalate": True
                }

        try:
            # Get class probabilities
            probs = self.model.predict_proba([text])[0]
            classes = self.model.classes_
            
            # Find index of max probability
            max_idx = probs.argmax()
            predicted_intent = classes[max_idx]
            confidence = float(probs[max_idx])
            
            # We escalate if the confidence falls below the configured threshold
            escalate = confidence < settings.confidence_threshold
            
            return {
                "intent": predicted_intent,
                "confidence": confidence,
                "escalate": escalate
            }
        except Exception as e:
            print(f"Error during intent classification: {e}")
            return {
                "intent": "general_inquiry",
                "confidence": 0.0,
                "escalate": True
            }

classifier_service = ClassifierService()