import re
from pathlib import Path

import joblib


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
        "aking", "ako", "ano", "ang", "ba", "bakit", "gusto", "kailangan", "ko", "mga", "nako", "ng", "opo", "sa",
        "maaari", "magkano", "malaman", "magsimula", "magbubukas", "magsasara", "paano", "pano", "po", "puwede", "pwedeng", "pwede", "saan", "salamat", "yung",
    },
    "ceb": {
        "ako", "akong", "asa", "bisaya", "ganahan", "giunsa", "kanus a", "mga", "nako",
        "kinahanglan", "maayo", "mangutana", "magsugod", "ngano", "palihug", "pila", "pwede", "salamat", "ug", "unsa", "unsaon", "walay",
        "mobalik", "mohunong", "unsay",
    },
    "ilo": {
        "ania", "dagiti", "ko", "siak", "kayat", "manong", "mano", "sadino", "mabalin", "wen", "wenno", "asino",
        "apay", "kasano", "ti", "iti", "nagan", "agsubliak",
    },
    "hil": {
        "akon", "ano", "bala", "diin", "gani", "gid", "hiligaynon", "indi", "kag", "ko", "mga", "ukon", "sang",
        "paano", "palihog", "pila", "pwede", "salamat", "sin o", "subong",
    },
    "war": {
        "salamat", "pwede", "adi", "waray", "diin", "diri", "han", "ha", "hit", "hin", "hiya", "ngan", "ano", "mga",
        "mahimo", "maaram", "maupay", "palihug", "paonan o", "pira", "tagpira", "hain", "akon",
    },
    "en": {
        "my", "can", "when", "where", "what", "please", "i", "the", "how",
        "do", "is", "why", "could", "has", "yet", "due", "posted", "still", "says",
        # Common English chat shorthand and fee terms help brief typo queries
        # avoid inheriting an unrelated language from the previous turn.
        "hw", "mch", "much", "for", "fee", "fees", "cost", "price",
    },
}

# These cues distinguish neighboring Philippine languages better than shared
# words such as "ako", "ano", "mga", and the English school terms that are
# commonly mixed into student questions. A distinctive cue gets extra weight;
# ambiguous messages can still be resolved by the broader marker sets above.
STRONG_MARKERS = {
    "fil": {"ng", "opo", "po", "magkano", "saan", "bakit", "kailan", "kailangan", "gusto", "yung", "malaman", "magsimula", "magbubukas", "magsasara", "pano", "puwede", "pwedeng"},
    "ceb": {"unsa", "unsay", "unsaon", "giunsa", "ngano", "ganahan", "kinahanglan", "walay", "kanus a", "ug", "bisaya", "pila", "asa", "mangutana", "magsugod", "mobalik", "mohunong"},
    "ilo": {"ania", "dagiti", "siak", "kayat", "mabalin", "wenno", "asino", "apay", "kasano", "sadino", "iti", "nagan", "mano", "agsubliak"},
    "hil": {"gid", "indi", "sang", "ukon", "kag", "subong", "bala", "hiligaynon", "diin"},
    "war": {"waray", "diri", "han", "hit", "hin", "ngan", "ha", "pira", "tagpira", "paonan o", "hain", "hiya", "mahimo", "maaram", "maupay"},
    "en": set(),
}

FORMAL_MARKERS = {
    "maari", "please", "kindly", "opo", "would", "maaari", "palihog", "po", "palihug", "could",
}
SLANG_MARKERS = {"pre", "bro", "fr", "lods", "unsaon", "idk", "sis", "lodi", "man", "yarn"}

# These are clearer dialect cues than words shared across Filipino languages.
# They take precedence over statistical prediction when they point to exactly
# one language. Mixed sets fall through to the classifier and conversation
# context instead of arbitrarily switching the response language.
EXPLICIT_LANGUAGE_MARKERS = {
    "fil": {"ng", "opo", "po", "magkano", "saan", "bakit", "yung", "hindi", "kailangan", "maaari", "puwede"},
    "ceb": {"unsa", "unsay", "unsaon", "giunsa", "ngano", "walay", "ug", "og", "asa", "kanus a", "ganahan", "mangutana", "bisaya", "mobalik", "mohunong"},
    "ilo": {"ti", "iti", "dagiti", "kasano", "mabalin", "wen", "wenno", "kayat", "apay", "sadino", "siak", "mano", "agsubliak"},
    "hil": {"kag", "sang", "gid", "indi", "ukon", "subong", "bala", "sini", "ngaa", "hiligaynon"},
    "war": {"han", "hit", "hin", "ngan", "diri", "pira", "tagpira", "paonan o", "hain", "maupay", "maaram", "waray"},
    "en": set(),
}

DETECTOR_CONFIDENCE_THRESHOLD = 0.80


class LanguageService:
    def __init__(self) -> None:
        self.detector = None
        artifact_path = Path(__file__).resolve().parents[1] / "ml" / "models" / "language_detector_v1.pkl"
        try:
            metadata = joblib.load(artifact_path) if artifact_path.is_file() else None
            model = metadata.get("model") if isinstance(metadata, dict) else None
            labels = set(metadata.get("labels", [])) if isinstance(metadata, dict) else set()
            if model is not None and callable(getattr(model, "predict_proba", None)) and labels == set(LANGUAGES):
                self.detector = model
        except Exception:
            # Keep ARIA available with the existing bounded marker detector if
            # a model artifact is missing or incompatible.
            self.detector = None

    @staticmethod
    def _has_marker(lowered: str, tokens: set[str], marker: str) -> bool:
        if " " not in marker:
            return marker in tokens
        pattern = r"(?<!\w)" + r"[\s-]+".join(re.escape(part) for part in marker.split()) + r"(?!\w)"
        return re.search(pattern, lowered, flags=re.UNICODE) is not None

    def detect(
        self,
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
        def has_marker(marker: str) -> bool:
            return LanguageService._has_marker(lowered, tokens, marker)

        marker_counts = {
            code: sum(1 for marker in markers if has_marker(marker))
            for code, markers in MARKERS.items()
        }
        scores = {
            code: sum(
                3 if marker in STRONG_MARKERS[code] else 1
                for marker in markers
                if has_marker(marker)
            )
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
                return self.detect(previous_user, preferred=preferred)

        code_switched = sum(1 for count in marker_counts.values() if count >= 2) >= 2
        explicit_scores = {
            code: sum(
                1
                for marker in markers
                if LanguageService._has_marker(lowered, tokens, marker)
            )
            for code, markers in EXPLICIT_LANGUAGE_MARKERS.items()
        }
        explicit_ranked = sorted(explicit_scores.items(), key=lambda item: item[1], reverse=True)
        explicit_winner = (
            explicit_ranked[0][0]
            if explicit_ranked[0][1] > 0 and explicit_ranked[0][1] > explicit_ranked[1][1]
            else None
        )
        if len([score for code, score in explicit_scores.items() if score > 0]) > 1:
            code_switched = True

        rule_confidence = best_score / max(1, sum(scores.values()))
        confidence = rule_confidence
        if explicit_winner:
            best_code = explicit_winner
            confidence = max(rule_confidence, min(0.95, 0.70 + 0.08 * explicit_scores[explicit_winner]))
        elif self.detector is not None and len(tokens) >= 2:
            try:
                probabilities = self.detector.predict_proba([text])[0]
                ranked_indices = sorted(range(len(probabilities)), key=lambda index: float(probabilities[index]), reverse=True)
                model_code = str(self.detector.classes_[ranked_indices[0]])
                model_confidence = float(probabilities[ranked_indices[0]])
                if model_confidence >= DETECTOR_CONFIDENCE_THRESHOLD:
                    best_code = model_code
                    confidence = model_confidence
                elif best_score == 0:
                    best_code = model_code if model_confidence >= 0.55 else "en"
                    confidence = model_confidence
            except Exception:
                if best_score == 0:
                    best_code = "en"
        elif best_score == 0:
            best_code = "en"
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
        tokens = set(re.findall(r"[\w'-]+", lowered, flags=re.UNICODE))

        def has_marker(marker: str) -> bool:
            if " " not in marker:
                return marker in tokens
            pattern = r"(?<!\w)" + r"[\s-]+".join(re.escape(part) for part in marker.split()) + r"(?!\w)"
            return re.search(pattern, lowered, flags=re.UNICODE) is not None

        if any(has_marker(marker) for marker in SLANG_MARKERS):
            return "slang"
        if any(has_marker(marker) for marker in FORMAL_MARKERS):
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
