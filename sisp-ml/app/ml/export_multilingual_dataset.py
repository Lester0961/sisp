"""Export the six approved ARIA multilingual master files to validated JSON.

The ZIP is treated as data only. This exporter reads exactly six allowlisted
Markdown members in memory and never extracts archive contents to disk.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable


MASTER_MEMBERS: dict[str, str] = {
    "final_working_set/ARIA_English_Master_3000_Training_Dataset.md": "en",
    "final_working_set/ARIA_FIL_Filipino_Taglish_Master_3000.md": "fil",
    "final_working_set/ARIA_CEB_Cebuano_Bisaya_Master_3000.md": "ceb",
    "final_working_set/ARIA_ILO_Ilocano_Master_3000.md": "ilo",
    "final_working_set/ARIA_HIL_Hiligaynon_Ilonggo_Master_3000.md": "hil",
    "final_working_set/ARIA_WAR_Waray_Master_3000.md": "war",
}
INTENTS = (
    "enrollment_inquiry",
    "grade_inquiry",
    "payment_inquiry",
    "document_request",
    "general_inquiry",
    "curriculum_inquiry",
)
ROWS_PER_INTENT_LANGUAGE = 500
EXPECTED_TOTAL = len(MASTER_MEMBERS) * len(INTENTS) * ROWS_PER_INTENT_LANGUAGE
MAX_MEMBER_BYTES = 2_000_000
MAX_TOTAL_MEMBER_BYTES = 10_000_000

HOLDOUT_MEMBER = "final_working_set/ARIA_English_Validation_Test_and_Evaluation.md"
HOLDOUT_TABLE_HEADER = ("id", "intent", "scenario", "utterance")
EXPECTED_TRAINING_OVERLAP_ROWS = EXPECTED_TOTAL

TABLE_HEADER = (
    "id",
    "semantic id",
    "scenario",
    "style",
    "difficulty",
    "contrast with",
    "utterance",
)
INTENT_HEADING = re.compile(r"^###\s+`([^`]+)`\s+[—–-]\s+\d+\s+rows\s*$")
LANGUAGE_METADATA = re.compile(
    r"\*\*Language(?: code)?\s*:\*\*.*?`([a-z]{2,3})`", re.IGNORECASE
)
VALIDATION_HEADING = re.compile(
    r"^##\s+5\.\s+Validation Dataset\s+[—–-]\s+(\d+)\s+Rows\s*$"
)
TEST_HEADING = re.compile(
    r"^##\s+6\.\s+Final English Test Dataset\s+[—–-]\s+(\d+)\s+Rows\s*$"
)


class DatasetValidationError(ValueError):
    """Raised when a source or exported corpus fails structural validation."""


def _split_markdown_row(line: str) -> list[str]:
    """Split a Markdown table row without treating escaped/code pipes as delimiters."""
    row = line.strip()
    if not row.startswith("|"):
        raise DatasetValidationError("table row does not start with '|' ")

    cells: list[str] = []
    current: list[str] = []
    in_code = False
    index = 1
    while index < len(row):
        char = row[index]
        if char == "\\" and index + 1 < len(row) and row[index + 1] == "|":
            current.append("|")
            index += 2
            continue
        if char == "`":
            in_code = not in_code
            current.append(char)
        elif char == "|" and not in_code:
            cells.append("".join(current).strip())
            current = []
        else:
            current.append(char)
        index += 1

    if current or row.endswith("|"):
        cells.append("".join(current).strip())
    if cells and cells[-1] == "":
        cells.pop()
    return cells


def _cell_value(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value.startswith("`") and value.endswith("`"):
        value = value[1:-1]
    return value.strip()


def normalize_text(text: str) -> str:
    """Normalization used only for duplicate detection (NFKC, casefold, spaces)."""
    return " ".join(unicodedata.normalize("NFKC", text).casefold().split())


def _language_from_metadata(markdown: str, member_name: str) -> str:
    match = LANGUAGE_METADATA.search(markdown)
    if not match:
        raise DatasetValidationError(f"{member_name}: missing language metadata")
    language = match.group(1).lower()
    expected = MASTER_MEMBERS[member_name]
    if language != expected:
        raise DatasetValidationError(
            f"{member_name}: metadata language {language!r} does not match {expected!r}"
        )
    return language


def _split_provenance(markdown: str) -> str:
    if re.search(r"(?mi)^\|\s*Split\s*\|\s*Training only\s*\|\s*$", markdown):
        return "explicit_source_metadata"
    if re.search(r"(?mi)^#.*\btraining dataset\b", markdown) and re.search(
        r"(?mi)^\*\*Total:\*\*.*\btraining utterances\b", markdown
    ):
        return "inferred_from_training_dataset_title_and_training_total"
    raise DatasetValidationError("source does not establish a training-only split")


def parse_master_markdown(markdown: str, member_name: str) -> tuple[list[dict[str, Any]], dict[str, str]]:
    """Parse one allowlisted master file into rich, provenance-bearing rows."""
    if member_name not in MASTER_MEMBERS:
        raise DatasetValidationError(f"source member is not allowlisted: {member_name}")

    language = _language_from_metadata(markdown, member_name)
    split_provenance = _split_provenance(markdown)
    lines = markdown.splitlines()
    intent: str | None = None
    reading_records = False
    found_table = False
    records: list[dict[str, Any]] = []

    for line_number, line in enumerate(lines, start=1):
        heading = INTENT_HEADING.match(line.strip())
        if heading:
            intent = heading.group(1).strip()
            if intent not in INTENTS:
                raise DatasetValidationError(
                    f"{member_name}:{line_number}: unsupported intent {intent!r}"
                )
            reading_records = False
            continue

        if not line.lstrip().startswith("|"):
            if reading_records and line.strip():
                reading_records = False
            continue

        try:
            cells = _split_markdown_row(line)
        except DatasetValidationError:
            if reading_records:
                raise DatasetValidationError(
                    f"{member_name}:{line_number}: malformed record table row"
                )
            continue

        normalized_header = tuple(_cell_value(cell).casefold() for cell in cells)
        if normalized_header == TABLE_HEADER:
            if intent is None:
                raise DatasetValidationError(
                    f"{member_name}:{line_number}: record table has no intent heading"
                )
            found_table = True
            reading_records = True
            continue
        if not reading_records:
            continue
        if cells and all(re.fullmatch(r":?-{3,}:?", cell.replace(" ", "")) for cell in cells):
            continue

        if len(cells) != len(TABLE_HEADER):
            raise DatasetValidationError(
                f"{member_name}:{line_number}: expected 7 columns, found {len(cells)}"
            )
        values = [_cell_value(cell) for cell in cells]
        row_id, semantic_id, scenario, style, difficulty, contrast, utterance = values
        if not all((row_id, semantic_id, scenario, style, difficulty, utterance)):
            raise DatasetValidationError(
                f"{member_name}:{line_number}: required record field is empty"
            )
        normalized_contrast = contrast.strip().casefold()
        contrast_value = (
            None
            if normalized_contrast in {"", "—", "–", "-", "n/a", "none", "null"}
            else contrast
        )
        records.append(
            {
                "id": row_id,
                "semantic_id": semantic_id,
                "text": utterance,
                "intent": intent,
                "language": language,
                "scenario": scenario,
                "style": style,
                "difficulty": difficulty,
                "contrast_with": contrast_value,
                "source": member_name,
                "split": "train",
                "split_provenance": split_provenance,
            }
        )

    if not found_table:
        raise DatasetValidationError(f"{member_name}: no training-record tables found")
    return records, {"language": language, "split_provenance": split_provenance}


def validate_records(
    records: Iterable[dict[str, Any]],
    *,
    expected_languages: Iterable[str],
    expected_intents: Iterable[str] = INTENTS,
    rows_per_intent_language: int = ROWS_PER_INTENT_LANGUAGE,
) -> dict[str, Any]:
    """Validate row IDs, per-language semantic alignment, uniqueness and balance."""
    rows = list(records)
    languages = tuple(expected_languages)
    intents = tuple(expected_intents)
    if not rows:
        raise DatasetValidationError("dataset is empty")

    ids: set[str] = set()
    normalized_by_language: dict[str, set[str]] = defaultdict(set)
    semantic_by_language: dict[str, set[str]] = defaultdict(set)
    counts: Counter[tuple[str, str]] = Counter()
    for index, row in enumerate(rows, start=1):
        missing = [key for key in ("id", "semantic_id", "text", "intent", "language", "source", "split") if not row.get(key)]
        if missing:
            raise DatasetValidationError(f"row {index}: missing required fields {missing}")
        row_id = str(row["id"])
        if row_id in ids:
            raise DatasetValidationError(f"duplicate row id: {row_id}")
        ids.add(row_id)

        language = str(row["language"])
        intent = str(row["intent"])
        if language not in languages:
            raise DatasetValidationError(f"row {row_id}: unexpected language {language!r}")
        if intent not in intents:
            raise DatasetValidationError(f"row {row_id}: unexpected intent {intent!r}")
        if row["split"] != "train":
            raise DatasetValidationError(f"row {row_id}: non-training split in training export")

        normalized_text = normalize_text(str(row["text"]))
        if not normalized_text:
            raise DatasetValidationError(f"row {row_id}: text is empty after normalization")
        if normalized_text in normalized_by_language[language]:
            raise DatasetValidationError(
                f"duplicate normalized text in {language}: {row['text']!r}"
            )
        normalized_by_language[language].add(normalized_text)
        semantic_id = str(row["semantic_id"])
        if semantic_id in semantic_by_language[language]:
            raise DatasetValidationError(
                f"duplicate semantic id within {language}: {semantic_id}"
            )
        semantic_by_language[language].add(semantic_id)
        counts[(language, intent)] += 1

    expected_groups = {(language, intent) for language in languages for intent in intents}
    for language, intent in sorted(expected_groups):
        count = counts[(language, intent)]
        if count != rows_per_intent_language:
            raise DatasetValidationError(
                f"{language}/{intent}: expected {rows_per_intent_language} rows, found {count}"
            )
    unexpected_groups = set(counts) - expected_groups
    if unexpected_groups:
        raise DatasetValidationError(f"unexpected language/intent groups: {sorted(unexpected_groups)}")

    semantic_sets = [semantic_by_language[language] for language in languages]
    reference_semantics = semantic_sets[0]
    if any(semantic_ids != reference_semantics for semantic_ids in semantic_sets[1:]):
        raise DatasetValidationError("semantic ID sets are not aligned across languages")

    return {
        "total_rows": len(rows),
        "row_ids_unique": len(ids) == len(rows),
        "unique_semantic_ids_per_language": {
            language: len(semantic_by_language[language]) for language in languages
        },
        "semantic_id_sets_aligned_across_languages": True,
        "semantic_ids_shared_across_languages_by_design": True,
        "normalized_texts_unique_within_language": {
            language: len(normalized_by_language[language]) for language in languages
        },
        "rows_per_language_and_intent": {
            language: {intent: counts[(language, intent)] for intent in intents}
            for language in languages
        },
    }


def _read_approved_sources(archive_path: Path) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    with zipfile.ZipFile(archive_path, "r") as archive:
        infos_by_name: dict[str, list[zipfile.ZipInfo]] = defaultdict(list)
        for info in archive.infolist():
            if info.filename in MASTER_MEMBERS:
                infos_by_name[info.filename].append(info)

        missing = sorted(set(MASTER_MEMBERS) - set(infos_by_name))
        duplicates = sorted(name for name, infos in infos_by_name.items() if len(infos) != 1)
        if missing:
            raise DatasetValidationError(f"archive is missing approved master files: {missing}")
        if duplicates:
            raise DatasetValidationError(f"archive has duplicate approved member names: {duplicates}")

        total_uncompressed = 0
        records: list[dict[str, Any]] = []
        source_manifest: dict[str, dict[str, Any]] = {}
        for member_name, expected_language in MASTER_MEMBERS.items():
            info = infos_by_name[member_name][0]
            if info.flag_bits & 0x1:
                raise DatasetValidationError(f"encrypted archive member is not accepted: {member_name}")
            if info.file_size > MAX_MEMBER_BYTES:
                raise DatasetValidationError(f"archive member exceeds size limit: {member_name}")
            total_uncompressed += info.file_size
            if total_uncompressed > MAX_TOTAL_MEMBER_BYTES:
                raise DatasetValidationError("approved master files exceed total size limit")

            content = archive.read(info)
            if len(content) != info.file_size:
                raise DatasetValidationError(f"truncated archive member: {member_name}")
            source_hash = hashlib.sha256(content).hexdigest()
            try:
                markdown = content.decode("utf-8-sig")
            except UnicodeDecodeError as error:
                raise DatasetValidationError(f"{member_name}: source is not valid UTF-8") from error
            parsed_rows, metadata = parse_master_markdown(markdown, member_name)
            if metadata["language"] != expected_language:
                raise DatasetValidationError(f"{member_name}: language mapping mismatch")
            records.extend(parsed_rows)
            source_manifest[member_name] = {
                "language": expected_language,
                "bytes": len(content),
                "sha256": source_hash,
                "rows": len(parsed_rows),
                "split_provenance": metadata["split_provenance"],
            }
    return records, source_manifest


def _write_atomic(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_bytes(content)
    temporary.replace(path)


def export_archive(archive_path: Path, output_dir: Path) -> dict[str, Any]:
    """Validate the approved six sources and write rich JSONL, compact JSON, manifest."""
    archive_path = archive_path.resolve()
    if not archive_path.is_file():
        raise DatasetValidationError(f"archive does not exist: {archive_path}")
    records, source_manifest = _read_approved_sources(archive_path)
    validation = validate_records(records, expected_languages=MASTER_MEMBERS.values())
    if validation["total_rows"] != EXPECTED_TOTAL:
        raise DatasetValidationError(
            f"expected exactly {EXPECTED_TOTAL} rows, found {validation['total_rows']}"
        )

    jsonl_bytes = "".join(
        json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n" for row in records
    ).encode("utf-8")
    compact_json_bytes = (
        json.dumps(records, ensure_ascii=False, separators=(",", ":")) + "\n"
    ).encode("utf-8")
    manifest: dict[str, Any] = {
        "schema_version": 1,
        "dataset": "ARIA multilingual intent-classification training corpus",
        "archive_name": archive_path.name,
        "archive_sha256": hashlib.sha256(archive_path.read_bytes()).hexdigest(),
        "source_files": source_manifest,
        "validation": validation,
        "semantic_id_note": (
            "Semantic IDs are unique within each language and intentionally shared across languages "
            "to link aligned utterances. They are not globally unique row identifiers."
        ),
        "split_note": (
            "All exported rows are marked train. Where a source does not state the split explicitly, "
            "split_provenance records the inference from its training-dataset title and training total."
        ),
        "outputs": {
            "training_multilingual.jsonl": {
                "bytes": len(jsonl_bytes),
                "sha256": hashlib.sha256(jsonl_bytes).hexdigest(),
            },
            "training_multilingual.json": {
                "bytes": len(compact_json_bytes),
                "sha256": hashlib.sha256(compact_json_bytes).hexdigest(),
            },
        },
    }
    manifest_bytes = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")

    _write_atomic(output_dir / "training_multilingual.jsonl", jsonl_bytes)
    _write_atomic(output_dir / "training_multilingual.json", compact_json_bytes)
    _write_atomic(output_dir / "training_multilingual.manifest.json", manifest_bytes)
    return manifest


def parse_holdout_markdown(markdown: str, member_name: str = HOLDOUT_MEMBER) -> dict[str, dict[str, Any]]:
    """Parse only the validation and final-test tables from the approved holdout file."""
    if member_name != HOLDOUT_MEMBER:
        raise DatasetValidationError(f"holdout member is not allowlisted: {member_name}")

    lines = markdown.splitlines()
    section_specs = {
        "validation": VALIDATION_HEADING,
        "test": TEST_HEADING,
    }
    section_positions: dict[str, tuple[int, int]] = {}
    for index, line in enumerate(lines):
        for split, heading_pattern in section_specs.items():
            match = heading_pattern.match(line.strip())
            if match:
                if split in section_positions:
                    raise DatasetValidationError(f"duplicate {split} section in holdout source")
                section_positions[split] = (index, int(match.group(1)))

    missing_splits = set(section_specs) - set(section_positions)
    if missing_splits:
        raise DatasetValidationError(f"holdout source is missing sections: {sorted(missing_splits)}")

    parsed: dict[str, dict[str, Any]] = {}
    for split, (start_index, declared_rows) in section_positions.items():
        section_end = len(lines)
        for index in range(start_index + 1, len(lines)):
            if lines[index].startswith("## "):
                section_end = index
                break

        reading_records = False
        found_table = False
        records: list[dict[str, Any]] = []
        for line_number in range(start_index + 1, section_end):
            line = lines[line_number]
            if not line.lstrip().startswith("|"):
                if reading_records and line.strip():
                    reading_records = False
                continue
            try:
                cells = _split_markdown_row(line)
            except DatasetValidationError as error:
                if reading_records:
                    raise DatasetValidationError(
                        f"{member_name}:{line_number + 1}: malformed {split} table row"
                    ) from error
                continue

            header = tuple(_cell_value(cell).casefold() for cell in cells)
            if header == HOLDOUT_TABLE_HEADER:
                if found_table:
                    raise DatasetValidationError(f"multiple record tables found in {split} section")
                found_table = True
                reading_records = True
                continue
            if not reading_records:
                continue
            if cells and all(re.fullmatch(r":?-{3,}:?", cell.replace(" ", "")) for cell in cells):
                continue
            if len(cells) != len(HOLDOUT_TABLE_HEADER):
                raise DatasetValidationError(
                    f"{member_name}:{line_number + 1}: expected 4 {split} columns, found {len(cells)}"
                )
            row_id, intent, scenario, utterance = (_cell_value(cell) for cell in cells)
            if not all((row_id, intent, scenario, utterance)):
                raise DatasetValidationError(
                    f"{member_name}:{line_number + 1}: required {split} record field is empty"
                )
            if intent not in INTENTS:
                raise DatasetValidationError(
                    f"{member_name}:{line_number + 1}: unsupported intent {intent!r}"
                )
            records.append(
                {
                    "id": row_id,
                    "text": utterance,
                    "intent": intent,
                    "language": "en",
                    "scenario": scenario,
                    "source": member_name,
                    "split": split,
                }
            )

        if not found_table:
            raise DatasetValidationError(f"{member_name}: no {split} record table found")
        if len(records) != declared_rows:
            raise DatasetValidationError(
                f"{split}: heading declares {declared_rows} rows, table contains {len(records)}"
            )
        parsed[split] = {"declared_rows": declared_rows, "records": records}
    return parsed


def validate_holdout_records(
    validation_records: Iterable[dict[str, Any]],
    test_records: Iterable[dict[str, Any]],
    training_texts: Iterable[str],
    *,
    validation_rows_per_intent: int = 50,
    test_rows_per_intent: int = 100,
) -> dict[str, Any]:
    """Check holdout balance, uniqueness, split separation and no training overlap."""
    split_rows = {
        "validation": list(validation_records),
        "test": list(test_records),
    }
    rows_per_intent = {
        "validation": validation_rows_per_intent,
        "test": test_rows_per_intent,
    }
    all_ids: set[str] = set()
    all_normalized_text: set[str] = set()
    counts_by_split: dict[str, Counter[str]] = {}
    rows_by_split: dict[str, int] = {}

    for split, rows in split_rows.items():
        expected_rows = len(INTENTS) * rows_per_intent[split]
        if len(rows) != expected_rows:
            raise DatasetValidationError(
                f"{split}: expected {expected_rows} rows, found {len(rows)}"
            )
        counts: Counter[str] = Counter()
        for index, row in enumerate(rows, start=1):
            row_id, text, intent = row.get("id"), row.get("text"), row.get("intent")
            if not row_id or not text or not intent:
                raise DatasetValidationError(f"{split} row {index}: missing id, text or intent")
            if intent not in INTENTS:
                raise DatasetValidationError(f"{split} row {row_id}: unsupported intent {intent!r}")
            if row.get("split") != split:
                raise DatasetValidationError(f"row {row_id}: expected split {split!r}")
            if row_id in all_ids:
                raise DatasetValidationError(f"duplicate holdout row id: {row_id}")
            all_ids.add(row_id)
            normalized = normalize_text(str(text))
            if not normalized:
                raise DatasetValidationError(f"row {row_id}: text is empty after normalization")
            if normalized in all_normalized_text:
                raise DatasetValidationError(f"duplicate normalized holdout text: {text!r}")
            all_normalized_text.add(normalized)
            counts[str(intent)] += 1
        for intent in INTENTS:
            count = counts[intent]
            if count != rows_per_intent[split]:
                raise DatasetValidationError(
                    f"{split}/{intent}: expected {rows_per_intent[split]} rows, found {count}"
                )
        counts_by_split[split] = counts
        rows_by_split[split] = len(rows)

    normalized_training_text = {normalize_text(text) for text in training_texts}
    normalized_training_text.discard("")
    overlap = all_normalized_text & normalized_training_text
    if overlap:
        examples = sorted(overlap)[:5]
        raise DatasetValidationError(
            f"holdout contains {len(overlap)} normalized utterance(s) found in training; examples={examples}"
        )

    return {
        "validation": {
            "row_count": rows_by_split["validation"],
            "intent_counts": {
                intent: counts_by_split["validation"][intent] for intent in INTENTS
            },
            "unique_row_ids": True,
            "unique_normalized_texts": rows_by_split["validation"],
            "normalized_training_overlap": 0,
        },
        "test": {
            "row_count": rows_by_split["test"],
            "intent_counts": {intent: counts_by_split["test"][intent] for intent in INTENTS},
            "unique_row_ids": True,
            "unique_normalized_texts": rows_by_split["test"],
            "normalized_training_overlap": 0,
        },
        "holdout_splits_are_disjoint": True,
        "unique_normalized_texts_across_both_splits": len(all_normalized_text),
        "training_overlap_normalization": "NFKC + casefold + collapsed whitespace",
    }


def export_holdout_archive(
    archive_path: Path,
    *,
    validation_dir: Path | None = None,
    test_dir: Path | None = None,
    training_jsonl_path: Path | None = None,
) -> dict[str, Any]:
    """Export the single allowlisted English validation/test source separately."""
    archive_path = archive_path.resolve()
    app_dir = Path(__file__).resolve().parents[1]
    validation_dir = validation_dir or app_dir / "data" / "validation"
    test_dir = test_dir or app_dir / "data" / "test"
    training_jsonl_path = training_jsonl_path or app_dir / "data" / "training" / "training_multilingual.jsonl"
    if not archive_path.is_file():
        raise DatasetValidationError(f"archive does not exist: {archive_path}")
    if not training_jsonl_path.is_file():
        raise DatasetValidationError(
            f"validated 18K training export is required for overlap checks: {training_jsonl_path}"
        )

    with zipfile.ZipFile(archive_path, "r") as archive:
        matching = [info for info in archive.infolist() if info.filename == HOLDOUT_MEMBER]
        if len(matching) != 1:
            raise DatasetValidationError(
                f"archive must contain exactly one allowlisted holdout member: {HOLDOUT_MEMBER}"
            )
        info = matching[0]
        if info.flag_bits & 0x1:
            raise DatasetValidationError("encrypted holdout member is not accepted")
        if info.file_size > MAX_MEMBER_BYTES:
            raise DatasetValidationError("holdout source exceeds size limit")
        source_bytes = archive.read(info)
    try:
        markdown = source_bytes.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise DatasetValidationError("holdout source is not valid UTF-8") from error
    source_hash = hashlib.sha256(source_bytes).hexdigest()
    parsed = parse_holdout_markdown(markdown, HOLDOUT_MEMBER)

    training_rows: list[dict[str, Any]] = []
    try:
        with training_jsonl_path.open("r", encoding="utf-8") as training_file:
            for line_number, line in enumerate(training_file, start=1):
                if not line.strip():
                    continue
                row = json.loads(line)
                if not isinstance(row, dict) or not isinstance(row.get("text"), str):
                    raise DatasetValidationError(
                        f"training JSONL line {line_number} is not a text record"
                    )
                training_rows.append(row)
    except json.JSONDecodeError as error:
        raise DatasetValidationError("training JSONL contains invalid JSON") from error
    if len(training_rows) != EXPECTED_TRAINING_OVERLAP_ROWS:
        raise DatasetValidationError(
            f"overlap check requires {EXPECTED_TRAINING_OVERLAP_ROWS} training rows, "
            f"found {len(training_rows)}"
        )

    validation_records = parsed["validation"]["records"]
    test_records = parsed["test"]["records"]
    validation_report = validate_holdout_records(
        validation_records,
        test_records,
        (row["text"] for row in training_rows),
    )

    output_paths = {
        "validation": validation_dir / "aria_english_validation.json",
        "test": test_dir / "aria_english_test.json",
    }
    full_report: dict[str, Any] = {
        "schema_version": 1,
        "dataset": "ARIA English intent-classification holdout",
        "source": {"member": HOLDOUT_MEMBER, "sha256": source_hash},
        "validation": validation_report,
    }
    split_payloads: dict[str, bytes] = {}
    for split in ("validation", "test"):
        section = parsed[split]
        split_validation = validation_report[split]
        payload = {
            "schema_version": 1,
            "dataset": "ARIA English intent-classification holdout",
            "language": "en",
            "split": split,
            "source": {"member": HOLDOUT_MEMBER, "sha256": source_hash},
            "row_count": split_validation["row_count"],
            "declared_row_count": section["declared_rows"],
            "intent_counts": split_validation["intent_counts"],
            "validation": split_validation,
            "records": section["records"],
        }
        split_payloads[split] = (json.dumps(payload, ensure_ascii=False, indent=2) + "\n").encode(
            "utf-8"
        )

    for split, output_path in output_paths.items():
        _write_atomic(output_path, split_payloads[split])
    return full_report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", required=True, type=Path, help="verified dataset ZIP path")
    parser.add_argument(
        "--holdouts",
        action="store_true",
        help="export the allowlisted English validation and test sets separately",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "data" / "training",
        help="directory for generated JSONL, compact JSON and manifest",
    )
    parser.add_argument(
        "--training-jsonl",
        type=Path,
        default=Path(__file__).resolve().parents[1]
        / "data"
        / "training"
        / "training_multilingual.jsonl",
        help="18K training JSONL used only for holdout overlap checks",
    )
    parser.add_argument(
        "--validation-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "data" / "validation",
    )
    parser.add_argument(
        "--test-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "data" / "test",
    )
    arguments = parser.parse_args()
    if arguments.holdouts:
        report = export_holdout_archive(
            arguments.archive,
            validation_dir=arguments.validation_dir,
            test_dir=arguments.test_dir,
            training_jsonl_path=arguments.training_jsonl,
        )
        print(
            "Exported separate holdout sets: "
            f"validation={report['validation']['validation']['row_count']}, "
            f"test={report['validation']['test']['row_count']}"
        )
        return
    manifest = export_archive(arguments.archive, arguments.output_dir)
    print(
        f"Exported {manifest['validation']['total_rows']} validated rows from "
        f"{len(manifest['source_files'])} allowlisted source files to {arguments.output_dir}"
    )


if __name__ == "__main__":
    main()
