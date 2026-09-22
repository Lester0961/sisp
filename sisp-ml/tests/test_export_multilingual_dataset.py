import os
import sys

import pytest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.ml.export_multilingual_dataset import (  # noqa: E402
    DatasetValidationError,
    INTENTS,
    HOLDOUT_MEMBER,
    parse_master_markdown,
    parse_holdout_markdown,
    validate_records,
    validate_holdout_records,
)


def _master(language: str, row_id: str, utterance: str, split_row: str = "") -> str:
    return f"""# ARIA Master Training Dataset — 1 Utterances

**Language code:** `{language}`
**Total:** **1 training utterances**
{split_row}
### `enrollment_inquiry` — 1 rows

| ID | Semantic ID | Scenario | Style | Difficulty | Contrast With | Utterance |
|---|---|---|---|---|---|---|
| `{row_id}` | `ENROLL-ALIGNED-001` | `enrollment_procedure` | `neutral` | `easy` | `—` | {utterance} |
"""


def test_parser_preserves_rich_fields_and_unescapes_table_pipe():
    markdown = _master(
        "en",
        "ENROLL-EN-0001",
        r"Could you help\| please?",
        "| Split | Training only |",
    )

    rows, metadata = parse_master_markdown(
        markdown,
        "final_working_set/ARIA_English_Master_3000_Training_Dataset.md",
    )

    assert len(rows) == 1
    assert rows[0] == {
        "id": "ENROLL-EN-0001",
        "semantic_id": "ENROLL-ALIGNED-001",
        "text": "Could you help| please?",
        "intent": "enrollment_inquiry",
        "language": "en",
        "scenario": "enrollment_procedure",
        "style": "neutral",
        "difficulty": "easy",
        "contrast_with": None,
        "source": "final_working_set/ARIA_English_Master_3000_Training_Dataset.md",
        "split": "train",
        "split_provenance": "explicit_source_metadata",
    }
    assert metadata["language"] == "en"


def test_parser_marks_training_split_as_inferred_when_source_omits_split_table():
    rows, metadata = parse_master_markdown(
        _master("fil", "ENROLL-FIL-0001", "Paano mag-enroll?"),
        "final_working_set/ARIA_FIL_Filipino_Taglish_Master_3000.md",
    )

    assert rows[0]["split"] == "train"
    assert rows[0]["split_provenance"] == (
        "inferred_from_training_dataset_title_and_training_total"
    )
    assert metadata["split_provenance"] == rows[0]["split_provenance"]


def test_parser_rejects_non_allowlisted_archive_member():
    with pytest.raises(DatasetValidationError, match="not allowlisted"):
        parse_master_markdown("anything", "old_archive/history.md")


def test_validator_accepts_cross_language_semantic_alignment():
    en, _ = parse_master_markdown(
        _master("en", "ENROLL-EN-0001", "How do I enroll?", "| Split | Training only |"),
        "final_working_set/ARIA_English_Master_3000_Training_Dataset.md",
    )
    fil, _ = parse_master_markdown(
        _master("fil", "ENROLL-FIL-0001", "Paano ako mag-enroll?"),
        "final_working_set/ARIA_FIL_Filipino_Taglish_Master_3000.md",
    )

    report = validate_records(
        en + fil,
        expected_languages=("en", "fil"),
        expected_intents=("enrollment_inquiry",),
        rows_per_intent_language=1,
    )

    assert report["total_rows"] == 2
    assert report["semantic_id_sets_aligned_across_languages"] is True
    assert report["semantic_ids_shared_across_languages_by_design"] is True
    assert report["unique_semantic_ids_per_language"] == {"en": 1, "fil": 1}


def test_validator_rejects_normalized_text_duplicates_within_language():
    row = {
        "id": "ENROLL-EN-0001",
        "semantic_id": "SEM-001",
        "text": "How do I enroll?",
        "intent": "enrollment_inquiry",
        "language": "en",
        "source": "fixture.md",
        "split": "train",
    }
    duplicate = {**row, "id": "ENROLL-EN-0002", "semantic_id": "SEM-002", "text": "  HOW DO I ENROLL?  "}

    with pytest.raises(DatasetValidationError, match="duplicate normalized text"):
        validate_records(
            (row, duplicate),
            expected_languages=("en",),
            expected_intents=("enrollment_inquiry",),
            rows_per_intent_language=2,
        )


def test_validator_rejects_imbalanced_intent_language_group():
    row = {
        "id": "ENROLL-EN-0001",
        "semantic_id": "SEM-001",
        "text": "How do I enroll?",
        "intent": "enrollment_inquiry",
        "language": "en",
        "source": "fixture.md",
        "split": "train",
    }

    with pytest.raises(DatasetValidationError, match="expected 2 rows, found 1"):
        validate_records(
            (row,),
            expected_languages=("en",),
            expected_intents=("enrollment_inquiry",),
            rows_per_intent_language=2,
        )


def _holdout_fixture() -> str:
    lines = ["# ARIA English Validation and Test Dataset"]
    for split, heading_number in (("validation", 5), ("test", 6)):
        title = "Validation Dataset" if split == "validation" else "Final English Test Dataset"
        lines.extend(
            [
                "",
                f"## {heading_number}. {title} — {len(INTENTS)} Rows",
                "",
                "| ID | Intent | Scenario | Utterance |",
                "|---|---|---|---|",
            ]
        )
        prefix = "VAL" if split == "validation" else "TEST"
        for index, intent in enumerate(INTENTS, start=1):
            lines.append(
                f"| `{prefix}-{index:03d}` | `{intent}` | `fixture` | "
                f"Unique {split} wording for {intent}. |"
            )
    return "\n".join(lines)


def test_holdout_parser_keeps_validation_and_test_in_distinct_splits():
    parsed = parse_holdout_markdown(_holdout_fixture(), HOLDOUT_MEMBER)

    assert len(parsed["validation"]["records"]) == len(INTENTS)
    assert len(parsed["test"]["records"]) == len(INTENTS)
    assert parsed["validation"]["declared_rows"] == len(INTENTS)
    assert all(row["split"] == "validation" for row in parsed["validation"]["records"])
    assert all(row["split"] == "test" for row in parsed["test"]["records"])
    assert all(row["language"] == "en" for row in parsed["test"]["records"])


def test_holdout_parser_rejects_an_unapproved_source_member():
    with pytest.raises(DatasetValidationError, match="not allowlisted"):
        parse_holdout_markdown(_holdout_fixture(), "archive/old_test_data.md")


def test_holdout_validator_accepts_balanced_disjoint_sets_without_train_overlap():
    parsed = parse_holdout_markdown(_holdout_fixture())
    report = validate_holdout_records(
        parsed["validation"]["records"],
        parsed["test"]["records"],
        ("A training utterance outside the holdout fixture.",),
        validation_rows_per_intent=1,
        test_rows_per_intent=1,
    )

    assert report["validation"]["row_count"] == len(INTENTS)
    assert report["test"]["row_count"] == len(INTENTS)
    assert report["holdout_splits_are_disjoint"] is True
    assert report["validation"]["normalized_training_overlap"] == 0
    assert report["test"]["normalized_training_overlap"] == 0


def test_holdout_validator_rejects_text_overlap_with_training():
    parsed = parse_holdout_markdown(_holdout_fixture())
    first_text = parsed["validation"]["records"][0]["text"]

    with pytest.raises(DatasetValidationError, match="found in training"):
        validate_holdout_records(
            parsed["validation"]["records"],
            parsed["test"]["records"],
            (first_text,),
            validation_rows_per_intent=1,
            test_rows_per_intent=1,
        )
