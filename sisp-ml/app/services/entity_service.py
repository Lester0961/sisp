"""Small deterministic entity extraction helpers for curriculum requests."""

import re
from functools import lru_cache
from pathlib import Path

from app.approved_sources import APPROVED_STATIC_SOURCES
from app.services.curriculum_service import CURRICULUM_LIST_ROW, CURRICULUM_SOURCES, normalize_query


COURSE_CODE_PATTERN = re.compile(r"(?<![A-Z])([A-Z]{2,6}[- ]?\d{1,4}[A-Z]?)(?![A-Z0-9])", re.I)
PROGRAM_CODES = {"BSCS", "BSCRIM", "BSMA", "BSOA", "BEED"}
COURSE_NAME_ALIASES = (
    (re.compile(r"\bcalculus\s*1\b", re.I), "Calculus 1"),
    (re.compile(r"\bdbms\s*1\b", re.I), "Database Management System 1"),
    (re.compile(r"\bdbms\s*2\b", re.I), "Database Management System 2"),
    (re.compile(r"\bdatabase\s+management\s+system\s+1\b", re.I), "Database Management System 1"),
    (re.compile(r"\bdatabase\s+management\s+system\s+2\b", re.I), "Database Management System 2"),
    (re.compile(r"\boop\s*2\b", re.I), "Object-Oriented Programming 2"),
    (re.compile(r"\bobject[- ]oriented\s+programming\s+2\b", re.I), "Object-Oriented Programming 2"),
    (re.compile(r"\bhci\b", re.I), "Human-Computer Interaction"),
    (re.compile(r"\bhuman[- ]computer\s+interaction\b", re.I), "Human-Computer Interaction"),
    (re.compile(r"\bdsa\b", re.I), "Data Structures and Algorithms"),
    (re.compile(r"\bdata\s+structures\s+and\s+algorithms\b", re.I), "Data Structures and Algorithms"),
)


@lru_cache(maxsize=1)
def _approved_course_titles() -> tuple[str, ...]:
    """Load course names from the locally approved curriculum files once."""
    base_dir = Path(__file__).resolve().parents[1] / "data" / "knowledge_base"
    titles = set()
    for source in CURRICULUM_SOURCES:
        if source not in APPROVED_STATIC_SOURCES:
            continue
        try:
            content = (base_dir / source).read_text(encoding="utf-8")
        except OSError:
            continue
        for line in content.splitlines():
            row = CURRICULUM_LIST_ROW.match(line)
            if row:
                title = re.sub(r"\s+", " ", row.group("title")).strip()
                if title:
                    titles.add(title)
    return tuple(sorted(titles, key=lambda value: (-len(normalize_query(value)), value.casefold())))


def _match_approved_course_title(text: str) -> str | None:
    normalized = f" {normalize_query(text)} "
    for title in _approved_course_titles():
        normalized_title = f" {normalize_query(title)} "
        if normalized_title.strip() and normalized_title in normalized:
            return title
    return None


class EntityService:
    @staticmethod
    def extract_curriculum_request(text: str) -> dict:
        lowered = (text or "").casefold()
        course_name = next(
            (canonical for pattern, canonical in COURSE_NAME_ALIASES if pattern.search(text or "")),
            None,
        )
        if course_name is None:
            course_name = _match_approved_course_title(text or "")
        codes = [] if course_name else [
            code
            for match in COURSE_CODE_PATTERN.finditer(text or "")
            if (code := re.sub(r"[\s-]+", "", match.group(1)).upper()) not in PROGRAM_CODES
        ]
        asks_units = any(token in lowered for token in ("unit", "units", "credit", "credits"))
        asks_term = any(token in lowered for token in (
            "term", "trimester", "semester", "semestre", "taon", "tawen", "tuig", "tahun", "aldaw", "year",
        ))
        if any(token in lowered for token in (
            "prerequisite", "prerequisites", "prereq", "pre-requisite", "pre-requisites",
            "kinahanglan una", "gikinahanglan una", "kasapulan",
        )):
            request_type = "course_prerequisite"
        elif asks_units and asks_term:
            request_type = "course_details"
        elif asks_units:
            request_type = "course_units"
        elif asks_term:
            request_type = "year_term"
        elif any(token in lowered for token in (
            "does the course exist", "is there a course", "course code", "offered",
            "naa ba nga subject", "naa ba sa curriculum", "aduna bay subject", "ada ba nga subject",
            "adda kadi nga course", "nailista kadi",
        )):
            request_type = "course_exists"
        elif codes:
            request_type = "specific_subject"
        else:
            request_type = "curriculum_question"
        return {
            "request_type": request_type,
            "course_codes": list(dict.fromkeys(codes)),
            "course_name": course_name,
        }


entity_service = EntityService()
