from app.config import get_settings
from app.services.classifier_service import classifier_service
from app.services.language_service import language_service
from app.services.llm.errors import AllProvidersFailed
from app.services.llm.models import ConversationMessage, LLMRequest
from app.services.llm.router import llm_router
from app.services.localized_messages import message
from app.services.moderation_service import moderation_service
from app.services.retrieval_service import retrieval_service
from app.services.scope_service import scope_service


settings = get_settings()

INTENT_CATEGORIES = {
    "enrollment_inquiry": "enrollment_policy",
    "grade_inquiry": "grading_policy",
    "payment_inquiry": "payment_policy",
    "document_request": "document_requests",
    "examination_permit_inquiry": "examination_permit_policy",
}

EXAM_MARKERS = (
    "exam permit",
    "examination permit",
    "exam stub",
    "finals permit",
    "midterm permit",
    "prelim permit",
    "permit sa exam",
    "permit sa pagsusulit",
    "examination nga permit",
    "permit iti exam",
    "permit han exam",
    "permit sang exam",
)


class ChatService:
    async def process_query(
        self,
        query: str,
        conversation_history: list[dict] | None = None,
        preferred_language: str | None = None,
    ) -> dict:
        history = (conversation_history or [])[-12:]
        language = language_service.detect(query, history, preferred_language)
        language_code = language["code"]
        moderation = moderation_service.evaluate(query)

        if moderation["action"] in {"block", "escalate"}:
            critical = moderation["action"] == "escalate"
            return self._fixed_result(
                message(language_code, "critical" if critical else "blocked"),
                "content_moderation",
                1.0,
                critical,
                "live_advisor" if critical else "moderation",
                language,
                moderation,
            )

        scope = scope_service.route(query)
        if scope["route"] == "out_of_scope":
            return self._fixed_result(
                message(language_code, "out_of_scope"),
                "out_of_scope",
                1.0,
                False,
                "out_of_scope",
                language,
                moderation,
            )
        if scope["route"] == "greeting":
            return self._fixed_result(
                message(language_code, "greeting"),
                "greeting",
                1.0,
                False,
                "greeting",
                language,
                moderation,
            )
        if scope["route"] == "database":
            result = self._fixed_result(
                message(language_code, "database"),
                scope["action"] or "database",
                1.0,
                False,
                "database",
                language,
                moderation,
            )
            result["action"] = scope["action"]
            return result

        lowered = query.casefold()
        if any(marker in lowered for marker in EXAM_MARKERS):
            intent = "examination_permit_inquiry"
            confidence = 1.0
        else:
            classified = classifier_service.classify(query)
            intent = classified.get("intent", "general_inquiry")
            confidence = float(classified.get("confidence", 0.0))

        category = INTENT_CATEGORIES.get(intent)
        context_chunks = retrieval_service.retrieve(query, limit=3, category=category)
        if not context_chunks and category:
            context_chunks = retrieval_service.retrieve(query, limit=3)

        if not context_chunks:
            if intent == "examination_permit_inquiry":
                return self._fixed_result(
                    message(language_code, "exam_permit"),
                    intent,
                    confidence,
                    False,
                    "policy",
                    language,
                    moderation,
                )
            return self._fixed_result(
                message(language_code, "unavailable"),
                intent,
                confidence,
                True,
                "live_advisor",
                language,
                moderation,
            )

        system_prompt = (
            "You are ARIA, the academic advisory assistant for Regis Marie College. "
            "Answer only academic advising and authorized student-service questions. "
            "Use only the verified institutional context supplied with this request. "
            "Never invent grades, schedules, balances, enrollment status, student records, "
            "fees, deadlines, exceptions, or staff details. Personal SISP records are handled "
            "by deterministic portal services, not by you. If the verified context does not "
            "contain the answer, say that a human academic advisor is needed. Respond in "
            f"{language['name']} using a {language['register']} conversational register. "
            "Preserve policy facts exactly even when paraphrasing. Keep the response concise and clear."
        )
        llm_history = [
            ConversationMessage(item["role"], item["content"][:2000])
            for item in history
            if item.get("role") in {"user", "assistant"} and item.get("content", "").strip()
        ]

        try:
            generated = await llm_router.generate(
                LLMRequest(
                    system_prompt=system_prompt,
                    user_prompt=query,
                    history=llm_history,
                    context_chunks=context_chunks,
                    max_tokens=settings.llm_max_tokens,
                )
            )
            response_text = generated.text
            escalate = False
            route = "policy"
        except AllProvidersFailed:
            if intent == "examination_permit_inquiry":
                response_text = message(language_code, "exam_permit")
                escalate = False
                route = "policy"
            else:
                response_text = message(language_code, "unavailable")
                escalate = True
                route = "live_advisor"

        return {
            "response": response_text,
            "intent": intent,
            "confidence": confidence,
            "escalate": escalate,
            "route": route,
            "action": None,
            "language": language,
            "moderationCategories": [item["category"] for item in moderation["categories"]],
            "sources": self._sources(context_chunks),
        }

    @staticmethod
    def _sources(context_chunks: list[dict]) -> list[dict]:
        return [
            {
                "source": chunk.get("source", "institutional source"),
                "category": chunk.get("category", "policy"),
                "similarity": float(chunk.get("similarity", 0.0)),
                "content_snippet": (
                    chunk.get("content", "")[:100] + "..."
                    if len(chunk.get("content", "")) > 100
                    else chunk.get("content", "")
                ),
            }
            for chunk in context_chunks
        ]

    @staticmethod
    def _fixed_result(
        response: str,
        intent: str,
        confidence: float,
        escalate: bool,
        route: str,
        language: dict,
        moderation: dict,
    ) -> dict:
        return {
            "response": response,
            "intent": intent,
            "confidence": confidence,
            "escalate": escalate,
            "route": route,
            "action": None,
            "language": language,
            "moderationCategories": [item["category"] for item in moderation["categories"]],
            "sources": [],
        }


chat_service = ChatService()
