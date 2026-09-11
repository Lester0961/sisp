import json
import re
import unicodedata
from pathlib import Path


ZERO_WIDTH = re.compile(r"[\u200b-\u200f\u202a-\u202e\u2060\ufeff]")
REPEATED = re.compile(r"(.)\1{2,}")
SINGLE_CHARACTER_SEQUENCE = re.compile(r"(?<!\w)(?:[a-z0-9]\s+){3,}[a-z0-9](?!\w)")
# Common leetspeak plus visually-confusable characters seen in copied or
# deliberately obfuscated chat text. This is intentionally limited to common
# Latin/Cyrillic/Greek lookalikes so ordinary multilingual text is preserved.
LEET_TRANSLATION = str.maketrans({
    "@": "a", "4": "a", "3": "e", "1": "i", "!": "i", "0": "o",
    "5": "s", "$": "s", "7": "t", "8": "b",
    "а": "a", "А": "a", "е": "e", "Е": "e", "і": "i", "І": "i",
    "о": "o", "О": "o", "с": "c", "С": "c", "х": "x", "Х": "x",
    "у": "y", "У": "y", "ρ": "p", "Ρ": "p",
})
LEVEL_RANK = {"ALLOW": 0, "WARN": 1, "REVIEW": 2, "BLOCK": 3, "CRITICAL": 4}


def normalize_for_moderation(text: str) -> str:
    normalized = unicodedata.normalize("NFKC", text or "").casefold()
    normalized = ZERO_WIDTH.sub("", normalized).translate(LEET_TRANSLATION)
    normalized = REPEATED.sub(r"\1\1", normalized)
    normalized = re.sub(r"[^\w]+", " ", normalized, flags=re.UNICODE)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return SINGLE_CHARACTER_SEQUENCE.sub(lambda match: match.group(0).replace(" ", ""), normalized)


def compact_for_moderation(text: str) -> str:
    """Remove separators/repeated padding for constructed-word detection.

    This catches forms such as ``f.u.c.k``, ``f u c k``, ``p-a-k-y-u`` and
    repeated-character padding without changing the primary normalized string
    used for boundary-aware matching.
    """
    normalized = normalize_for_moderation(text)
    compact = re.sub(r"[^\w]+", "", normalized, flags=re.UNICODE)
    return re.sub(r"(.)\1+", r"\1", compact)


def has_obfuscation_signal(text: str) -> bool:
    raw = text or ""
    if re.search(r"[.@#$!?*~^_\-]", raw):
        return True
    if re.search(r"(?<!\w)(?:[a-z0-9]\s+){2,}[a-z0-9](?!\w)", raw.casefold()):
        return True
    if REPEATED.search(raw.casefold()):
        return True
    if any(character in raw for character in "@431!05$78аАеЕіІоОсСхХуУρΡ"):
        return True
    return False


class ModerationService:
    def __init__(self) -> None:
        data_path = Path(__file__).resolve().parents[1] / "data" / "moderation" / "moderation_terms.json"
        payload = json.loads(data_path.read_text(encoding="utf-8"))
        self.metadata = {
            "categorizedEntryCount": payload["categorizedEntryCount"],
            "contextReviewEntryCount": payload["contextReviewEntryCount"],
            "sectionCount": payload["sectionCount"],
            "sourceCompiledDate": payload["sourceCompiledDate"],
        }
        self.sections = payload["sections"]
        self.entries: list[dict] = []
        for section in self.sections:
            for entry in section["entries"]:
                normalized = normalize_for_moderation(entry)
                if not normalized:
                    continue
                pattern = re.compile(r"(?<!\w)" + re.escape(normalized).replace(r"\ ", r"\s+") + r"(?!\w)", flags=re.UNICODE)
                self.entries.append({
                    "pattern": pattern,
                    "sectionId": section["id"],
                    "heading": section["heading"],
                    "language": section["language"],
                    "level": section["level"],
                    "contextOnly": section["contextOnly"],
                    "compact": compact_for_moderation(normalized),
                })

    def evaluate(self, text: str) -> dict:
        normalized = normalize_for_moderation(text)
        compact = compact_for_moderation(text)
        matches: dict[str, dict] = {}
        for entry in self.entries:
            exact_match = bool(entry["pattern"].search(normalized))
            compact_term = entry["compact"]
            # Compact matching is only used for meaningful terms. Short terms
            # such as "ass" are kept boundary-aware to avoid false positives
            # inside ordinary words like "class".
            constructed_match = (
                has_obfuscation_signal(text)
                and len(compact_term) >= 4
                and compact_term in compact
            )
            if not exact_match and not constructed_match:
                continue
            current = matches.get(entry["sectionId"])
            if current and LEVEL_RANK[entry["level"]] <= LEVEL_RANK[current["level"]]:
                continue
            matches[entry["sectionId"]] = {
                "category": entry["sectionId"],
                "heading": entry["heading"],
                "language": entry["language"],
                "level": entry["level"],
                "contextOnly": entry["contextOnly"],
            }

        effective = [match for match in matches.values() if not match["contextOnly"]]
        highest = max(effective, key=lambda match: LEVEL_RANK[match["level"]], default={"level": "ALLOW"})
        level = highest["level"]
        categories = sorted(matches.values(), key=lambda match: -LEVEL_RANK[match["level"]])
        has_context_review = any(category["contextOnly"] for category in categories)
        # Non-context profanity is not sent to the LLM. REVIEW is blocked when
        # it stands alone, while a matching context-review term (for example
        # health/education language) keeps the message available for normal
        # advisory processing.
        if level == "CRITICAL":
            action = "escalate"
        elif level == "BLOCK" or (level == "REVIEW" and not has_context_review):
            action = "block"
        else:
            action = "allow"
        return {"level": level, "action": action, "categories": categories}

    def category_summary(self) -> dict:
        return {
            **self.metadata,
            "categories": [
                {
                    "id": section["id"],
                    "heading": section["heading"],
                    "language": section["language"],
                    "level": section["level"],
                    "contextOnly": section["contextOnly"],
                    "entryCount": len(section["entries"]),
                }
                for section in self.sections
            ],
        }


moderation_service = ModerationService()
