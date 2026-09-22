from app.config import get_settings
from app.services.intent_service import intent_service
from app.services.intent_router import intent_router
from app.services.entity_service import entity_service
from app.services.response_service import response_service
from app.services.response_validator import response_validator
from app.services.language_service import language_service
from app.services.llm.errors import AllProvidersFailed
from app.services.llm.models import ConversationMessage, LLMRequest
from app.services.llm.router import llm_router
from app.services.localized_messages import DOCUMENT_FEE_MESSAGES, message
from app.services.moderation_service import moderation_service
from app.services.retrieval_service import retrieval_service
from app.services.scope_service import scope_service
from app.services.curriculum_service import (
    curriculum_service,
    get_curriculum_source,
    is_ambiguous_filipino_bsed,
    is_course_list_query,
    is_full_course_list_query,
    is_explicit_full_course_list_query,
    is_curriculum_query,
    is_curriculum_follow_up,
)
from app.approved_sources import APPROVED_STATIC_SOURCES
from pathlib import Path
import re
import logging


settings = get_settings()
logger = logging.getLogger("sisp.chat_service")

INTENT_CATEGORIES = {
    "enrollment_inquiry": "enrollment_policy",
    "grade_inquiry": "grading_policy",
    "payment_inquiry": "payment_policy",
    "document_request": "document_requests",
    "curriculum_inquiry": "programs_curriculum",
    "examination_permit_inquiry": "examination_permit_policy",
}

EXAM_MARKERS = (
    "exam permit",
    "examination permit",
    "permit for exam",
    "permit for exams",
    "permit for examination",
    "permit for examinations",
    "request an exam permit",
    "request a permit for exams",
    "request a permit for examinations",
    "request examination permit",
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
    "paano kumuha ng permit sa exam",
    "paano humingi ng permit sa pagsusulit",
    "unsaon pagkuha og permit sa exam",
    "giunsa pagkuha og permit sa exam",
    "kasano ti panagkiddaw iti permit ti exam",
    "paano mangayo sang permit sa exam",
    "paonan-o pagkuha hin permit ha exam",
)

ENROLLMENT_MARKERS = (
    "enrollment", "enrolment", "enroll", "enrolling", "enrolled", "enrol",
    "registration", "register", "registering", "continuing student", "continuing students",
    "continue my studies", "continuing studies", "magpatuloy", "magpapatuloy",
    "magpadayon", "magpapadayon", "magapadayon", "agtultuloy",
    "mag enroll", "mag-enroll", "pag enroll", "pag-enroll", "magpatala", "pagpapatala",
    "ag-enroll", "panag-enroll", "pagpalista",
)
TUITION_MARKERS = ("tuition", "matrikula", "matriculation")
PAYMENT_AMOUNT_MARKERS = (
    "how much", "magkano", "pila", "pira", "mano", "tagpira", "tag pira",
    "bayad", "bayranan", "presyo", "cost", "price", "fee", "fees", "amount",
)
RETURNING_ENROLLMENT_MARKERS = (
    "returning student", "returning", "after a break", "after my break",
    "resume studying", "return to school", "bumalik sa pag aaral", "babalik sa pag aaral",
    "nagbabalik", "balik eskwela", "mibalik sa eskwela", "mobalik sa eskwela",
    "ag subli", "agsubli", "nagbalik eskwela", "nabalik ha eskwelahan",
)
TRANSFEREE_ENROLLMENT_MARKERS = (
    "transferee", "transfer student", "transferring", "transfer ako",
    "lilipat", "lumipat ng school", "bagong lipat", "transfer ko",
)
NEW_STUDENT_ENROLLMENT_MARKERS = (
    "new student", "new applicant", "first year", "first-year", "freshman",
    "first time student", "first-time student", "bagong estudyante",
    "bagong aplikante", "bag o nga estudyante", "baro nga estudiante",
)


def _has_query_marker(query: str, markers: tuple[str, ...]) -> bool:
    normalized = (query or "").casefold()
    for marker in markers:
        marker_pattern = r"[\s-]+".join(re.escape(part) for part in marker.split())
        if re.search(rf"(?<!\w){marker_pattern}(?!\w)", normalized):
            return True
    return False


def _with_follow_up_context(query: str, history: list[dict]) -> str:
    """Use the last user turn for short referential questions, without changing the prompt."""
    if not history:
        return query
    normalized = re.sub(r"\s+", " ", (query or "").casefold()).strip()
    short_question = len(normalized.split()) <= 8 and bool(re.match(
        r"^(?:(?:and|also)\s+)?(?:who|where|when|what|how)\b", normalized
    ))
    regional_cues = (
        "sin-o ang pangutan-on", "kinsa akong pangutan-on", "kinsa ako pangutan-on",
        "hain ako pakiana", "hain man", "sin-o man", "kinsa man", "ano naman",
        "ano it", "unsa man", "kasano met", "ania met",
    )
    if not short_question and not any(cue in normalized for cue in regional_cues):
        return query
    previous_user = next((
        str(item.get("content", "")).strip()
        for item in reversed(history)
        if item.get("role") == "user" and str(item.get("content", "")).strip()
    ), "")
    if not previous_user:
        return query
    return f"{previous_user[:500]}\nFollow-up: {query}"


class ChatService:
    @staticmethod
    def _approved_document_fee_answer(query: str, language_code: str) -> dict | None:
        """Answer owner-approved document fee questions without an LLM."""
        normalized = query.casefold()
        fee_cues = (
            "fee", "fees", "how much", "magkano", "bayad", "bayranan", "presyo", "cost", "price",
            "tagpira", "tag pira", "pira", "pila", "mano",
        )
        has_fee_cue = any(
            re.search(rf"(?<!\w){re.escape(term)}(?!\w)", normalized)
            for term in fee_cues
        )
        if not has_fee_cue:
            return None
        fee_file = "document_fees_user_approved.txt"
        if fee_file not in APPROVED_STATIC_SOURCES:
            return None
        base_dir = Path(__file__).resolve().parents[1] / "data" / "knowledge_base"
        try:
            content = (base_dir / fee_file).read_text(encoding="utf-8").strip()
        except OSError:
            return None
        if not content:
            return None

        # Check specific names before their shorter aliases (e.g. "certified
        # true copy of grades" must not be confused with a second copy).
        fee_options = [
            ("certified true copy - copy of grades", ("certified true copy", "true copy", "ctc", "certified copy of grades"), "certified true copy - copy of grades"),
            ("good moral", ("good moral", "moral certificate", "good moral certificate"), "certificate of good moral"),
            ("2nd copy of grades", ("2nd copy", "second copy", "copy of grades", "grades copy", "ikalawang kopya ng grado", "ikaduha nga kopya sa grado", "maikadua a kopya ti grado", "ikaduha nga kopya sang grado", "ikaduha nga kopya han grado"), "2nd copy of grades"),
            ("cor", ("certificate of registration", "cor"), "cor:"),
            ("tor", ("transcript of records", "transcript", "tor"), "tor:"),
            ("coe", ("certificate of enrollment", "coe"), "coe:"),
        ]
        def contains_term(term: str) -> bool:
            return bool(re.search(rf"(?<!\w){re.escape(term)}(?!\w)", normalized))

        matched = next((
            name for name, terms, _ in fee_options
            if any(contains_term(term) for term in terms)
        ), None)
        tuition_cues = ("tuition", "matrikula", "matriculation")
        asks_about_tuition = any(contains_term(term) for term in tuition_cues)
        document_terms = ("document", "documents", "dokumento", "dokumentos", "document request", "mga dokumento")
        asks_for_all_document_fees = any(contains_term(term) for term in document_terms)
        if asks_about_tuition:
            return None
        if matched is None and not asks_for_all_document_fees:
            return None
        lines = content.splitlines()
        fee_text = DOCUMENT_FEE_MESSAGES.get(language_code, DOCUMENT_FEE_MESSAGES["en"])
        if matched:
            row_marker = next(marker for name, _, marker in fee_options if name == matched)
            selected = [line for line in lines if line.lstrip("- ").casefold().startswith(row_marker)]
        else:
            selected = [
                line for line in lines if line.lstrip().startswith("-")
            ]

        rendered_lines = []
        fee_items = []
        include_tor_note = False
        for line in selected:
            row = re.match(
                r"\s*[-*]\s*(?P<label>.+?):\s*PHP\s*(?P<amount>[\d,]+(?:\.\d{1,2})?)\s+per\s+(?P<unit>copy|page)\b",
                line,
                flags=re.I,
            )
            if not row:
                continue
            label = row.group("label").strip()
            amount = row.group("amount")
            unit = row.group("unit").casefold()
            unit_key = "per_page" if unit == "page" else "per_copy"
            rendered_lines.append(f"- {label}: PHP {amount} {fee_text[unit_key]}.")
            fee_items.append({"label": label, "amount": amount, "unit": unit})
            if label.casefold() == "tor":
                include_tor_note = True

        answer = fee_text["heading"] + "\n" + "\n".join(rendered_lines)
        if include_tor_note:
            answer += "\n" + fee_text["tor_note"]
        return {
            "response": answer,
            "intent": "document_request",
            "confidence": 1.0,
            "escalate": False,
            "route": "policy",
            "action": None,
            "language": language_service.detect(query, preferred=language_code),
            "moderationCategories": [],
            "sources": [{
                "source": fee_file,
                "category": "document_fees",
                "similarity": 1.0,
                "content_snippet": content[:100] + ("..." if len(content) > 100 else ""),
            }],
            "fee_items": fee_items,
            "context_chunks": [{
                "content": "\n".join(selected),
                "source": fee_file,
                "category": "document_fees",
                "similarity": 1.0,
            }],
        }

    @staticmethod
    def _append_document_fee_answer(response: str, fee_answer: dict | None) -> str:
        if not fee_answer:
            return response
        normalized_response = re.sub(r"\s+", " ", response).casefold()
        name_aliases = {
            "certificate of good moral": ("certificate of good moral", "good moral", "moral certificate"),
            "2nd copy of grades": ("2nd copy of grades", "second copy of grades", "2nd copy", "second copy", "copy of grades"),
            "cor": ("certificate of registration", "cor"),
            "certified true copy - copy of grades": ("certified true copy", "true copy of grades", "certified copy of grades", "ctc"),
            "tor": ("transcript of records", "transcript", "tor"),
            "coe": ("certificate of enrollment", "coe"),
        }
        unit_patterns = {
            "copy": r"(?:\bper\s+copy\b|\bbawat\s+kopya\b|\bmatag\s+kopya\b|\bkada\s+kopya\b|\biti\s+tunggal\s+kopya\b)",
            "page": r"(?:\bper\s+page\b|\bbawat\s+pahina\b|\bmatag\s+panid\b|\bkada\s+pahina\b|\biti\s+tunggal\s+panid\b)",
        }

        def detail_is_already_answered(item: dict) -> bool:
            label = item["label"].casefold()
            aliases = name_aliases.get(label, (label,))
            label_present = any(
                re.search(rf"(?<!\w){re.escape(alias)}(?!\w)", normalized_response)
                for alias in aliases
            )
            amount = re.escape(item["amount"].replace(",", ""))
            amount_present = bool(re.search(
                rf"(?<!\d)(?:php\s*|₱\s*)?{amount}(?:\.0{{1,2}})?(?!\d)",
                normalized_response,
            ))
            unit_present = bool(re.search(unit_patterns[item["unit"]], normalized_response))
            return label_present and amount_present and unit_present

        details = [
            line.strip()
            for line in fee_answer["response"].splitlines()
            if line.lstrip().startswith(("-", "*")) and ":" in line
        ]
        fee_items = fee_answer.get("fee_items", [])
        missing_details = [
            detail
            for index, detail in enumerate(details)
            if index >= len(fee_items) or not detail_is_already_answered(fee_items[index])
        ]
        note = next((
            line.strip()
            for line in fee_answer["response"].splitlines()
            if "records office" in line.casefold() and "page" in line.casefold()
        ), None)
        note_already_answered = bool(
            "records office" in normalized_response
            and any(term in normalized_response for term in ("page", "pahina", "panid"))
        )
        if not missing_details and (not note or note_already_answered):
            return response
        answer_parts = []
        if missing_details:
            heading = next((
                line.strip()
                for line in fee_answer["response"].splitlines()
                if line.strip() and not line.lstrip().startswith(("-", "*"))
                and not ("records office" in line.casefold() and "page" in line.casefold())
            ), None)
            if heading:
                answer_parts.append(heading)
            answer_parts.extend(missing_details)
        if note and not note_already_answered:
            answer_parts.append(note)
        return f"{response.rstrip()}\n\n{' '.join(answer_parts) if not missing_details else chr(10).join(answer_parts)}"

    @staticmethod
    def _remove_separately_answered_fee_claims(response: str, fee_answer: dict | None) -> str:
        """Remove model fee commentary when ARIA will append the approved fee."""
        if not fee_answer or not response:
            return response
        fee_terms = (
            r"fees?|costs?|prices?|amounts?|tuition|matrikula|bayad|bayranan|"
            r"presyo|pila|pira|tagpira|magkano|halaga"
        )
        sentence = re.compile(
            rf"(?i)(?<!\d)[^.!?\r\n]*\b(?:{fee_terms})\b[^.!?\r\n]*[.!?]"
        )
        cleaned = sentence.sub("", response)
        cleaned = re.sub(r"(?m)^[ \t]*[;,:!?][ \t]*$", "", cleaned)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        return cleaned.strip()

    @staticmethod
    def _enrollment_provider_fallback(
        query: str,
        language_code: str,
        asks_tuition: bool,
        context_chunks: list[dict],
    ) -> str | None:
        """Give a short localized answer from interview evidence if generation is down."""
        has_interview_source = any(
            chunk.get("source") == "enrollment_interview_guidance.txt"
            for chunk in context_chunks
        )
        if not has_interview_source:
            return None

        if _has_query_marker(query, TRANSFEREE_ENROLLMENT_MARKERS):
            key = "enrollment_transferee_fallback"
        elif _has_query_marker(query, RETURNING_ENROLLMENT_MARKERS):
            key = "enrollment_returning_fallback"
        elif _has_query_marker(query, NEW_STUDENT_ENROLLMENT_MARKERS):
            key = "enrollment_new_fallback"
        else:
            key = "enrollment_continuing_fallback"

        answer = message(language_code, key)
        if asks_tuition:
            answer += "\n\n" + message(language_code, "tuition_unverified")
        return answer

    @staticmethod
    def _student_services_provider_fallback(context_chunks: list[dict]) -> str | None:
        """Return the approved FAQ answer when generation fails or is rejected.

        FAQ chunks are stored as Q/A records. Returning only their A section,
        plus the source's currentness caveat, avoids losing a verified answer
        just because the external model timed out or produced an unsupported
        claim.
        """
        for chunk in context_chunks or []:
            if chunk.get("source") != "student_services_faq_2026.txt":
                continue
            content = str(chunk.get("content", ""))
            answer_match = re.search(
                r"(?ims)^\s*A:\s*(.*?)(?=^\s*Source\s*:|\Z)",
                content,
            )
            if not answer_match:
                continue
            answer = answer_match.group(1).strip().replace("\r\n", "\n")
            answer = re.sub(r"[ \t]*\n[ \t]*\n(?:[ \t]*\n)*", "\n\n", answer)
            answer = re.sub(
                r"(?<!\n)\n(?!\n)(?![ \t]*(?:[•*\-]|\d+[.)]|Step\s+\d+\b))",
                " ",
                answer,
            )
            answer = re.sub(r"[ \t]+", " ", answer).strip()
            currentness = next((
                line.split(":", 1)[1].strip()
                for line in content.splitlines()
                if line.strip().casefold().startswith("currentness:")
            ), "")
            if currentness and currentness.casefold() not in answer.casefold():
                answer = f"{answer}\n\n{currentness}"
            if answer:
                return answer
        return None

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
        routing_query = _with_follow_up_context(query, history)

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

        curriculum_query = is_curriculum_query(query)
        curriculum_entities = entity_service.extract_curriculum_request(query)
        full_list_requested = is_full_course_list_query(query) and (
            curriculum_entities["request_type"] == "curriculum_question"
            or is_explicit_full_course_list_query(query)
        )
        curriculum_source, curriculum_source_from_history = (
            get_curriculum_source(query, history)
            if curriculum_query or is_curriculum_follow_up(query)
            else (None, False)
        )
        curriculum_query = curriculum_query or curriculum_source is not None
        scope = scope_service.route(routing_query)
        if curriculum_query and scope["route"] == "out_of_scope":
            scope = {"route": "policy", "action": None, "inScope": True}
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
        document_fee_answer = None
        if scope["route"] == "policy":
            fee_answer = self._approved_document_fee_answer(query, language_code)
            if fee_answer:
                if _has_query_marker(routing_query, ENROLLMENT_MARKERS):
                    document_fee_answer = fee_answer
                else:
                    return fee_answer
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

        asks_enrollment = _has_query_marker(routing_query, ENROLLMENT_MARKERS)
        asks_tuition = _has_query_marker(routing_query, TUITION_MARKERS) or (
            asks_enrollment
            and not document_fee_answer
            and _has_query_marker(routing_query, PAYMENT_AMOUNT_MARKERS)
        )
        combined_context_chunks = None
        if asks_enrollment or asks_tuition:
            enrollment_chunks = (
                retrieval_service.retrieve(routing_query, limit=4, category="enrollment_policy")
                if asks_enrollment else []
            )
            payment_chunks = (
                retrieval_service.retrieve(routing_query, limit=4, category="payment_policy")
                if asks_tuition else []
            )
            combined_context_chunks = enrollment_chunks + payment_chunks

        if curriculum_query and is_ambiguous_filipino_bsed(query):
            return self._fixed_result(
                response_service.clarify_filipino_bsed_year(language_code),
                "curriculum_inquiry",
                1.0,
                False,
                "policy",
                language,
                moderation,
            )

        if curriculum_query and not curriculum_source and is_course_list_query(query):
            return self._fixed_result(
                response_service.ask_for_program(language_code),
                "curriculum_inquiry",
                1.0,
                False,
                "clarification",
                language,
                moderation,
            )

        lowered = query.casefold()
        if asks_enrollment:
            intent = "enrollment_inquiry"
            confidence = 1.0
            classified = None
        elif asks_tuition:
            intent = "payment_inquiry"
            confidence = 1.0
            classified = None
        elif any(marker in lowered for marker in EXAM_MARKERS):
            intent = "examination_permit_inquiry"
            confidence = 1.0
            classified = None
        elif _has_query_marker(routing_query, ("inc", "incomplete")):
            # INC completion and form handling are grading-service questions.
            # The classifier sometimes mistakes them for enrollment queries.
            intent = "grade_inquiry"
            confidence = 1.0
            classified = None
        elif scope_service.is_student_services_faq_query(routing_query):
            # These are clear school-service FAQ requests, but the intent
            # classifier has no dedicated labels for dates, office contacts,
            # payment methods, or INC procedures. Route them to retrieval
            # instead of letting a low-margin prediction ask for clarification.
            intent = "general_inquiry"
            confidence = 1.0
            classified = None
        else:
            classified = intent_service.predict(routing_query)
            routed = intent_router.resolve(classified)
            if routed["unavailable"]:
                result = self._fixed_result(
                    message(language_code, "clarify"),
                    routed["intent"],
                    routed["confidence"],
                    False,
                    "clarification",
                    language,
                    moderation,
                    second_intent=routed["second_intent"],
                    second_confidence=routed["second_confidence"],
                    margin=routed["margin"],
                    model_version=routed["model_version"],
                )
                result["quotaRefund"] = True
                return result
            if routed["needs_clarification"] and not curriculum_source:
                result = self._fixed_result(
                    intent_router.clarification(routed, language_code),
                    routed["intent"],
                    routed["confidence"],
                    False,
                    "clarification",
                    language,
                    moderation,
                    second_intent=routed["second_intent"],
                    second_confidence=routed["second_confidence"],
                    margin=routed["margin"],
                    model_version=routed["model_version"],
                )
                result["quotaRefund"] = True
                return result
            intent = routed["intent"]
            confidence = routed["confidence"]

        if curriculum_source:
            intent = "curriculum_inquiry"
            confidence = max(confidence, 0.95)
        elif (curriculum_query or intent == "curriculum_inquiry") and is_course_list_query(query):
            return self._fixed_result(
                response_service.ask_for_program(language_code),
                "curriculum_inquiry",
                0.9,
                False,
                "policy",
                language,
                moderation,
            )

        category = (
            "student_services_faq"
            if intent == "general_inquiry" and scope_service.is_student_services_faq_query(routing_query)
            else INTENT_CATEGORIES.get(intent)
        )
        if combined_context_chunks is not None:
            context_chunks = combined_context_chunks
        elif intent == "curriculum_inquiry" and curriculum_source:
            if full_list_requested:
                context_chunks = curriculum_service.retrieve(curriculum_source)
            else:
                context_chunks = curriculum_service.retrieve_for_query(
                    curriculum_source,
                    query,
                    curriculum_entities["course_codes"],
                    course_name=curriculum_entities.get("course_name"),
                )
        else:
            context_chunks = retrieval_service.retrieve(routing_query, limit=3, category=category)

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
            if document_fee_answer:
                missing_enrollment = message(language_code, "enrollment_unverified")
                result = self._fixed_result(
                    f"{missing_enrollment}\n\n{document_fee_answer['response']}",
                    intent,
                    confidence,
                    False,
                    "partially_answered",
                    language,
                    moderation,
                )
                result["sources"] = document_fee_answer["sources"]
                result["quotaRefund"] = True
                return result
            missing_key = (
                "enrollment_and_tuition_unverified" if intent == "enrollment_inquiry" and asks_tuition
                else "enrollment_unverified" if intent == "enrollment_inquiry"
                else "tuition_unverified" if intent == "payment_inquiry"
                else "knowledge_unavailable"
            )
            result = self._fixed_result(
                message(language_code, missing_key),
                intent,
                confidence,
                False,
                "knowledge_gap",
                language,
                moderation,
            )
            result["quotaRefund"] = True
            return result

        # Examination-permit policy is an approved, deterministic institutional
        # rule. Return the complete localized wording directly instead of
        # allowing long conversation history or provider output limits to cut
        # an official instruction off mid-sentence. Retrieved policy sources
        # remain attached for transparency.
        if intent == "examination_permit_inquiry":
            result = self._fixed_result(
                message(language_code, "exam_permit"),
                intent,
                confidence,
                False,
                "policy",
                language,
                moderation,
            )
            result["sources"] = self._sources(context_chunks)
            return result

        response_plan = response_service.plan(
            query=query,
            intent=intent,
            context_chunks=context_chunks,
            history=history,
            request_type=(
                "full_list" if full_list_requested else curriculum_entities["request_type"]
            ) if intent == "curriculum_inquiry" else None,
        )
        if combined_context_chunks is not None and asks_enrollment and asks_tuition:
            response_plan["mode"] = "explanation"
            response_plan["instructions"] = (
                "Answer the enrollment procedure from the supplied enrollment source. "
                "The supplied sources do not establish a tuition amount unless an explicit tuition source appears below. "
                "In that case, clearly say the amount is not specified. Do not let missing price information suppress the enrollment answer."
            )

        # Exhaustive curriculum lists must include every verified course row.
        # Let the intent classifier and source selector choose the right
        # dataset, then preserve that approved source in the reply verbatim;
        # generative models can stop mid-list even with a larger token budget.
        if (
            intent == "curriculum_inquiry"
            and curriculum_source
            and response_plan["mode"] == "curriculum_full_list"
        ):
            full_answer = curriculum_service.format_full_answer(
                curriculum_source,
                context_chunks,
                language_code,
            )
            if full_answer:
                result = self._fixed_result(
                    full_answer,
                    intent,
                    confidence,
                    False,
                    "policy",
                    language,
                    moderation,
                )
                result["sources"] = self._sources(context_chunks)
                return result

        if intent == "curriculum_inquiry" and curriculum_source:
            fact_answer = curriculum_service.format_course_answer(
                curriculum_source,
                context_chunks,
                curriculum_entities["request_type"],
                curriculum_entities["course_codes"],
                curriculum_entities.get("course_name"),
                language_code,
            )
            if fact_answer:
                result = self._fixed_result(
                    fact_answer,
                    intent,
                    confidence,
                    False,
                    "policy",
                    language,
                    moderation,
                )
                result["sources"] = self._sources(context_chunks)
                return result

        if intent == "enrollment_inquiry":
            system_prompt = (
                "You are ARIA, the academic adviser for Regis Marie College. Reply in "
                f"{language['name']} in a concise, natural tone. Answer only the question, using only the supplied context. "
                "Enrollment context comes from interview notes, not a complete formal policy; attribute it to those notes. "
                "Do not invent dates, costs, requirements, or staff. Answer supported steps even when another requested detail is missing. "
                "Do not claim a human was contacted."
            )
            if combined_context_chunks is not None and asks_tuition:
                system_prompt += " The sources do not give a verified tuition amount; say so briefly and still answer the supported enrollment steps."
        else:
            system_prompt = (
                "You are ARIA, the academic advisory assistant for Regis Marie College. "
                "Answer only academic advising and authorized student-service questions. "
                "Use only the verified institutional context supplied with this request. "
                "Never invent grades, schedules, balances, enrollment status, student records, "
                "fees, deadlines, exceptions, or staff details. Personal SISP records are handled "
                "by deterministic portal services, not by you. If the verified context does not "
                "contain a requested detail, identify that detail specifically and answer any other "
                "supported part. Do not claim that a human advisor was contacted. Respond in "
                f"{language['name']} using a {language['register']} conversational register. "
                "Preserve policy facts exactly even when paraphrasing. Keep the response concise and clear. "
                f"Response mode: {response_plan['mode']}. {response_plan['instructions']} "
                "Do not repeat the user's question as a filler opening."
            )
        if intent != "enrollment_inquiry" and any(
            chunk.get("source") == "enrollment_interview_guidance.txt"
            for chunk in context_chunks
        ):
            system_prompt += (
                " The enrollment source is qualified interview evidence, not a complete formal policy. "
                "Attribute its relevant guidance naturally as information from the College interview notes. "
                "Do not present it as a guaranteed current rule, infer missing fees or dates, or add facts from other sources."
            )
        if intent == "curriculum_inquiry":
            system_prompt += (
                " For a request for all subjects in a named program, use every supplied curriculum section and list the courses "
                "completely, grouped by academic year and trimester; keep course codes and official course names. "
                "The curriculum is the program's planned course sequence, not proof of the student's current enrollment. "
                "If the user says 'my subjects' but only the curriculum is available, say that distinction naturally and do not claim these are their currently enrolled classes. "
                "Answer in the detected language and keep any explanation brief."
            )
        if combined_context_chunks is not None and asks_enrollment and asks_tuition:
            system_prompt += (
                " Answer the enrollment steps from the supplied enrollment evidence. The sources do not give a verified tuition amount; say that specifically and do not guess. Keep the supported enrollment answer even though the price is missing."
            )
        if document_fee_answer:
            system_prompt += (
                " Answer only the enrollment steps here. Do not mention fees, costs, amounts, or unrelated missing details."
            )
        llm_history = [
            ConversationMessage(item["role"], item["content"][:2000])
            for item in (
                history[-4:]
                if intent == "curriculum_inquiry" and curriculum_source_from_history and is_curriculum_follow_up(query)
                else [] if intent == "curriculum_inquiry" else history
            )
            if item.get("role") in {"user", "assistant"} and item.get("content", "").strip()
        ]

        request = LLMRequest(
            system_prompt=system_prompt,
            user_prompt=query,
            history=llm_history,
            context_chunks=context_chunks,
            max_tokens=(
                max(settings.llm_max_tokens, 2200)
                if intent == "curriculum_inquiry"
                else min(settings.llm_max_tokens, 260)
                if intent == "enrollment_inquiry"
                else settings.llm_max_tokens
            ),
        )
        try:
            generated = await llm_router.generate(request)
            validation = response_validator.validate(generated.text, context_chunks)
            if validation.valid:
                response_text = generated.text.strip()
                escalate = False
                route = "policy"
            else:
                logger.warning(
                    "response_rejected intent=%s language=%s issues=%s",
                    intent,
                    language_code,
                    ",".join(validation.issues),
                )
                response_text = (
                    self._enrollment_provider_fallback(
                        routing_query,
                        language_code,
                        asks_tuition,
                        context_chunks,
                    )
                    if intent == "enrollment_inquiry"
                    else None
                )
                if not response_text and intent != "enrollment_inquiry":
                    response_text = self._student_services_provider_fallback(context_chunks)
                if response_text:
                    route = "policy_fallback"
                else:
                    response_text = message(language_code, "knowledge_unavailable")
                    route = "knowledge_gap"
                escalate = False
        except AllProvidersFailed:
            if intent == "examination_permit_inquiry":
                response_text = message(language_code, "exam_permit")
                escalate = False
                route = "policy"
            elif intent == "enrollment_inquiry":
                response_text = self._enrollment_provider_fallback(
                    routing_query,
                    language_code,
                    asks_tuition,
                    context_chunks,
                )
                if response_text:
                    escalate = False
                    route = "partially_answered" if asks_tuition else "policy_fallback"
                else:
                    response_text = self._student_services_provider_fallback(context_chunks)
                    if response_text:
                        escalate = False
                        route = "policy_fallback"
                    else:
                        response_text = message(language_code, "provider_unavailable")
                        escalate = False
                        route = "provider_unavailable"
            elif intent == "curriculum_inquiry" and curriculum_source:
                progression_answer = curriculum_service.format_progression_answer(
                    curriculum_source,
                    query,
                    language_code,
                )
                if progression_answer:
                    response_text = progression_answer
                    escalate = False
                    route = "policy"
                else:
                    response_text = message(language_code, "provider_unavailable")
                    escalate = False
                    route = "provider_unavailable"
            else:
                response_text = self._student_services_provider_fallback(context_chunks)
                if response_text:
                    escalate = False
                    route = "policy_fallback"
                else:
                    response_text = message(language_code, "provider_unavailable")
                    escalate = False
                    route = "provider_unavailable"

        response_text = self._remove_separately_answered_fee_claims(
            response_text,
            document_fee_answer,
        )
        response_text = self._append_document_fee_answer(response_text, document_fee_answer)
        source_chunks = list(context_chunks)
        if document_fee_answer:
            source_chunks.extend(document_fee_answer.get("context_chunks", []))
        result_sources = self._sources(source_chunks)
        result = {
            "response": response_text,
            "intent": intent,
            "confidence": confidence,
            "escalate": escalate,
            "route": route,
            "action": None,
            "language": language,
            "moderationCategories": [item["category"] for item in moderation["categories"]],
            "sources": result_sources,
            "second_intent": classified.get("second_intent") if classified else None,
            "second_confidence": classified.get("second_confidence") if classified else None,
            "margin": classified.get("margin") if classified else None,
            "model_version": classified.get("model_version") if classified else None,
        }
        if route in {"provider_unavailable", "knowledge_gap"}:
            result["quotaRefund"] = True
        logger.info(
            "chat_completed intent=%s language=%s route=%s source_count=%s",
            intent,
            language_code,
            route,
            len(result_sources),
        )
        return result

    @staticmethod
    def _sources(context_chunks: list[dict]) -> list[dict]:
        sources = {}
        for chunk in context_chunks:
            name = chunk.get("source", "institutional source")
            category = chunk.get("category", "policy")
            key = (name, category)
            current = sources.get(key)
            similarity = float(chunk.get("similarity", 0.0))
            if current is None or similarity > current["similarity"]:
                content = chunk.get("content", "")
                sources[key] = {
                    "source": name,
                    "category": category,
                    "similarity": similarity,
                    "content_snippet": content[:100] + ("..." if len(content) > 100 else ""),
                }
        return list(sources.values())

    @staticmethod
    def _fixed_result(
        response: str,
        intent: str,
        confidence: float,
        escalate: bool,
        route: str,
        language: dict,
        moderation: dict,
        second_intent: str | None = None,
        second_confidence: float | None = None,
        margin: float | None = None,
        model_version: str | None = None,
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
            "second_intent": second_intent,
            "second_confidence": second_confidence,
            "margin": margin,
            "model_version": model_version,
        }


chat_service = ChatService()
