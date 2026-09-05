import re


LANGUAGES = {
    "en": "English",
    "fil": "Filipino / Tagalog",
    "ceb": "Cebuano / Bisaya",
    "ilo": "Ilocano",
    "hil": "Hiligaynon / Ilonggo",
    "war": "Waray",
}

MARKERS = {
    "fil": {
        "aking", "ako", "ano", "ba", "bakit", "gusto", "kailangan", "ko",
        "maaari", "magkano", "paano", "po", "pwede", "saan", "salamat", "yung",
    },
    "ceb": {
        "ako", "akong", "asa", "bisaya", "ganahan", "giunsa", "kanus a",
        "kinahanglan", "maayo", "palihug", "pwede", "salamat", "unsa", "walay",
    },
    "ilo": {
        "ko", "siak", "kayat", "manong", "sadino", "mabalin", "wen", "asino",
        "apay", "kasano", "ti", "nagan",
    },
    "hil": {
        "akon", "ano", "diin", "gani", "gid", "hiligaynon", "indi", "ko",
        "paano", "palihog", "pwede", "salamat", "sin o",
    },
    "war": {
        "salamat", "pwede", "adi", "waray", "diin", "kay ano", "hiya", "ano",
        "mahimo", "palihug", "hain", "akon",
    },
    "en": {
        "my", "can", "when", "where", "what", "please", "i", "the", "how",
        "do", "is", "why", "could",
    },
}

FORMAL_MARKERS = {
    "maari", "please", "kindly", "opo", "would", "maaari", "palihog", "po", "palihug", "could",
}
SLANG_MARKERS = {"pre", "bro", "fr", "lods", "unsaon", "idk", "sis", "lodi", "man", "yarn"}


class LanguageService:
    @staticmethod
    def detect(
        text: str,
        history: list[dict] | None = None,
        preferred: str | None = None,
    ) -> dict:
        if preferred in LANGUAGES:
            return LanguageService._result(
                preferred,
                1.0,
                False,
                LanguageService._register(text),
                True,
            )

        lowered = (text or "").casefold().replace("ñ", "n")
        tokens = set(re.findall(r"[\w'-]+", lowered, flags=re.UNICODE))
        scores = {
            code: sum(1 for marker in markers if marker in lowered or marker in tokens)
            for code, markers in MARKERS.items()
        }
        ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
        best_code, best_score = ranked[0]

        if best_score == 0 and history:
            previous_user = next(
                (
                    message.get("content", "")
                    for message in reversed(history)
                    if message.get("role") == "user"
                ),
                "",
            )
            if previous_user:
                return LanguageService.detect(previous_user, preferred=preferred)

        if best_score == 0:
            best_code = "en"
        second_score = ranked[1][1] if len(ranked) > 1 else 0
        code_switched = best_score >= 2 and second_score >= 2
        confidence = best_score / max(1, sum(scores.values()))
        return LanguageService._result(
            best_code,
            confidence,
            code_switched,
            LanguageService._register(text),
            False,
        )

    @staticmethod
    def _register(text: str) -> str:
        lowered = (text or "").casefold()
        if any(marker in lowered for marker in SLANG_MARKERS):
            return "slang"
        if any(marker in lowered for marker in FORMAL_MARKERS):
            return "formal"
        return "natural"

    @staticmethod
    def _result(code: str, confidence: float, code_switched: bool, register: str, manual: bool) -> dict:
        return {
            "code": code,
            "name": LANGUAGES[code],
            "confidence": round(confidence, 3),
            "codeSwitched": code_switched,
            "register": register,
            "manual": manual,
            "nativeReviewRequired": code in {"ceb", "ilo", "hil", "war"},
        }


language_service = LanguageService()
