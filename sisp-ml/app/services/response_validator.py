"""Conservative factual checks for generated ARIA responses."""

from dataclasses import dataclass
import re


_MONEY_RE = re.compile(
    r"(?:₱|\bPHP\s*)(\d+(?:,\d{3})*(?:\.\d{1,2})?)(?![\d,.])|"
    r"\b(\d+(?:,\d{3})*(?:\.\d{1,2})?)(?![\d,.])\s*(?:PHP|pesos?)\b",
    re.I,
)
_UNIT_RE = re.compile(r"\bper\s+(page|copy|unit|semester|term|trimester|year)\b|/\s*(page|copy|unit)\b", re.I)
_COURSE_CODE_RE = re.compile(r"\b(?!PHP\b)[A-Z]{2,6}[- ]?\d{2,4}[A-Z]?\b", re.I)
_TIME_RE = re.compile(r"\b\d{1,2}:\d{2}\s*(?:AM|PM)\b", re.I)
_ISO_DATE_RE = re.compile(r"\b\d{4}-\d{2}-\d{2}\b")
_SLASH_DATE_RE = re.compile(r"\b\d{1,2}/\d{1,2}/\d{2,4}\b")
_MONTH_DATE_RE = re.compile(
    r"\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|"
    r"Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,\s*\d{4})?\b",
    re.I,
)
_GRADE_RE = re.compile(r"\b(?:grade|gwa|score)\s*(?:is|of|:)?\s*(\d{1,3}(?:\.\d+)?)\b", re.I)
_UNITS_RE = re.compile(
    r"\b(?:(\d+(?:\.\d+)?)\s+(?:credit\s+)?units?|units?\s*(\d+(?:\.\d+)?))\b",
    re.I,
)
_UNITS_AFTER_LABEL_RE = re.compile(r"\bunits?\s*(\d+(?:\.\d+)?)\b", re.I)


@dataclass(frozen=True)
class ValidationResult:
    valid: bool
    issues: tuple[str, ...] = ()


def _source_text(chunks: list[dict]) -> str:
    return "\n".join(str(chunk.get("content", "")) for chunk in chunks or [])


def _normal_amount(value: str) -> str:
    return f"{float(value.replace(',', '')):g}"


def _money_claims(text: str) -> list[tuple[str, str | None]]:
    claims = []
    for match in _MONEY_RE.finditer(text or ""):
        raw = match.group(1) or match.group(2)
        nearby = (text or "")[match.end():match.end() + 40]
        unit_match = _UNIT_RE.search(nearby)
        unit = next((group for group in unit_match.groups() if group), None) if unit_match else None
        claims.append((_normal_amount(raw), unit.casefold() if unit else None))
    return claims


def _unit_claims(text: str) -> set[str]:
    claims = {
        _normal_amount(first or second)
        for first, second in _UNITS_RE.findall(text or "")
        if first or second
    }
    claims.update(_normal_amount(value) for value in _UNITS_AFTER_LABEL_RE.findall(text or ""))
    return claims


class ResponseValidator:
    @staticmethod
    def validate(response: str, facts: list[dict]) -> ValidationResult:
        source = _source_text(facts)
        output = response or ""
        issues = []
        if not output.strip():
            return ValidationResult(False, ("empty response",))
        source_money = _money_claims(source)
        for amount, unit in _money_claims(output):
            allowed_units = {known_unit for known_amount, known_unit in source_money if known_amount == amount and known_unit}
            if not any(known_amount == amount for known_amount, _ in source_money):
                issues.append("unsupported monetary amount")
            elif unit and allowed_units and unit not in allowed_units:
                issues.append("monetary unit does not match the source")
            elif allowed_units and not unit:
                issues.append("monetary unit omitted")

        source_upper = source.upper()
        non_course_prefixes = {"PHP", "GRADE", "YEAR", "TERM", "PAGE", "COPY", "COURSE", "SCORE", "CHAPTER"}
        for code in _COURSE_CODE_RE.findall(output):
            if re.match(r"[A-Z]+", code.upper()).group(0) in non_course_prefixes:
                continue
            if code.upper().replace(" ", "").replace("-", "") not in source_upper.replace(" ", "").replace("-", ""):
                issues.append("unsupported course code")

        for pattern, label in (
            (_TIME_RE, "unsupported time"),
            (_ISO_DATE_RE, "unsupported date"),
            (_SLASH_DATE_RE, "unsupported date"),
            (_MONTH_DATE_RE, "unsupported date"),
        ):
            for claim in pattern.findall(output):
                if claim.casefold() not in source.casefold():
                    issues.append(label)

        source_grades = {value for value in _GRADE_RE.findall(source)}
        for value in _GRADE_RE.findall(output):
            if value not in source_grades:
                issues.append("unsupported grade or score")

        source_units = _unit_claims(source)
        for value in _unit_claims(output):
            if value not in source_units:
                issues.append("unsupported course units")

        unique_issues = tuple(dict.fromkeys(issues))
        return ValidationResult(not unique_issues, unique_issues)


response_validator = ResponseValidator()
