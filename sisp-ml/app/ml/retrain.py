"""Train versioned ARIA intent models with an explicit promotion boundary."""

from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import joblib
import sklearn

from app.ml.intent_pipeline import build_intent_pipeline


APP_DIR = Path(__file__).resolve().parents[1]
MODELS_DIR = APP_DIR / "ml" / "models"
CANDIDATE_DIR = MODELS_DIR / "candidates"
MULTILINGUAL_DATA_PATH = APP_DIR / "data" / "training" / "training_multilingual.json"
BASELINE_DATA_PATH = APP_DIR / "data" / "training_data.json"
SUPPORTED_INTENTS = {
    "enrollment_inquiry",
    "grade_inquiry",
    "payment_inquiry",
    "document_request",
    "general_inquiry",
    "curriculum_inquiry",
}
MODEL_FILE_PATTERN = re.compile(r"intent_classifier_v(\d+)\.pkl$")


def resolve_training_data_path(training_data_path: str | Path | None = None) -> Path:
    if training_data_path is not None:
        path = Path(training_data_path).expanduser().resolve()
        if not path.is_file():
            raise FileNotFoundError(f"Training data not found: {path}")
        return path
    if MULTILINGUAL_DATA_PATH.is_file():
        return MULTILINGUAL_DATA_PATH
    if BASELINE_DATA_PATH.is_file():
        return BASELINE_DATA_PATH
    raise FileNotFoundError("Neither the multilingual corpus nor the baseline training file exists.")


def _next_version() -> int:
    versions = []
    for directory in (MODELS_DIR, CANDIDATE_DIR):
        if not directory.exists():
            continue
        for path in directory.glob("intent_classifier_v*.pkl"):
            match = MODEL_FILE_PATTERN.fullmatch(path.name)
            if match:
                versions.append(int(match.group(1)))
    return max(versions, default=0) + 1


def _data_metadata(path: Path, training_samples: list[dict]) -> dict:
    raw = path.read_bytes()
    try:
        relative_path = path.resolve().relative_to(APP_DIR.resolve()).as_posix()
    except ValueError:
        relative_path = str(path.resolve())

    language_counts: dict[str, int] = {}
    intent_counts: dict[str, int] = {}
    for item in training_samples:
        if item.get("language"):
            language = str(item["language"])
            language_counts[language] = language_counts.get(language, 0) + 1
        intent = str(item["intent"])
        intent_counts[intent] = intent_counts.get(intent, 0) + 1

    dataset_version = (
        "aria_multilingual_18k_v1"
        if path.resolve() == MULTILINGUAL_DATA_PATH.resolve()
        else "legacy_training_data"
    )
    return {
        "dataset_version": dataset_version,
        "training_data_file": relative_path,
        "training_data_sha256": hashlib.sha256(raw).hexdigest(),
        "training_samples": len(training_samples),
        "language_counts": language_counts,
        "intent_counts": intent_counts,
        "labels": sorted(intent_counts),
    }


def retrain_model(
    training_data_path: str | Path | None = None,
    *,
    promote: bool = True,
) -> str:
    """Train a model from the selected corpus.

    ``promote=False`` saves the candidate outside the service's active model
    directory. A candidate becomes active only after explicit promotion.
    """
    source_path = resolve_training_data_path(training_data_path)
    try:
        training_samples = json.loads(source_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise ValueError(f"Training data is not valid UTF-8 JSON: {source_path}") from error
    if not isinstance(training_samples, list) or not training_samples:
        raise ValueError("Training data must be a non-empty JSON array.")

    texts, labels = [], []
    for row_number, item in enumerate(training_samples, start=1):
        if not isinstance(item, dict) or not isinstance(item.get("text"), str) or not item["text"].strip():
            raise ValueError(f"Training row {row_number} has no non-empty text.")
        if item.get("intent") not in SUPPORTED_INTENTS:
            raise ValueError(f"Training row {row_number} has an unsupported intent.")
        texts.append(item["text"])
        labels.append(item["intent"])

    if set(labels) != SUPPORTED_INTENTS:
        raise ValueError("Training data must contain all six supported intents.")

    version = f"v{_next_version()}"
    output_directory = MODELS_DIR if promote else CANDIDATE_DIR
    output_directory.mkdir(parents=True, exist_ok=True)
    output_path = output_directory / f"intent_classifier_{version}.pkl"

    pipeline = build_intent_pipeline()
    pipeline.fit(texts, labels)
    metadata = {
        "model": pipeline,
        "version": version,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "sklearn_version": sklearn.__version__,
        "train_fit_accuracy": float(pipeline.score(texts, labels)),
        **_data_metadata(source_path, training_samples),
    }
    temporary_path = output_path.with_suffix(".pkl.tmp")
    joblib.dump(metadata, temporary_path)
    temporary_path.replace(output_path)
    location = "active models" if promote else "staged candidates"
    print(f"Trained {version} from {len(texts)} rows; saved to {location}: {output_path}")
    return version


def promote_candidate(candidate_path: str | Path) -> str:
    """Copy one evaluated candidate into the active model directory."""
    source = Path(candidate_path).expanduser().resolve()
    if not source.is_file() or source.parent != CANDIDATE_DIR.resolve():
        raise ValueError("Candidate must be a model file inside the configured candidates directory.")
    metadata = joblib.load(source)
    model = metadata.get("model") if isinstance(metadata, dict) else None
    if model is None or not callable(getattr(model, "predict_proba", None)):
        raise ValueError("Candidate does not contain a probability-capable classifier.")
    if set(metadata.get("labels", [])) != SUPPORTED_INTENTS:
        raise ValueError("Candidate does not contain all six supported intents.")
    if metadata.get("sklearn_version") != sklearn.__version__:
        raise ValueError("Candidate scikit-learn version differs from the current runtime.")

    source_version = MODEL_FILE_PATTERN.fullmatch(source.name)
    active_versions = [
        int(match.group(1))
        for path in MODELS_DIR.glob("intent_classifier_v*.pkl")
        if (match := MODEL_FILE_PATTERN.fullmatch(path.name))
    ] if MODELS_DIR.exists() else []
    candidate_version = int(source_version.group(1)) if source_version else 0
    version = f"v{candidate_version if candidate_version > max(active_versions, default=0) else max(active_versions, default=0) + 1}"
    promoted = dict(metadata)
    promoted["version"] = version
    promoted["promoted_at"] = datetime.now(timezone.utc).isoformat()
    promoted["promoted_from"] = source.name
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    target = MODELS_DIR / f"intent_classifier_{version}.pkl"
    temporary = target.with_suffix(".pkl.tmp")
    joblib.dump(promoted, temporary)
    temporary.replace(target)
    print(f"Promoted evaluated candidate to active model {version}: {target}")
    return version


if __name__ == "__main__":
    retrain_model()
