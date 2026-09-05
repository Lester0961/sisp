import json
import re
import unicodedata
from pathlib import Path


ZERO_WIDTH = re.compile(r"[\u200b-\u200f\u202a-\u202e\u2060\ufeff]")
REPEATED = re.compile(r"(.)\1{2,}")
SINGLE_CHARACTER_SEQUENCE = re.compile(r"(?<!\w)(?:[a-z0-9]\s+){3,}[a-z0-9](?!\w)")
LEET_TRANSLATION = str.maketrans({"@": "a", "4": "a", "3": "e", "1": "i", "!": "i", "0": "o", "5": "s", "$": "s", "7": "t"})
LEVEL_RANK = {"ALLOW": 0, "WARN": 1, "REVIEW": 2, "BLOCK": 3, "CRITICAL": 4}


def normalize_for_moderation(text: str) -> str:
    normalized = unicodedata.normalize("NFKC", text or "").casefold()
    normalized = ZERO_WIDTH.sub("", normalized).translate(LEET_TRANSLATION)
    normalized = REPEATED.sub(r"\1\1", normalized)
    normalized = re.sub(r"[^\w]+", " ", normalized, flags=re.UNICODE)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return SINGLE_CHARACTER_SEQUENCE.sub(lambda match: match.group(0).replace(" ", ""), normalized)


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
                })

    def evaluate(self, text: str) -> dict:
        normalized = normalize_for_moderation(text)
        matches: dict[str, dict] = {}
        for entry in self.entries:
            if not entry["pattern"].search(normalized):
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
        action = "escalate" if level == "CRITICAL" else "block" if level == "BLOCK" else "allow"
        categories = sorted(matches.values(), key=lambda match: -LEVEL_RANK[match["level"]])
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
