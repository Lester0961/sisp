"""Measure local fallback retrieval against a small labeled query set.

This does not claim production pgvector or institutional source approval. Run
with: python -m app.ml.evaluate_retrieval
"""

import json
from pathlib import Path

from app.config import get_settings
from app.services.retrieval_service import retrieval_service


APP_DIR = Path(__file__).resolve().parents[1]
EVALUATION_PATH = APP_DIR / "data" / "retrieval_evaluation.json"


def evaluate() -> dict:
    with EVALUATION_PATH.open(encoding="utf-8") as handle:
        cases = json.load(handle)

    settings = get_settings()
    threshold = settings.retrieval_similarity_threshold
    settings.retrieval_similarity_threshold = 0.0
    # Capture candidate top scores before production filtering so this report
    # can show the separation achieved by the configured threshold.
    results = []
    for case in cases:
        matches = retrieval_service.retrieve(case["text"], limit=3)
        top = matches[0] if matches else None
        relevant = [item for item in matches if item["source"] in case["expected_sources"]]
        relevant_top = max(relevant, key=lambda item: item["similarity"], default=None)
        source_hit = bool(relevant_top and relevant_top["similarity"] >= threshold)
        results.append({
            "text": case["text"],
            "expected_sources": case["expected_sources"],
            "top_source": top["source"] if top else None,
            "top_similarity": float(top["similarity"]) if top else None,
            "relevant_source_similarity": float(relevant_top["similarity"]) if relevant_top else None,
            "source_hit": source_hit,
            "supported": bool(case["expected_sources"]),
        })
    settings.retrieval_similarity_threshold = threshold

    supported = [item for item in results if item["supported"]]
    unsupported = [item for item in results if not item["supported"]]
    true_positive = sum(item["source_hit"] for item in supported)
    false_positive = sum(
        item["top_similarity"] is not None
        and item["top_similarity"] >= threshold
        for item in unsupported
    )
    return {
        "retrieval_mode": "local fallback (no database configured)",
        "configured_threshold": threshold,
        "supported_cases": len(supported),
        "supported_source_hits": true_positive,
        "unsupported_cases": len(unsupported),
        "unsupported_above_threshold": false_positive,
        "cases": results,
    }


if __name__ == "__main__":
    print(json.dumps(evaluate(), indent=2, ensure_ascii=False))
