import os
import json
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from datetime import datetime

def retrain_model() -> str:
    """
    Retrains the intent classifier model.
    It reads the base training data, trains a new classifier pipeline, 
    and saves it to the next logical version (e.g. intent_classifier_v2.pkl).
    """
    print("Initiating classifier model retraining...")
    
    # Paths setup
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_path = os.path.join(base_dir, "data", "training_data.json")
    models_dir = os.path.join(base_dir, "ml", "models")
    os.makedirs(models_dir, exist_ok=True)
    
    # 1. Determine the next version suffix
    pkl_files = [f for f in os.listdir(models_dir) if f.endswith(".pkl")]
    next_ver = 2
    if pkl_files:
        pkl_files.sort()
        latest_file = pkl_files[-1]
        try:
            # Parse 'intent_classifier_v1.pkl' -> version number
            version_part = latest_file.split("_v")[-1].split(".pkl")[0]
            next_ver = int(version_part) + 1
        except Exception:
            next_ver = len(pkl_files) + 1
            
    version_str = f"v{next_ver}"
    model_filename = f"intent_classifier_{version_str}.pkl"
    model_path = os.path.join(models_dir, model_filename)

    # 2. Load training inputs
    if not os.path.exists(data_path):
        print(f"Error: Training source not found at: {data_path}")
        raise FileNotFoundError(f"Training data not found at {data_path}")

    with open(data_path, "r", encoding="utf-8") as f:
        training_samples = json.load(f)
        
    texts = [item["text"] for item in training_samples]
    labels = [item["intent"] for item in training_samples]
    
    print(f"Loaded {len(texts)} training samples for retraining model version {version_str}.")

    # 3. Train Pipeline (LogisticRegression matching train_classifier.py setup)
    pipeline = Pipeline([
        ('vectorizer', TfidfVectorizer(ngram_range=(1, 2), stop_words='english', min_df=1)),
        ('classifier', LogisticRegression(C=10.0, class_weight='balanced', max_iter=1000))
    ])
    
    pipeline.fit(texts, labels)
    
    # Evaluate self-accuracy
    train_accuracy = pipeline.score(texts, labels)
    print(f"Retrained version {version_str} successfully. Self-accuracy: {train_accuracy * 100:.2f}%")

    # 4. Serialize model and metadata block
    metadata = {
        "model": pipeline,
        "version": version_str,
        "accuracy": train_accuracy,
        "trained_at": datetime.utcnow().isoformat()
    }
    
    joblib.dump(metadata, model_path)
    print(f"Retrained model pickled successfully: {model_path}")
    
    return version_str

if __name__ == "__main__":
    retrain_model()
