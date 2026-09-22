"""Confidence-aware intent routing and concise multilingual clarification."""

from app.config import get_settings


_INTENT_LABELS = {
    "en": {
        "enrollment_inquiry": "enrollment",
        "grade_inquiry": "grades",
        "payment_inquiry": "payments",
        "document_request": "school documents",
        "general_inquiry": "general school information",
        "curriculum_inquiry": "curriculum or subjects",
    },
    "fil": {
        "enrollment_inquiry": "enrollment",
        "grade_inquiry": "mga grado",
        "payment_inquiry": "bayad",
        "document_request": "mga dokumento ng paaralan",
        "general_inquiry": "pangkalahatang impormasyon tungkol sa paaralan",
        "curriculum_inquiry": "curriculum o mga subject",
    },
    "ceb": {
        "enrollment_inquiry": "enrollment",
        "grade_inquiry": "grado",
        "payment_inquiry": "bayad",
        "document_request": "mga dokumento sa eskwelahan",
        "general_inquiry": "kinatibuk-ang impormasyon sa eskwelahan",
        "curriculum_inquiry": "curriculum o mga subject",
    },
    "ilo": {
        "enrollment_inquiry": "enrollment",
        "grade_inquiry": "grado",
        "payment_inquiry": "bayad",
        "document_request": "dokumento ti eskuelaan",
        "general_inquiry": "sapasken a impormasyon maipanggep iti eskuelaan",
        "curriculum_inquiry": "curriculum wenno dagiti subject",
    },
    "hil": {
        "enrollment_inquiry": "enrollment",
        "grade_inquiry": "grado",
        "payment_inquiry": "bayad",
        "document_request": "mga dokumento sang eskwelahan",
        "general_inquiry": "kinatibuk-ang impormasyon parte sa eskwelahan",
        "curriculum_inquiry": "curriculum ukon mga subject",
    },
    "war": {
        "enrollment_inquiry": "enrollment",
        "grade_inquiry": "grado",
        "payment_inquiry": "bayad",
        "document_request": "mga dokumento han eskwelahan",
        "general_inquiry": "kinatibuk-ang impormasyon han eskwelahan",
        "curriculum_inquiry": "curriculum o mga subject",
    },
}

_CLARIFICATION = {
    "en": "Are you asking about {first} or {second}? Tell me what you need to know.",
    "fil": "Tungkol ba ito sa {first} o {second}? Sabihin mo kung ano ang gusto mong malaman.",
    "ceb": "Mahitungod ba kini sa {first} o {second}? Palihog isulti unsa ang gusto nimong mahibaloan.",
    "ilo": "Maipanggep kadi daytoy iti {first} wenno {second}? Ibagam no ania ti kayatmo a maammuan.",
    "hil": "Parte bala ini sa {first} ukon {second}? Palihog hambala kon ano ang gusto mo mahibaluan.",
    "war": "Mahitungod ba ini han {first} o {second}? Alayon pagsidnga ako kon ano an imo karuyag hibaroan.",
}


class IntentRouter:
    @staticmethod
    def resolve(prediction: dict) -> dict:
        """Decide whether a top-one prediction is safe to route automatically."""
        settings = get_settings()
        confidence = float(prediction.get("confidence", 0.0) or 0.0)
        margin = float(prediction.get("margin", 0.0) or 0.0)
        second_intent = prediction.get("second_intent")
        unavailable = confidence <= 0.0 or (
            bool(prediction.get("escalate")) and not second_intent
        )
        reasons = []
        if confidence < settings.intent_min_confidence:
            reasons.append("low_confidence")
        if margin < settings.intent_min_margin:
            reasons.append("low_margin")
        return {
            "intent": prediction.get("intent", "general_inquiry"),
            "confidence": confidence,
            "second_intent": second_intent,
            "second_confidence": float(prediction.get("second_confidence", 0.0) or 0.0),
            "margin": margin,
            "needs_clarification": bool(reasons) and not unavailable,
            "unavailable": unavailable,
            "clarification_reasons": reasons,
            "model_version": prediction.get("model_version", "unknown"),
        }

    @staticmethod
    def clarification(route: dict, language_code: str) -> str:
        first = route.get("intent") or "general_inquiry"
        second = route.get("second_intent") or "general_inquiry"
        labels = _INTENT_LABELS.get(language_code, _INTENT_LABELS["en"])
        template = _CLARIFICATION.get(language_code, _CLARIFICATION["en"])
        return template.format(
            first=labels.get(first, "school information"),
            second=labels.get(second, "school information"),
        )


intent_router = IntentRouter()
