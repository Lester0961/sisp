"""Evaluate the committed classifier on a separate, non-training set.

Run with: python -m app.ml.evaluate_classifier
"""

import json
import re
from pathlib import Path

import joblib
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support


APP_DIR = Path(__file__).resolve().parents[1]
TRAINING_PATH = APP_DIR / "data" / "training_data.json"
EVALUATION_PATH = APP_DIR / "data" / "classifier_evaluation.json"
MODELS_DIR = APP_DIR / "ml" / "models"


def latest_model_path() -> Path:
    models = sorted(
        MODELS_DIR.glob("intent_classifier_v*.pkl"),
        key=lambda path: int(re.search(r"_v(\d+)\.pkl$", path.name).group(1)),
    )
    if not models:
        raise FileNotFoundError(f"No versioned classifier models found in {MODELS_DIR}")
    return models[-1]


def normalize(text: str) -> str:
    return re.sub(r"\W+", " ", text.casefold()).strip()


def evaluate() -> dict:
    with TRAINING_PATH.open(encoding="utf-8") as handle:
        training = json.load(handle)
    with EVALUATION_PATH.open(encoding="utf-8") as handle:
        evaluation = json.load(handle)

    metadata = joblib.load(latest_model_path())
    metadata_training_path = metadata.get("training_data_file")
    if metadata_training_path:
        candidate_path = Path(metadata_training_path)
        if not candidate_path.is_absolute():
            candidate_path = APP_DIR / candidate_path
        if not candidate_path.is_file():
            raise FileNotFoundError(
                f"Recorded model training data is missing: {candidate_path}; refusing to use the legacy corpus for overlap checks."
            )
        with candidate_path.open(encoding="utf-8") as handle:
            training = json.load(handle)

    overlap = {normalize(item["text"]) for item in training} & {
        normalize(item["text"]) for item in evaluation
    }
    if overlap:
        raise ValueError("Evaluation examples overlap with training examples.")

    model = metadata["model"]
    texts = [item["text"] for item in evaluation]
    expected = [item["intent"] for item in evaluation]
    predicted = model.predict(texts).tolist()
    labels = sorted(set(expected) | set(predicted))
    precision, recall, f1, support = precision_recall_fscore_support(
        expected, predicted, labels=labels, zero_division=0
    )
    matrix = confusion_matrix(expected, predicted, labels=labels)
    misclassifications = [
        {"text": text, "expected": truth, "predicted": guess}
        for text, truth, guess in zip(texts, expected, predicted)
        if truth != guess
    ]

    return {
        "model_version": metadata.get("version", "unknown"),
        "evaluation_samples": len(evaluation),
        "training_samples": metadata.get("training_samples", len(training)),
        "test_accuracy": accuracy_score(expected, predicted),
        "labels": labels,
        "confusion_matrix": matrix.tolist(),
        "per_class": {
            label: {
                "precision": float(precision[index]),
                "recall": float(recall[index]),
                "f1": float(f1[index]),
                "support": int(support[index]),
            }
            for index, label in enumerate(labels)
        },
        "misclassifications": misclassifications,
    }


if __name__ == "__main__":
    print(json.dumps(evaluate(), indent=2, ensure_ascii=False))
