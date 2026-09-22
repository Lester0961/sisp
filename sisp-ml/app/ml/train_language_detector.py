"""Evaluate and build the versioned six-language ARIA detector artifact."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import joblib
import sklearn
from sklearn.metrics import accuracy_score, confusion_matrix

from app.ml.evaluate_multilingual_classifier import split_by_semantic_group
from app.ml.language_pipeline import build_language_pipeline


APP_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DATA = APP_DIR / "data" / "training" / "training_multilingual.json"
DEFAULT_MODEL = APP_DIR / "ml" / "models" / "language_detector_v1.pkl"
DEFAULT_REPORT = APP_DIR / "data" / "evaluation_results" / "language_detector_metrics.json"
LANGUAGES = ("en", "fil", "ceb", "ilo", "hil", "war")


def _read_rows(path: Path) -> list[dict]:
    rows = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(rows, list) or len(rows) != 18_000:
        raise ValueError("Expected the verified 18,000-row multilingual JSON training corpus.")
    if any(
        not isinstance(row, dict)
        or not isinstance(row.get("text"), str)
        or not row["text"].strip()
        or row.get("language") not in LANGUAGES
        or not row.get("semantic_id")
        or not row.get("intent")
        for row in rows
    ):
        raise ValueError("Every row must contain text, a supported language, semantic_id, and intent.")
    counts = {language: sum(row["language"] == language for row in rows) for language in LANGUAGES}
    if any(count != 3_000 for count in counts.values()):
        raise ValueError(f"Expected 3,000 rows per supported language; found {counts}.")
    return rows


def _metrics(model, rows: list[dict]) -> dict:
    texts = [row["text"] for row in rows]
    expected = [row["language"] for row in rows]
    predicted = model.predict(texts).tolist()
    return {
        "rows": len(rows),
        "accuracy": float(accuracy_score(expected, predicted)),
        "by_language": {
            language: {
                "rows": sum(label == language for label in expected),
                "accuracy": float(
                    accuracy_score(
                        [label for label in expected if label == language],
                        [guess for label, guess in zip(expected, predicted) if label == language],
                    )
                ),
            }
            for language in LANGUAGES
        },
        "labels": list(LANGUAGES),
        "confusion_matrix": confusion_matrix(
            expected,
            predicted,
            labels=list(LANGUAGES),
        ).tolist(),
    }


def train(
    data_path: str | Path = DEFAULT_DATA,
    model_path: str | Path = DEFAULT_MODEL,
    report_path: str | Path = DEFAULT_REPORT,
) -> dict:
    data_path = Path(data_path).expanduser().resolve()
    model_path = Path(model_path).expanduser().resolve()
    report_path = Path(report_path).expanduser().resolve()
    rows = _read_rows(data_path)

    partitions = split_by_semantic_group(rows)
    train_rows = partitions["train"]
    test_rows = partitions["test"]
    evaluated_model = build_language_pipeline()
    evaluated_model.fit(
        [row["text"] for row in train_rows],
        [row["language"] for row in train_rows],
    )
    heldout = _metrics(evaluated_model, test_rows)
    heldout["note"] = (
        "Semantic-group holdout from the supplied generated multilingual corpus. "
        "Non-English text has not been reviewed by native speakers, so these scores "
        "are diagnostic and do not certify real-world dialect accuracy."
    )
    report = {
        "dataset_version": "aria_multilingual_18k_v1",
        "split_method": "deterministic semantic-group split; translations and repeated text stay in one partition",
        "split_counts": {name: len(part) for name, part in partitions.items()},
        "heldout_test": heldout,
    }

    final_model = build_language_pipeline()
    final_model.fit([row["text"] for row in rows], [row["language"] for row in rows])
    metadata = {
        "model": final_model,
        "version": "v1",
        "sklearn_version": sklearn.__version__,
        "dataset_version": "aria_multilingual_18k_v1",
        "training_data_file": data_path.name,
        "training_data_sha256": hashlib.sha256(data_path.read_bytes()).hexdigest(),
        "training_samples": len(rows),
        "labels": list(LANGUAGES),
        "heldout_evaluation": heldout,
    }
    model_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_model_path = model_path.with_suffix(model_path.suffix + ".tmp")
    joblib.dump(metadata, temporary_model_path)
    temporary_model_path.replace(model_path)

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {**report, "model_path": str(model_path), "report_path": str(report_path)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    args = parser.parse_args()
    result = train(args.data, args.model, args.report)
    test = result["heldout_test"]
    print(json.dumps({
        "dataset_version": result["dataset_version"],
        "split_counts": result["split_counts"],
        "heldout_test_rows": test["rows"],
        "heldout_test_accuracy": round(test["accuracy"], 4),
        "by_language_accuracy": {
            code: round(stats["accuracy"], 4)
            for code, stats in test["by_language"].items()
        },
        "model_path": result["model_path"],
        "report_path": result["report_path"],
        "native_speaker_review_required": True,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
