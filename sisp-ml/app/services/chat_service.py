from app.config import get_settings
from app.services.intent_service import intent_service
from app.services.intent_router import intent_router
from app.services.entity_service import entity_service
from app.services.response_service import response_service
from app.services.response_validator import response_validator
from app.services.language_service import language_service
from app.services.llm.errors import AllProvidersFailed
from app.services.llm.models import LLMRequest
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
    extract_curriculum_filters,
    extract_curriculum_filters_with_history,
    infer_next_term_filters,
    is_ambiguous_next_term_follow_up,
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
    "after time away", "after time away from school", "student returning",
    "resume studying", "return to school", "bumalik sa pag aaral", "babalik sa pag aaral",
    "nagbabalik", "balik eskwela", "mibalik sa eskwela", "mobalik sa eskwela",
    "ag subli", "agsubli", "ag subli kalpasan", "agsubli kalpasan",
    "nagbalik eskwela", "nabalik ha eskwelahan", "mobalik human mohunong",
    "mobalik human mohunong sa pag eskwela", "mobalik pagkatapos mohunong",
    "nagabalik matapos sang pag untat", "mabalik pagkatapos sang pag untat",
    "nagabalik pagkatapos sang pag untat sa pag eskwela",
    "mabalik katapos umundang", "katapos umundang", "mabalik ha eskwelahan",
    "mobalik ko human mohunong", "mobalik ko human mohunong sa pag eskwela",
    "agsubliak kalpasan", "ag subliak kalpasan", "mabalik ako pagkatapos sang",
    "mabalik ako ha eskwelahan katapos umundang",
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


def _faq_question_fragment(chunk: dict) -> str:
    content = str(chunk.get("content", ""))
    match = re.search(r"(?is)^.*?\bQ:\s*(.*?)(?=\n\s*A:)", content)
    return re.sub(r"\s+", " ", match.group(1)).strip().casefold() if match else ""


def _with_follow_up_context(query: str, history: list[dict]) -> str:
    """Use the last user turn for short referential questions, without changing the prompt."""
    if not history:
        return query
    normalized = re.sub(r"\s+", " ", (query or "").casefold()).strip()
    self_contained_markers = (
        "how much", "how many", "fee", "fees", "cost", "price", "prerequisite", "prereq",
        "course", "courses", "subject", "subjects", "curriculum", "schedule", "trimester",
        "term", "enrollment", "enrolment", "grade", "grades", "special exam", "inc", "document",
    )
    if _has_query_marker(normalized, self_contained_markers):
        return query
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


def _normalize_common_question_typos(query: str) -> str:
    """Normalize a small set of common texting abbreviations before routing."""
    return re.sub(r"(?i)\bhw\s*mch\b", "how much", query or "")


def _remove_trailing_generation_artifact(response: str) -> str:
    """Remove a stray standalone lowercase 's' occasionally appended by a model."""
    return re.sub(r"(?<=[.!?])s\s*$", "", response or "").rstrip()


class ChatService:
    @staticmethod
    def _approved_document_fee_answer(query: str, language_code: str) -> dict | None:
        """Answer owner-approved document fee questions without an LLM."""
        normalized = query.casefold()
        fee_cues = (
            "fee", "fees", "how much", "magkano", "bayad", "bayranan", "presyo", "cost", "costs", "price", "prices",
            "total", "altogether", "combined amount", "what should i expect",
            "tagpira", "tag pira", "tagpila", "tag pila", "pira", "pila", "mano",
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

        matched_names = [
            name for name, terms, _ in fee_options
            if any(contains_term(term) for term in terms)
        ]
        matched = matched_names[0] if matched_names else None
        tuition_cues = ("tuition", "matrikula", "matriculation")
        asks_about_tuition = any(contains_term(term) for term in tuition_cues)
        document_terms = (
            "document", "documents", "dokumento", "dokumentos", "document request",
            "document requests", "document request fee", "document request fees",
            "request fees", "mga dokumento",
        )
        asks_for_all_document_fees = any(contains_term(term) for term in document_terms)
        if asks_about_tuition:
            return None
        if matched is None and not asks_for_all_document_fees:
            return None
        lines = content.splitlines()
        fee_text = DOCUMENT_FEE_MESSAGES.get(language_code, DOCUMENT_FEE_MESSAGES["en"])
        if matched:
            row_markers = {
                marker for name, _, marker in fee_options if name in matched_names
            }
            selected = [
                line for line in lines
                if line.lstrip("- ").casefold().startswith(tuple(row_markers))
            ]
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
        page_count = None
        if include_tor_note:
            page_count = re.search(
                r"(?<!\w)(?P<count>\d{1,4}|one|two|three|four|five|six|seven|eight|nine|ten)"
                r"\s*(?:-\s*)?(?:pages?|pgs?|pp\.?|pahinas?|panid)(?!\w)",
                normalized,
            )
            tor_fee = next(
                (item for item in fee_items if item["label"].casefold() == "tor"),
                None,
            )
            if page_count and tor_fee:
                count_text = page_count.group("count").casefold()
                count = int(count_text) if count_text.isdigit() else {
                    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
                    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
                }[count_text]
                rate = int(tor_fee["amount"].replace(",", ""))
                total = rate * count
                answer += "\n" + fee_text["tor_total"].format(
                    pages=count,
                    rate=f"{rate:,}",
                    total=f"{total:,}",
                )
            asks_combined_total = any(contains_term(term) for term in (
                "total", "altogether", "combined amount", "what should i expect",
            ))
            if asks_combined_total and len(fee_items) > 1:
                quantity_words = {
                    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
                    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
                }
                combined_total = 0
                has_all_quantities = True
                for item in fee_items:
                    if item["label"].casefold() == "tor":
                        if not page_count:
                            has_all_quantities = False
                            continue
                        page_text = page_count.group("count").casefold()
                        quantity = int(page_text) if page_text.isdigit() else quantity_words[page_text]
                    else:
                        aliases = next(
                            terms for name, terms, _ in fee_options
                            if name == item["label"].casefold()
                        )
                        quantity = 1
                        for alias in aliases:
                            escaped = re.escape(alias)
                            quantity_match = re.search(
                                rf"(?<!\w)(?P<count>\d+|one|two|three|four|five|six|seven|eight|nine|ten)"
                                rf"\s+(?:(?:copies|copy)\s+of\s+)?{escaped}(?!\w)",
                                normalized,
                            )
                            if quantity_match:
                                count_text = quantity_match.group("count").casefold()
                                quantity = int(count_text) if count_text.isdigit() else quantity_words[count_text]
                                break
                    combined_total += int(item["amount"].replace(",", "")) * quantity
                if has_all_quantities:
                    answer += f"\nThe listed combined amount is PHP {combined_total:,}, based on the quantities you gave."
                elif any(item["label"].casefold() == "tor" for item in fee_items):
                    answer += "\nI can calculate the combined amount once the Records Office confirms the TOR page count."
            answer += "\n" + fee_text["tor_note"]
        comparison_markers = (
            "compare", "compared", "comparison", "difference", "versus", " vs ",
            "how much more", "how much less", "kumpara", "pagtandi", "pagkumpara",
        )
        asks_for_comparison = any(contains_term(term) for term in comparison_markers)
        if asks_for_comparison and len(fee_items) == 2 and fee_items[0]["unit"] == fee_items[1]["unit"]:
            first, second = fee_items
            first_amount = int(first["amount"].replace(",", ""))
            second_amount = int(second["amount"].replace(",", ""))
            unit = fee_text["per_page"] if first["unit"] == "page" else fee_text["per_copy"]
            if first_amount == second_amount:
                answer += "\n" + fee_text["comparison_same"].format(
                    first=first["label"], second=second["label"], amount=f"{first_amount:,}", unit=unit
                )
            else:
                higher, lower = (first, second) if first_amount > second_amount else (second, first)
                answer += "\n" + fee_text["comparison_more"].format(
                    higher=higher["label"], lower=lower["label"],
                    difference=f"{abs(first_amount - second_amount):,}", unit=unit,
                )
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
    def _student_services_provider_fallback(
        context_chunks: list[dict],
        language_code: str = "en",
    ) -> str | None:
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
            question = _faq_question_fragment(chunk)
            if "inc form processing period" in question:
                return message(language_code, "inc_form_processing_period")
            if "where should i pay the fee for a special exam" in question:
                return message(language_code, "special_exam_payment")
            if "how do i process a special exam" in question and language_code != "en":
                return message(language_code, "special_exam_process")
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

    @staticmethod
    def _direct_policy_answer(query: str, language_code: str) -> tuple[str, str, str, tuple[str, ...]] | None:
        """Answer recurring interview/source-gap questions without uncertain routing."""
        normalized = re.sub(r"\s+", " ", (query or "").casefold()).strip()

        def has(*phrases: str) -> bool:
            return _has_query_marker(normalized, tuple(phrases))

        if has("can aria directly change", "can aria change a grade", "can aria edit my grade", "change a grade in my record"):
            return (
                message(language_code, "aria_grade_edit_capability"),
                "grade_inquiry",
                "policy",
                ("enrollment_interview_guidance.txt",),
            )

        if has("down-payment", "down payment", "downpayment", "paunang bayad", "unang bayad") and has(
            "by itself", "alone", "prove", "proof", "active", "status", "complete", "enough",
            "sapat", "patunay", "aktibo", "igo ba", "mismo", "kompleto", "kumpleto",
        ):
            return (
                message(language_code, "down_payment_not_sufficient"),
                "enrollment_inquiry",
                "policy",
                ("enrollment_interview_guidance.txt",),
            )

        if has("someone else", "another person", "representative", "someone requests", "other person") and has(
            "student information", "student's information", "student records", "student data", "requests my information"
        ):
            return (
                message(language_code, "representative_authorization"),
                "general_inquiry",
                "policy",
                ("enrollment_interview_guidance.txt",),
            )

        if has("grade appeal", "appeal a final grade", "appeal deadline", "posted grade", "incorrect grade", "wrong grade") or (
            has("grade") and has("incorrect", "wrong", "appeal")
        ):
            return (
                message(language_code, "grade_correction_unspecified"),
                "grade_inquiry",
                "knowledge_gap",
                ("enrollment_interview_guidance.txt",),
            )

        if scope_service.is_subject_change_query(normalized) and has(
            "fee", "fees", "how much", "magkano", "pila", "cost", "price", "amount"
        ) and has("deadline", "old deadline", "what date", "when", "current"):
            return (
                message(language_code, "add_drop_fee_deadline_historical"),
                "general_inquiry",
                "policy",
                ("student_services_faq_2026.txt",),
            )

        if has("online", "entirely online", "fully online", "online only") and has(
            "enrollment", "enrolment", "enroll", "enrol"
        ):
            return (
                message(language_code, "online_enrollment_unspecified"),
                "enrollment_inquiry",
                "partially_answered",
                ("enrollment_interview_guidance.txt",),
            )

        if has("online payment method", "online payment methods", "payment methods", "payment options"):
            return (
                message(language_code, "online_payment_methods"),
                "payment_inquiry",
                "policy",
                ("student_services_faq_2026.txt",),
            )

        if has("tuition", "matrikula", "matriculation") and not has(*ENROLLMENT_MARKERS) and has(
            "how much", "amount", "fee", "cost", "price", "next term", "next semester", "upcoming"
        ):
            return (
                message(language_code, "tuition_unverified"),
                "payment_inquiry",
                "knowledge_gap",
                (),
            )

        if has("exam permit", "examination permit", "permit for exam", "permit for exams") and not has(
            "special exam", "special examination"
        ):
            return (
                message(language_code, "exam_permit_scope_unknown"),
                "examination_permit_inquiry",
                "knowledge_gap",
                ("student_services_faq_2026.txt",),
            )

        if (
            has("student details", "student information", "personal information", "personal data")
            and has("records", "records office")
            and has("update", "updating", "change", "correct", "requesting", "discuss", "tell")
        ):
            return (
                message(language_code, "record_update_fields"),
                "general_inquiry",
                "policy",
                ("enrollment_interview_guidance.txt",),
            )

        if has("record update", "record updates", "records update", "updating records", "updating both portal", "portal and paper", "portal and paper records") and (
            has("form", "workflow", "complete", "exact", "which office", "contact")
        ):
            return (
                message(language_code, "record_update_unspecified"),
                "general_inquiry",
                "knowledge_gap",
                ("enrollment_interview_guidance.txt",),
            )

        if has("records", "records office") and has("services", "responsibilities", "documents/services", "documents", "maintain"):
            return (
                message(language_code, "records_services"),
                "general_inquiry",
                "policy",
                ("enrollment_interview_guidance.txt",),
            )

        if has("late enrollment", "late enrolment", "enroll late", "enrol late", "register late"):
            return (
                message(language_code, "late_enrollment_guidance"),
                "enrollment_inquiry",
                "policy",
                ("enrollment_interview_guidance.txt",),
            )

        if has(*TRANSFEREE_ENROLLMENT_MARKERS) and has(
            "document", "documents", "dokumento", "dokumentos", "checklist", "requirements",
            "requirement", "papers", "submit", "complete list", "listaan", "lista", "kasapulan",
        ):
            return (
                message(language_code, "enrollment_transferee_fallback"),
                "enrollment_inquiry",
                "partially_answered",
                ("enrollment_interview_guidance.txt",),
            )

        if has(*RETURNING_ENROLLMENT_MARKERS) and has(
            "what should", "what do", "what steps", "first", "how do", "what to do", "unsa", "ania", "ania ti", "ano"
        ):
            return (
                message(language_code, "enrollment_returning_fallback"),
                "enrollment_inquiry",
                "policy",
                ("enrollment_interview_guidance.txt",),
            )

        if has("continuing student", "continuing students", "continue my studies", "continuing studies") and has(
            "what should", "what do", "what steps", "before enrolling", "before enrollment", "first", "how do", "unsa", "ania", "ano"
        ):
            return (
                message(language_code, "enrollment_continuing_fallback"),
                "enrollment_inquiry",
                "policy",
                ("enrollment_interview_guidance.txt",),
            )

        asks_document_requirements = has(
            "document", "documents", "checklist", "requirements", "requirement",
            "papers", "what should i submit", "what do i submit", "what to submit",
        )
        asks_document_validity = has("validity", "valid", "verify", "verification", "check")
        if has("admissions") and asks_document_validity and (
            has("document", "documents", "information", "student information")
            or has("during enrollment", "during enrolment", "enrollment", "enrolment")
        ):
            return (
                message(language_code, "admissions_validation"),
                "enrollment_inquiry",
                "policy",
                ("enrollment_interview_guidance.txt",),
            )

        if has(
            "new student", "new applicant", "first time student", "first-time student",
            "bagong estudyante", "bagong aplikante", "baro nga estudiante",
        ) and asks_document_requirements:
            return (
                message(language_code, "new_student_checklist_unknown"),
                "enrollment_inquiry",
                "partially_answered",
                ("enrollment_interview_guidance.txt",),
            )

        asks_timing = has(
            "how long", "processing time", "processing times", "turnaround", "release date",
            "guaranteed", "exactly four weeks", "how many weeks", "take to process", "how long does",
        )
        is_tor = has("tor", "transcript of records", "transcript")
        if is_tor and asks_timing:
            return (
                message(language_code, "tor_processing_estimate"),
                "document_request",
                "partially_answered",
                ("enrollment_interview_guidance.txt",),
            )

        is_document_timing = has(
            "document request", "document requests", "six document", "certificate of good moral",
            "second copy of grades", "certified true copy", "coe", "cor", "document processing",
        )
        if is_document_timing and asks_timing:
            return (
                message(language_code, "document_processing_times"),
                "document_request",
                "partially_answered",
                ("document_fees_user_approved.txt", "enrollment_interview_guidance.txt"),
            )

        if has("class schedule", "schedule") and has(
            "upcoming", "next term", "new", "bagong", "darating na term",
            "sunod nga term", "masunod nga semester",
        ):
            return (
                message(language_code, "upcoming_schedule_unknown"),
                "general_inquiry",
                "knowledge_gap",
                ("student_services_faq_2026.txt",),
            )

        if has("inc form processing period", "inc form processing") and has("period", "when", "date", "february", "feb 24"):
            return (
                message(language_code, "inc_form_processing_period"),
                "grade_inquiry",
                "policy",
                ("student_services_faq_2026.txt",),
            )

        if has("where should i pay", "where do i pay", "where to pay") and has("special exam", "special examination"):
            return (
                message(language_code, "special_exam_payment"),
                "examination_permit_inquiry",
                "policy",
                ("student_services_faq_2026.txt",),
            )

        asks_second_and_third_year_orientation = (
            has("second year", "2nd year", "second and third year", "2nd and 3rd year")
            or has("second year", "2nd year") and has("third year", "3rd year")
        )
        if has("orientation", "orientations", "oryentasyon", "orientasyon", "oriyentasyon") and asks_second_and_third_year_orientation and has(
            "date", "when", "june 11", "2026"
        ):
            return (
                message(language_code, "orientation_date_historical"),
                "general_inquiry",
                "policy",
                ("student_services_faq_2026.txt",),
            )

        return None

    def _source_backed_fixed_result(
        self,
        response: str,
        intent: str,
        route: str,
        language: dict,
        moderation: dict,
        source_names: tuple[str, ...],
    ) -> dict:
        result = self._fixed_result(response, intent, 1.0, False, route, language, moderation)
        source_chunks = [
            chunk
            for source_name in source_names
            for chunk in retrieval_service.retrieve_source(source_name)
        ]
        result["sources"] = self._sources(source_chunks)
        return result

    @staticmethod
    def _sanitize_faq_payment_identifiers(context_chunks: list[dict] | None) -> list[dict]:
        """Keep old payment identifiers out of prompts and fallback answers."""
        safe_chunks = []
        for chunk in context_chunks or []:
            safe_chunk = dict(chunk)
            if safe_chunk.get("source") == "student_services_faq_2026.txt":
                content = str(safe_chunk.get("content", ""))
                # Source text wraps long sentences at physical line breaks.
                # Rejoin those wraps while retaining bullets, headings, Q/A
                # boundaries, and numbered procedure steps.
                content = re.sub(
                    r"(?<!\n)\n(?!\n)(?!\s*(?:[•*\-]|\d+[.)]|Step\s+\d+\b|Source\s*:|Currentness\s*:|NOTE\s*:|Q\s*:|A\s*:|Topic\s*:))",
                    " ",
                    content,
                )
                content = re.sub(
                    r"(?im)^\s*(?:account\s+)?number\s*:\s*.*$",
                    "Number: [not repeated; verify with Treasury]",
                    content,
                )
                content = re.sub(
                    r"(?im)^\s*account\s+number\s*:\s*.*$",
                    "Account Number: [not repeated; verify with Treasury]",
                    content,
                )
                content = re.sub(
                    r"(?<!\d)(?:\+?\d(?:[\s().-]*\d){9,15})(?!\d)",
                    "[number not repeated; verify with Treasury]",
                    content,
                )
                safe_chunk["content"] = content
            safe_chunks.append(safe_chunk)
        return safe_chunks

    @staticmethod
    def _approved_student_services_faq_context(query: str) -> list[dict]:
        """Pin clear FAQ questions to their matching approved Q/A record.

        Dense retrieval can rank a neighboring FAQ (for example, the INC form
        when asked about add/drop forms). Use the source's question wording to
        select a single record for those explicit student-service intents.
        The answer remains grounded in the approved source and is still
        naturally rendered by the configured response path.
        """
        source = "student_services_faq_2026.txt"
        if source not in APPROVED_STATIC_SOURCES:
            return []

        normalized = re.sub(r"\s+", " ", (query or "").casefold()).strip()

        def has(*phrases: str) -> bool:
            return _has_query_marker(normalized, tuple(phrases))

        target_questions = []

        if has("school address", "school's address", "address appears", "address shown", "address in the memorandum", "address in official memoranda"):
            target_questions.append("what is the school's address")
        elif has("classes scheduled to start", "when do classes start", "when were classes", "class start date", "start date of classes"):
            target_questions.append("when were classes scheduled to start")
        elif has("orientation", "orientations", "oryentasyon", "orientasyon", "oriyentasyon") and has(
            "date", "when", "june 11", "2026"
        ):
            if has("fourth year", "4th year"):
                target_questions.append(
                    "what date did the june 11, 2026 announcement list for 4th year orientation"
                )
            elif (
                has("second and third year", "2nd and 3rd year")
                or has("second year", "2nd year") and has("third year", "3rd year")
            ):
                target_questions.append(
                    "what date did the june 11, 2026 announcement list for 2nd and 3rd year orientation"
                )
        elif has("proof of payment", "payment proof", "proof-of-payment submission") or (
            has("proof") and has("payment")
        ):
            if has("who", "person", "identified", "recipient"):
                target_questions.append("who is identified for proof-of-payment submission")
            else:
                target_questions.append("what should i do after making an online payment")
        elif has("online payment method", "payment method", "payment options", "payment methods", "gcash", "pnb", "bank transfer", "payment recipient", "recipient details"):
            target_questions.append("what online payment methods are available")
        elif has("special exam", "special examination"):
            if has("processing period", "february", "feb 24", "registrar memo", "registrar announced"):
                target_questions.append("what special exam processing period did the registrar announce")
            if has("june 11", "upcoming", "exam dates", "exam date", "exam period"):
                target_questions.append("what special examination period does the june 11")
            if has("schedule", "scheduling", "which office", "who gives"):
                target_questions.append("which office handles special exam scheduling after payment")
            if has("procedure", "process", "steps", "how do i"):
                target_questions.append("how do i process a special exam")
            if has("fee", "pay", "paid", "where"):
                target_questions.append("where should i pay the fee for a special exam")
            if not target_questions:
                target_questions.append("how do i process a special exam")
        elif has(
            "inc form", "inc fee", "inc requirements", "incomplete form",
            "inc completion period", "inc processing period",
        ):
            if has("procedure", "process", "steps", "how do i", "how can i"):
                target_questions.append("what is the procedure for processing an inc form")
            if has("completion period", "june 11", "3rd term", "third term"):
                target_questions.append("what inc completion period did the june 11")
            if has("processing period", "february", "feb 24", "registrar memo"):
                target_questions.append("what inc form processing period did the registrar announce")
            if has("proof", "receipt", "payment", "fee", "pay") and not has("procedure", "process", "signed", "submit"):
                target_questions.append("where should i pay the fee for an inc form")
            if (has("signed", "submit") and not has("procedure", "process", "steps", "how do i", "how can i")) or not target_questions:
                target_questions.append("what is the procedure for processing an inc form")
        elif scope_service.is_subject_change_query(normalized):
            if has("reason", "reasons", "why"):
                target_questions.append("what reasons are allowed for adding, dropping, or changing")
            if has("deadline", "due date", "until when", "what date", "old deadline"):
                target_questions.append("what was the add/drop/change deadline")
            if has("fee", "fees", "cost", "price", "how much", "per subject"):
                target_questions.append("is there a fee for adding, dropping, or changing a subject")
            if has("procedure", "process", "steps", "how do i", "offices involved") or not target_questions:
                target_questions.append("what is the procedure for adding, dropping, or changing")

        if not target_questions:
            return []

        fragments = [
            (chunk, _faq_question_fragment(chunk))
            for chunk in retrieval_service.retrieve_source(source)
        ]
        selected = []
        for target_question in target_questions:
            match = next(
                (chunk for chunk, fragment in fragments if target_question in fragment),
                None,
            )
            if match and match not in selected:
                selected.append(match)
        return ChatService._sanitize_faq_payment_identifiers(selected)

    async def process_query(
        self,
        query: str,
        conversation_history: list[dict] | None = None,
        preferred_language: str | None = None,
    ) -> dict:
        history = (conversation_history or [])[-12:]
        # The frontend optimistically inserts the current user message before
        # it creates the request. Treat that duplicate as the current prompt,
        # not as a prior context anchor, or term/year inheritance can stop on
        # the duplicate before it reaches the earlier curriculum question.
        if (
            history
            and history[-1].get("role") == "user"
            and str(history[-1].get("content", "")).strip().casefold()
            == str(query or "").strip().casefold()
        ):
            history = history[:-1]
        language = language_service.detect(query, history, preferred_language)
        language_code = language["code"]
        moderation = moderation_service.evaluate(query)
        normalized_query = _normalize_common_question_typos(query)
        routing_query = _with_follow_up_context(normalized_query, history)

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

        # Explicit student lifecycle wording outranks a generic mention of
        # subjects. Without this guard, "returning after a break" questions
        # can be mistaken for a curriculum lookup and ask the student to name
        # a program instead of answering the enrollment guidance.
        lifecycle_enrollment_markers = (
            RETURNING_ENROLLMENT_MARKERS
            + TRANSFEREE_ENROLLMENT_MARKERS
            + (
                "new student", "new applicant", "first time student",
                "first-time student", "bagong estudyante", "bagong aplikante",
                "bag o nga estudyante", "baro nga estudiante",
            )
        )
        lifecycle_enrollment_query = _has_query_marker(query, lifecycle_enrollment_markers)
        subject_change_query = scope_service.is_subject_change_query(query)
        curriculum_query = (
            is_curriculum_query(routing_query)
            and not lifecycle_enrollment_query
            and not subject_change_query
        )
        curriculum_entities = entity_service.extract_curriculum_request(routing_query)
        selected_year, selected_trimester = extract_curriculum_filters_with_history(routing_query, history)
        full_list_requested = is_full_course_list_query(routing_query) and not (
            selected_year or selected_trimester
        ) and (
            curriculum_entities["request_type"] == "curriculum_question"
            or is_explicit_full_course_list_query(routing_query)
        )
        curriculum_source, curriculum_source_from_history = (
            get_curriculum_source(routing_query, history)
            if curriculum_query or is_curriculum_follow_up(routing_query)
            else (None, False)
        )
        curriculum_query = curriculum_query or curriculum_source is not None
        scope = scope_service.route(routing_query)
        if (curriculum_query or lifecycle_enrollment_query) and scope["route"] == "out_of_scope":
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

        if curriculum_source and is_ambiguous_next_term_follow_up(query):
            next_year, next_trimester = infer_next_term_filters(query, history)
            if next_year and next_trimester:
                next_query = f"{next_year} {next_trimester}"
                next_answer = curriculum_service.format_year_term_answer(
                    curriculum_source,
                    next_query,
                    language_code,
                )
                if next_answer:
                    result = self._source_backed_fixed_result(
                        next_answer,
                        "curriculum_inquiry",
                        "policy",
                        language,
                        moderation,
                        (curriculum_source,),
                    )
                    return result
            return self._source_backed_fixed_result(
                message(language_code, "curriculum_followup_ambiguous"),
                "curriculum_inquiry",
                "clarification",
                language,
                moderation,
                (curriculum_source,),
            )

        catalog_answer = curriculum_service.format_catalog_answer(routing_query, language_code)
        if catalog_answer:
            catalog_response = catalog_answer
            example_chunks = []
            asks_for_examples = _has_query_marker(
                routing_query,
                ("give examples", "examples from", "example from", "show examples", "such as"),
            )
            if (
                asks_for_examples
                and curriculum_source
                and selected_trimester
                and is_course_list_query(routing_query)
            ):
                example_query = routing_query
                if not selected_year:
                    example_query = f"{routing_query} first year"
                example_answer = curriculum_service.format_year_term_answer(
                    curriculum_source,
                    example_query,
                    language_code,
                    history,
                )
                if example_answer:
                    catalog_response += "\n\n" + example_answer
                    example_chunks = curriculum_service.retrieve(curriculum_source)
            result = self._fixed_result(
                catalog_response,
                "curriculum_inquiry",
                1.0,
                False,
                "policy",
                language,
                moderation,
            )
            result["sources"] = self._sources(
                retrieval_service.retrieve_source("program_catalog.txt") + example_chunks
            )
            return result

        # A named degree program plus a curriculum question refers to its
        # public planned sequence. Only explicit current/enrolled wording uses
        # the signed-in student's private schedule service.
        explicit_current_record = _has_query_marker(
            query,
            ("currently enrolled", "currently taking", "this term", "this trimester", "right now", "current classes", "current subjects", "current courses", "naka-enroll", "kasalukuyang klase", "kasalukuyang subject", "subong nga klase", "yana nga klase"),
        )
        if (
            scope["route"] == "database"
            and scope.get("action") == "schedule"
            and curriculum_source
            and not explicit_current_record
        ):
            scope = {"route": "policy", "action": None, "inScope": True}

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

        direct_answer = self._direct_policy_answer(routing_query, language_code)
        if direct_answer:
            response, intent, route, source_names = direct_answer
            return self._source_backed_fixed_result(
                response,
                intent,
                route,
                language,
                moderation,
                source_names,
            )

        document_fee_answer = None
        if scope["route"] == "policy":
            fee_answer = self._approved_document_fee_answer(routing_query, language_code)
            if fee_answer:
                enrollment_context_query = re.sub(
                    r"\b(?:certificate\s+of\s+enrollment|enrollment\s+certificate|coe)\b",
                    " ",
                    routing_query,
                    flags=re.I,
                )
                asks_enrollment_context = _has_query_marker(
                    enrollment_context_query,
                    ENROLLMENT_MARKERS + lifecycle_enrollment_markers,
                )
                if asks_enrollment_context:
                    document_fee_answer = fee_answer
                else:
                    return fee_answer

        asks_enrollment = (
            _has_query_marker(routing_query, ENROLLMENT_MARKERS)
            or _has_query_marker(routing_query, lifecycle_enrollment_markers)
        )
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
            if asks_tuition:
                # A generic payment retriever can rank unrelated per-subject
                # fees for a tuition question. Only attach a chunk that
                # explicitly discusses tuition/matriculation so the model
                # cannot imply an add/drop fee is the term's tuition amount.
                payment_chunks = [
                    chunk for chunk in payment_chunks
                    if re.search(
                        r"(?i)\b(?:tuition|matrikula|matriculation)\b",
                        str(chunk.get("content", "")),
                    )
                ]
            combined_context_chunks = enrollment_chunks + payment_chunks
            if lifecycle_enrollment_query and _has_query_marker(
                query, RETURNING_ENROLLMENT_MARKERS
            ):
                # Short dialect prompts can score below the lexical retrieval
                # threshold against the English interview note. This is a
                # precise lifecycle intent, so pin its approved source rather
                # than returning a false knowledge gap.
                interview_chunks = retrieval_service.retrieve_source(
                    "enrollment_interview_guidance.txt"
                )
                if interview_chunks and not any(
                    chunk.get("source") == "enrollment_interview_guidance.txt"
                    for chunk in enrollment_chunks
                ):
                    enrollment_chunks.extend(interview_chunks)
                combined_context_chunks = enrollment_chunks + payment_chunks

        if curriculum_query and is_ambiguous_filipino_bsed(routing_query):
            return self._fixed_result(
                response_service.clarify_filipino_bsed_year(language_code),
                "curriculum_inquiry",
                1.0,
                False,
                "policy",
                language,
                moderation,
            )

        if curriculum_query and not curriculum_source and is_course_list_query(routing_query):
            return self._fixed_result(
                response_service.ask_for_program(language_code),
                "curriculum_inquiry",
                1.0,
                False,
                "clarification",
                language,
                moderation,
            )

        lowered = routing_query.casefold()
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
        elif (curriculum_query or intent == "curriculum_inquiry") and is_course_list_query(routing_query):
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
        approved_faq_context = self._approved_student_services_faq_context(routing_query)
        if combined_context_chunks is not None:
            context_chunks = combined_context_chunks
        elif approved_faq_context:
            context_chunks = approved_faq_context
        elif intent == "curriculum_inquiry" and curriculum_source:
            if full_list_requested or selected_year or selected_trimester:
                context_chunks = curriculum_service.retrieve(curriculum_source)
            else:
                context_chunks = curriculum_service.retrieve_for_query(
                    curriculum_source,
                    routing_query,
                    curriculum_entities["course_codes"],
                    course_name=curriculum_entities.get("course_name"),
                )
        else:
            context_chunks = retrieval_service.retrieve(routing_query, limit=3, category=category)

        context_chunks = self._sanitize_faq_payment_identifiers(context_chunks)

        if intent == "examination_permit_inquiry" and not context_chunks:
            # This process is documented in an approved Q/A source. Retrieve
            # that exact source record if category search misses it; never
            # fall back to an unapproved code-defined procedure.
            context_chunks = [
                chunk
                for chunk in retrieval_service.retrieve_source("student_services_faq_2026.txt")
                if "q: how do i process a special exam?" in str(chunk.get("content", "")).casefold()
                or "q: which office handles special exam scheduling after payment?" in str(chunk.get("content", "")).casefold()
            ][:1]

        if not context_chunks:
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

        # The exam process must come from the approved FAQ. Never substitute
        # the old localized hard-coded directions when retrieval misses.
        if intent == "examination_permit_inquiry":
            answer = self._student_services_provider_fallback(context_chunks, language_code)
            if not answer:
                answer = message(language_code, "knowledge_unavailable")
            result = self._fixed_result(
                answer,
                intent,
                confidence,
                False,
                "policy" if answer != message(language_code, "knowledge_unavailable") else "knowledge_gap",
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
            and not (selected_year or selected_trimester)
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

        if (
            intent == "curriculum_inquiry"
            and curriculum_source
            and (selected_year or selected_trimester)
            and (
                is_course_list_query(routing_query)
                or _has_query_marker(
                    routing_query,
                    ("what is in", "what's in", "what is included", "what appears in", "what comes in"),
                )
            )
        ):
            section_answer = curriculum_service.format_year_term_answer(
                curriculum_source,
                routing_query,
                language_code,
                history,
            )
            if section_answer:
                result = self._fixed_result(
                    section_answer,
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
        request = LLMRequest(
            system_prompt=system_prompt,
            user_prompt=query,
            # Avoid sending prior assistant messages, which may contain private
            # student records returned by the authenticated backend. Follow-up
            # routing uses local history; provider prompts contain only the
            # current question and approved institutional sources.
            history=[],
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
                    response_text = self._student_services_provider_fallback(context_chunks, language_code)
                if response_text:
                    route = "policy_fallback"
                else:
                    response_text = message(language_code, "knowledge_unavailable")
                    route = "knowledge_gap"
                escalate = False
        except AllProvidersFailed:
            if intent == "enrollment_inquiry":
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
                    response_text = self._student_services_provider_fallback(context_chunks, language_code)
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
                    response_text = message(language_code, "knowledge_unavailable")
                    escalate = False
                    route = "knowledge_gap"
            else:
                response_text = self._student_services_provider_fallback(context_chunks, language_code)
                if response_text:
                    escalate = False
                    route = "policy_fallback"
                else:
                    response_text = message(language_code, "provider_unavailable")
                    escalate = False
                    route = "provider_unavailable"

        if language_code != "en":
            response_language = language_service.detect(response_text)
            if (
                response_language["code"] != language_code
                and response_language["confidence"] >= 0.80
            ):
                localized_faq = self._student_services_provider_fallback(
                    context_chunks,
                    language_code,
                )
                if localized_faq:
                    response_text = localized_faq
                    route = "policy_fallback"

        response_text = self._remove_separately_answered_fee_claims(
            response_text,
            document_fee_answer,
        )
        response_text = self._append_document_fee_answer(response_text, document_fee_answer)
        response_text = _remove_trailing_generation_artifact(response_text)
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
        response = _remove_trailing_generation_artifact(response)
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
