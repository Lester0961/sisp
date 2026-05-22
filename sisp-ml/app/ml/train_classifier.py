import os
import json
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from datetime import datetime

def train_classifier():
    print("Starting intent classifier training...")
    
    # Define file paths
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_path = os.path.join(base_dir, "data", "training_data.json")
    model_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "intent_classifier_v1.pkl")

    # 1. Load training data
    if not os.path.exists(data_path):
        print(f"Error: Training data file not found at {data_path}")
        return False
        
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    texts = [item["text"] for item in data]
    labels = [item["intent"] for item in data]
    
    print(f"Loaded {len(texts)} training samples.")
    
    # 2. Build Pipeline
    pipeline = Pipeline([
        ('vectorizer', TfidfVectorizer(ngram_range=(1, 2), stop_words='english', min_df=1)),
        ('classifier', LogisticRegression(C=10.0, class_weight='balanced', max_iter=1000))
    ])
    
    # 3. Fit Pipeline
    pipeline.fit(texts, labels)
    
    # Evaluate self-accuracy
    train_accuracy = pipeline.score(texts, labels)
    print(f"Model training complete. Training Accuracy: {train_accuracy * 100:.2f}%")
    
    # 4. Save model + metadata
    metadata = {
        "model": pipeline,
        "version": "v1",
        "accuracy": train_accuracy,
        "trained_at": datetime.utcnow().isoformat()
    }
    
    joblib.dump(metadata, model_path)
    print(f"Serialized model saved successfully to: {model_path}")
    return True

if __name__ == "__main__":
    train_classifier()
