"""Small deterministic entity extraction helpers for curriculum requests."""

import re


COURSE_CODE_PATTERN = re.compile(r"(?<![A-Z])([A-Z]{2,6}[- ]?\d{1,4}[A-Z]?)(?![A-Z0-9])", re.I)
PROGRAM_CODES = {"BSCS", "BSCRIM", "BSMA", "BSOA", "BEED"}
COURSE_NAME_ALIASES = (
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


class EntityService:
    @staticmethod
    def extract_curriculum_request(text: str) -> dict:
        lowered = (text or "").casefold()
        course_name = next(
            (canonical for pattern, canonical in COURSE_NAME_ALIASES if pattern.search(text or "")),
            None,
        )
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
