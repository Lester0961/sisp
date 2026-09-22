"""Evaluate ARIA intents with semantic-grouped multilingual holdouts.

The generated corpus is not native-speaker reviewed. Reports label the split as
synthetic and must not be presented as measured real-student language quality.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any

import joblib
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support

from app.ml.intent_pipeline import build_intent_pipeline


APP_DIR = Path(__file__).resolve().parents[1]
TRAINING_PATH = APP_DIR / "data" / "training" / "training_multilingual.json"
BASELINE_PATH = APP_DIR / "data" / "training_data.json"
BASELINE_EVALUATION_PATH = APP_DIR / "data" / "classifier_evaluation.json"
ENGLISH_VALIDATION_PATH = APP_DIR / "data" / "validation" / "aria_english_validation.json"
ENGLISH_TEST_PATH = APP_DIR / "data" / "test" / "aria_english_test.json"
INTENTS = (
    "enrollment_inquiry",
    "grade_inquiry",
    "payment_inquiry",
    "document_request",
    "general_inquiry",
    "curriculum_inquiry",
)
LANGUAGES = ("en", "fil", "ceb", "ilo", "hil", "war")


def normalize_text(text: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", text).casefold().split())


def _find(row_ids: dict[str, str], item: str) -> str:
    row_ids.setdefault(item, item)
    while row_ids[item] != item:
        row_ids[item] = row_ids[row_ids[item]]
        item = row_ids[item]
    return item


def _union(row_ids: dict[str, str], first: str, second: str) -> None:
    left, right = _find(row_ids, first), _find(row_ids, second)
    if left != right:
        row_ids[max(left, right)] = min(left, right)


def split_by_semantic_group(rows: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    """Make deterministic 70/15/15 splits without semantic or exact-text leakage."""
    parent: dict[str, str] = {}
    previous_by_text: dict[str, str] = {}
    intent_by_semantic: dict[str, str] = {}
    rows_by_semantic: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for row in rows:
        semantic_id = str(row["semantic_id"])
        intent = str(row["intent"])
        prior_intent = intent_by_semantic.setdefault(semantic_id, intent)
        if prior_intent != intent:
            raise ValueError(f"semantic ID is assigned to multiple intents: {semantic_id}")
        _find(parent, semantic_id)
        text_key = normalize_text(str(row["text"]))
        previous = previous_by_text.setdefault(text_key, semantic_id)
        _union(parent, semantic_id, previous)
        rows_by_semantic[semantic_id].append(row)

    components: dict[str, list[str]] = defaultdict(list)
    for semantic_id in rows_by_semantic:
        components[_find(parent, semantic_id)].append(semantic_id)

    split_names = {"train": [], "validation": [], "test": []}
    for root, semantic_ids in components.items():
        component_intents = {intent_by_semantic[semantic_id] for semantic_id in semantic_ids}
        if len(component_intents) != 1:
            raise ValueError(f"exactly repeated text crosses intent labels in semantic group {root}")
        digest = int(hashlib.sha256("|".join(sorted(semantic_ids)).encode("utf-8")).hexdigest()[:8], 16) % 100
        name = "train" if digest < 70 else "validation" if digest < 85 else "test"
        split_names[name].extend(semantic_ids)

    result = {
        name: [row for semantic_id in ids for row in rows_by_semantic[semantic_id]]
        for name, ids in split_names.items()
    }
    for left_name, right_name in (("train", "validation"), ("train", "test"), ("validation", "test")):
        left = {normalize_text(row["text"]) for row in result[left_name]}
        right = {normalize_text(row["text"]) for row in result[right_name]}
        if left & right:
            raise ValueError(f"normalized-text overlap between {left_name} and {right_name}")
    return result


def _metrics(rows: list[dict[str, Any]], predictions: list[str]) -> dict[str, Any]:
    expected = [str(row["intent"]) for row in rows]
    labels = list(INTENTS)
    precision, recall, f1, support = precision_recall_fscore_support(
        expected, predictions, labels=labels, zero_division=0
    )
    matrix = confusion_matrix(expected, predictions, labels=labels)
    return {
        "rows": len(rows),
        "accuracy": float(accuracy_score(expected, predictions)) if rows else 0.0,
        "macro_precision": float(precision.mean()) if len(precision) else 0.0,
        "macro_recall": float(recall.mean()) if len(recall) else 0.0,
        "macro_f1": float(f1.mean()) if len(f1) else 0.0,
        "labels": labels,
        "confusion_matrix": matrix.tolist(),
        "per_intent": {
            label: {
                "precision": float(precision[index]),
                "recall": float(recall[index]),
                "f1": float(f1[index]),
                "support": int(support[index]),
            }
            for index, label in enumerate(labels)
        },
    }


def evaluate_rows(model, rows: list[dict[str, Any]]) -> tuple[dict[str, Any], list[list[float]]]:
    texts = [str(row["text"]) for row in rows]
    probabilities = model.predict_proba(texts)
    predictions = model.classes_[probabilities.argmax(axis=1)].tolist()
    return _metrics(rows, predictions), probabilities.tolist()


def per_language_metrics(rows: list[dict[str, Any]], predictions: list[str]) -> dict[str, Any]:
    result = {}
    for language in LANGUAGES:
        indexed = [index for index, row in enumerate(rows) if row["language"] == language]
        result[language] = _metrics([rows[index] for index in indexed], [predictions[index] for index in indexed])
    return result


def tune_thresholds(rows: list[dict[str, Any]], probabilities: list[list[float]]) -> dict[str, Any]:
    if not rows:
        raise ValueError("validation split is empty")
    class_order = sorted(INTENTS)
    margins = []
    confidences = []
    top_predictions = []
    for probability_row in probabilities:
        ranked = sorted(range(len(probability_row)), key=lambda index: probability_row[index], reverse=True)
        confidences.append(float(probability_row[ranked[0]]))
        margins.append(float(probability_row[ranked[0]] - probability_row[ranked[1]]))
        top_predictions.append(class_order[ranked[0]])

    candidates = []
    for confidence_threshold in (0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80):
        for margin_threshold in (0.0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30):
            accepted = [
                index for index, (confidence, margin) in enumerate(zip(confidences, margins))
                if confidence >= confidence_threshold and margin >= margin_threshold
            ]
            coverage = len(accepted) / len(rows)
            if coverage < 0.80:
                continue
            accepted_rows = [rows[index] for index in accepted]
            accepted_predictions = [top_predictions[index] for index in accepted]
            score = _metrics(accepted_rows, accepted_predictions)
            candidates.append({
                "confidence_threshold": confidence_threshold,
                "margin_threshold": margin_threshold,
                "coverage": coverage,
                "clarification_rate": 1.0 - coverage,
                "selective_accuracy": score["accuracy"],
                "selective_macro_f1": score["macro_f1"],
            })
    candidates.sort(
        key=lambda item: (
            item["selective_macro_f1"],
            item["selective_accuracy"],
            item["coverage"],
        ),
        reverse=True,
    )
    return {
        "criterion": "highest selective macro-F1 with at least 80% coverage on synthetic validation split",
        "recommended": candidates[0] if candidates else None,
        "top_candidates": candidates[:10],
    }


def _load_json(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, dict):
        data = data.get("records")
    if not isinstance(data, list):
        raise ValueError(f"Expected a JSON array or an object with a records array at {path}")
    if any(not isinstance(row, dict) or not isinstance(row.get("text"), str) or not row.get("intent") for row in data):
        raise ValueError(f"Dataset rows must contain text and intent fields: {path}")
    return data


def evaluate_candidate(candidate_path: Path) -> dict[str, Any]:
    """Score a staged full-corpus model only on the package's untouched English holdouts."""
    candidate_path = candidate_path.expanduser().resolve()
    metadata = joblib.load(candidate_path)
    model = metadata.get("model") if isinstance(metadata, dict) else None
    if model is None or not callable(getattr(model, "predict_proba", None)):
        raise ValueError("Candidate does not contain a probability-capable classifier.")

    recorded_training_path = metadata.get("training_data_file")
    if not recorded_training_path:
        raise ValueError("Candidate metadata does not record its training dataset.")
    training_path = Path(recorded_training_path)
    if not training_path.is_absolute():
        training_path = APP_DIR / training_path
    if not training_path.is_file():
        raise FileNotFoundError(f"Candidate training dataset is missing: {training_path}")
    training_bytes = training_path.read_bytes()
    training_hash = hashlib.sha256(training_bytes).hexdigest()
    if training_hash != metadata.get("training_data_sha256"):
        raise ValueError("Candidate training dataset hash does not match its saved metadata.")
    training_rows = json.loads(training_bytes.decode("utf-8"))
    if not isinstance(training_rows, list):
        raise ValueError("Candidate training dataset must be a JSON array.")

    holdouts = {
        "validation": _load_json(ENGLISH_VALIDATION_PATH),
        "test": _load_json(ENGLISH_TEST_PATH),
    }
    train_texts = {normalize_text(row["text"]) for row in training_rows}
    validation_texts = {normalize_text(row["text"]) for row in holdouts["validation"]}
    test_texts = {normalize_text(row["text"]) for row in holdouts["test"]}
    if train_texts & validation_texts or train_texts & test_texts:
        raise ValueError("Candidate training examples overlap with the package English holdouts.")
    if validation_texts & test_texts:
        raise ValueError("Package English validation and test sets overlap.")

    return {
        "model_version": metadata.get("version", candidate_path.stem),
        "dataset_version": metadata.get("dataset_version"),
        "training_samples": len(training_rows),
        "training_data_sha256": training_hash,
        "validation": evaluate_rows(model, holdouts["validation"])[0],
        "test": evaluate_rows(model, holdouts["test"])[0],
        "note": "The 600-row English test set is external to the 18K training corpus. Regional language package quality still needs native-speaker review.",
    }


def evaluate(
    training_path: Path = TRAINING_PATH,
    report_path: Path | None = None,
    candidate_path: Path | None = None,
) -> dict[str, Any]:
    multilingual = _load_json(training_path)
    if len(multilingual) != 18000:
        raise ValueError(f"Expected 18,000 multilingual training rows, found {len(multilingual)}")
    splits = split_by_semantic_group(multilingual)
    train_rows, validation_rows, test_rows = splits["train"], splits["validation"], splits["test"]
    if not train_rows or not validation_rows or not test_rows:
        raise ValueError("Semantic-group split must have non-empty train, validation and test partitions")

    baseline_rows = _load_json(BASELINE_PATH)
    baseline_eval = _load_json(BASELINE_EVALUATION_PATH)
    if {normalize_text(row["text"]) for row in baseline_rows} & {normalize_text(row["text"]) for row in baseline_eval}:
        raise ValueError("Legacy evaluation examples overlap with the 109-row baseline training set")
    baseline_model = build_intent_pipeline().fit(
        [row["text"] for row in baseline_rows], [row["intent"] for row in baseline_rows]
    )
    baseline_metrics, _ = evaluate_rows(baseline_model, baseline_eval)

    legacy_overlap = {normalize_text(row["text"]) for row in multilingual} & {
        normalize_text(row["text"]) for row in baseline_eval
    }
    if legacy_overlap:
        raise ValueError("Legacy evaluation examples overlap with the multilingual training corpus")

    model = build_intent_pipeline().fit(
        [row["text"] for row in train_rows], [row["intent"] for row in train_rows]
    )
    validation_metrics, validation_probabilities = evaluate_rows(model, validation_rows)
    test_metrics, test_probabilities = evaluate_rows(model, test_rows)
    tune_report = tune_thresholds(validation_rows, validation_probabilities)

    test_predictions = [
        model.classes_[row.index(max(row))]
        for row in test_probabilities
    ]
    report = {
        "dataset_version": "aria_multilingual_18k_v1",
        "evaluation_note": "All non-English holdouts are generated semantic-group splits and are not native-speaker reviewed.",
        "split_method": "deterministic 70/15/15 split by semantic ID, with exact normalized text duplicates joined to one group",
        "split_counts": {name: len(rows) for name, rows in splits.items()},
        "baseline_109_on_legacy_22": baseline_metrics,
        "multilingual_holdout_model_on_legacy_22": evaluate_rows(model, baseline_eval)[0],
        "multilingual_group_validation": {
            "overall": validation_metrics,
            "by_language": per_language_metrics(
                validation_rows,
                [model.classes_[row.index(max(row))] for row in validation_probabilities],
            ),
            "threshold_tuning": tune_report,
        },
        "multilingual_group_test": {
            "overall": test_metrics,
            "by_language": per_language_metrics(test_rows, test_predictions),
        },
    }

    if ENGLISH_VALIDATION_PATH.exists():
        english_validation = _load_json(ENGLISH_VALIDATION_PATH)
        report["package_english_validation"] = evaluate_rows(model, english_validation)[0]
    if ENGLISH_TEST_PATH.exists():
        english_test = _load_json(ENGLISH_TEST_PATH)
        report["package_english_test"] = evaluate_rows(model, english_test)[0]
    if candidate_path:
        report["candidate_evaluation"] = evaluate_candidate(candidate_path)

    if report_path:
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--training-data", type=Path, default=TRAINING_PATH)
    parser.add_argument("--report", type=Path, default=APP_DIR / "data" / "evaluation_results" / "multilingual_classifier_metrics.json")
    parser.add_argument("--candidate", type=Path, help="evaluate a staged full-corpus candidate against the separate English holdouts")
    arguments = parser.parse_args()
    report = evaluate(arguments.training_data, arguments.report, arguments.candidate)
    print(json.dumps({
        "split_counts": report["split_counts"],
        "baseline_accuracy": report["baseline_109_on_legacy_22"]["accuracy"],
        "group_validation_accuracy": report["multilingual_group_validation"]["overall"]["accuracy"],
        "group_test_accuracy": report["multilingual_group_test"]["overall"]["accuracy"],
        "thresholds": report["multilingual_group_validation"]["threshold_tuning"]["recommended"],
        "english_test_accuracy": report.get("package_english_test", {}).get("accuracy"),
        "candidate_english_test_accuracy": report.get("candidate_evaluation", {}).get("test", {}).get("accuracy"),
        "report": str(arguments.report),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
