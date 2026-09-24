"""Focused contracts for confidence routing and grounded ARIA answers."""

import asyncio
from types import SimpleNamespace

import app.services.classifier_service as classifier_module
import app.services.chat_service as chat_service_module
import app.services.intent_router as intent_router_module
import pytest
from app.services.classifier_service import ClassifierService
from app.services.chat_service import chat_service
from app.services.curriculum_service import CurriculumService
from app.services.curriculum_service import extract_curriculum_filters
from app.services.intent_router import IntentRouter
from app.services.llm.errors import AllProvidersFailed
from app.services.response_validator import ResponseValidator
from app.services.scope_service import scope_service


class FixedProbabilityModel:
    classes_ = ["grade_inquiry", "curriculum_inquiry", "payment_inquiry"]

    def predict_proba(self, _queries):
        # The class order is intentionally not the probability ranking.
        return [[0.18, 0.67, 0.15]]


def test_classifier_returns_ranked_top_two_and_margin(monkeypatch):
    monkeypatch.setattr(
        classifier_module,
        "settings",
        SimpleNamespace(intent_min_confidence=0.65, intent_min_margin=0.2),
    )
    service = ClassifierService.__new__(ClassifierService)
    service.model = FixedProbabilityModel()
    service.metadata = {"version": 12}
    service.is_loaded = True

    result = service.classify("ano ang mga subject ko sa BSCS")

    assert result["intent"] == "curriculum_inquiry"
    assert result["confidence"] == 0.67
    assert result["second_intent"] == "grade_inquiry"
    assert result["second_confidence"] == 0.18
    assert result["margin"] == pytest.approx(0.49)
    assert result["escalate"] is False
    assert result["model_version"] == 12


def test_classifier_escalates_close_top_two_predictions(monkeypatch):
    monkeypatch.setattr(
        classifier_module,
        "settings",
        SimpleNamespace(intent_min_confidence=0.65, intent_min_margin=0.2),
    )

    class CloseModel(FixedProbabilityModel):
        def predict_proba(self, _queries):
            return [[0.31, 0.36, 0.33]]

    service = ClassifierService.__new__(ClassifierService)
    service.model = CloseModel()
    service.metadata = {"version": 13}
    service.is_loaded = True

    result = service.classify("school question")

    assert result["intent"] == "curriculum_inquiry"
    assert result["second_intent"] == "payment_inquiry"
    assert result["margin"] == pytest.approx(0.03)
    assert result["escalate"] is True


def test_intent_router_asks_for_clarification_on_low_margin(monkeypatch):
    monkeypatch.setattr(
        intent_router_module,
        "get_settings",
        lambda: SimpleNamespace(intent_min_confidence=0.65, intent_min_margin=0.2),
    )

    route = IntentRouter.resolve(
        {
            "intent": "payment_inquiry",
            "confidence": 0.72,
            "second_intent": "document_request",
            "second_confidence": 0.61,
            "margin": 0.11,
            "model_version": 9,
        }
    )

    assert route["needs_clarification"] is True
    assert route["clarification_reasons"] == ["low_margin"]
    assert "bayad" in IntentRouter.clarification(route, "fil")
    assert "dokumento" in IntentRouter.clarification(route, "fil")


def test_intent_router_accepts_clear_prediction(monkeypatch):
    monkeypatch.setattr(
        intent_router_module,
        "get_settings",
        lambda: SimpleNamespace(intent_min_confidence=0.65, intent_min_margin=0.2),
    )

    route = IntentRouter.resolve(
        {"intent": "curriculum_inquiry", "confidence": 0.9, "margin": 0.7}
    )

    assert route["needs_clarification"] is False
    assert route["clarification_reasons"] == []


def test_response_validator_accepts_matching_fee_and_unit():
    facts = [{"content": "TOR — ₱500 per page"}]

    result = ResponseValidator.validate("A TOR costs ₱500 per page.", facts)

    assert result.valid is True
    assert result.issues == ()


def test_response_validator_rejects_unsupported_fee_and_wrong_unit():
    facts = [{"content": "TOR — ₱500 per page"}]

    unsupported = ResponseValidator.validate("A TOR costs ₱600 per page.", facts)
    wrong_unit = ResponseValidator.validate("A TOR costs ₱500 per copy.", facts)

    assert "unsupported monetary amount" in unsupported.issues
    assert "monetary unit does not match the source" in wrong_unit.issues


def test_response_validator_accepts_units_in_curriculum_source_notation():
    # The real source files use "LEC 3 LAB 0 Units 3" while a natural answer
    # commonly says "3 units". The equivalent source and answer must validate.
    facts = [{"content": "GE 6100 — Understanding the Self | LEC 3 LAB 0 Units 3"}]

    result = ResponseValidator.validate("Understanding the Self is worth 3 units.", facts)

    assert result.valid is True


def test_curriculum_retrieval_constrains_to_exact_named_source_and_course_code(monkeypatch):
    chunks = [
        {
            "content": "CSC 210 — Data Structures | Prerequisite: CSC 110 | Units 3",
            "source": "curriculum_BSCS_2024.txt",
        },
        {
            "content": "GE 6100 — Understanding the Self | LEC 3 LAB 0 Units 3",
            "source": "curriculum_BSCS_2024.txt",
        },
    ]

    def retrieve_source(source):
        assert source == "curriculum_BSCS_2024.txt"
        return chunks

    monkeypatch.setattr(
        "app.services.curriculum_service.retrieval_service.retrieve_source",
        retrieve_source,
    )

    result = CurriculumService.retrieve_for_query(
        "curriculum_BSCS_2024.txt",
        "What is the prerequisite for CSC 210?",
        course_codes=["CSC 210"],
    )

    assert result == [chunks[0]]


def test_curriculum_retrieval_uses_query_terms_when_no_course_code(monkeypatch):
    chunks = [
        {"content": "CSC 210 — Data Structures | Prerequisite: CSC 110 | Units 3"},
        {"content": "GE 6100 — Understanding the Self | LEC 3 LAB 0 Units 3"},
    ]
    monkeypatch.setattr(
        "app.services.curriculum_service.retrieval_service.retrieve_source",
        lambda _source: chunks,
    )

    result = CurriculumService.retrieve_for_query(
        "curriculum_BSCS_2024.txt", "Tell me about Data Structures"
    )

    assert result == [chunks[0]]


def test_tagalog_bscs_subject_question_returns_verified_curriculum_list():
    result = asyncio.run(chat_service.process_query("ano ang mga subject ko sa BSCS"))

    assert result["intent"] == "curriculum_inquiry"
    assert result["language"]["code"] == "fil"
    assert result["route"] == "policy"
    assert any(source["source"] == "curriculum_BSCS_2024.txt" for source in result["sources"])
    assert "GE 6100" in result["response"]
    assert "hindi kumpirmasyon" in result["response"]


def test_student_details_for_records_update_are_answered_without_llm(monkeypatch):
    async def unexpected_generation(_request):
        raise AssertionError("The interview supplies these general record-field categories.")

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unexpected_generation)

    result = asyncio.run(
        chat_service.process_query(
            "Which student details should a student discuss with Records when requesting an update?"
        )
    )

    assert result["intent"] == "general_inquiry"
    assert result["route"] == "policy"
    assert any(
        source["source"] == "enrollment_interview_guidance.txt" for source in result["sources"]
    )
    for field in ("name", "address", "date of birth", "guardian", "phone number"):
        assert field in result["response"].lower()
    assert "do not send the actual personal details" in result["response"].lower()


def test_online_payment_methods_answer_omits_recipient_account_details(monkeypatch):
    async def unexpected_generation(_request):
        raise AssertionError("The payment-method answer is a bounded FAQ fact.")

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unexpected_generation)

    result = asyncio.run(
        chat_service.process_query(
            "Which online payment methods does the supplied announcement name? "
            "Do not repeat recipient account or phone numbers."
        )
    )

    assert result["intent"] == "payment_inquiry"
    assert result["route"] == "policy"
    assert "gcash" in result["response"].lower()
    assert "pnb" in result["response"].lower()
    assert "account name" not in result["response"].lower()
    assert not any(char.isdigit() for char in result["response"])
    assert any(source["source"] == "student_services_faq_2026.txt" for source in result["sources"])


def test_continuing_enrollment_answer_stays_on_requested_situation(monkeypatch):
    async def unexpected_generation(_request):
        raise AssertionError("Continuing-student enrollment guidance is in the interview source.")

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unexpected_generation)

    result = asyncio.run(
        chat_service.process_query(
            "What should a continuing student do first before enrollment, according to the interview notes?"
        )
    )

    assert result["route"] == "policy"
    assert "Treasury" in result["response"]
    assert "Admissions" in result["response"]
    assert "returning after a break" not in result["response"].lower()
    assert "transferring" not in result["response"].lower()


def test_specific_curriculum_units_use_verified_template_without_llm(monkeypatch):
    async def unexpected_generation(_request):
        raise AssertionError("A bounded curriculum fact should not need an LLM provider.")

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unexpected_generation)

    result = asyncio.run(
        chat_service.process_query("How many units does GE 6100 have in the BSCS curriculum?")
    )

    assert result["route"] == "policy"
    assert result["escalate"] is False
    assert "GE 6100 — Understanding the Self" in result["response"]
    assert "3 units" in result["response"]
    assert any(source["source"] == "curriculum_BSCS_2024.txt" for source in result["sources"])


def test_curriculum_alias_resolves_dbms2_trimester_and_units_without_llm(monkeypatch):
    async def unexpected_generation(_request):
        raise AssertionError("A bounded curriculum fact should not need an LLM provider.")

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unexpected_generation)

    result = asyncio.run(
        chat_service.process_query(
            "What trimester is DBMS 2 in for the BSCS program, and how many units does it have?"
        )
    )

    assert result["intent"] == "curriculum_inquiry"
    assert result["route"] == "policy"
    assert result["escalate"] is False
    assert "IT 6114 — Database Management System 2" in result["response"]
    assert "Second Year, Third Trimester" in result["response"]
    assert "3 units" in result["response"]
    assert any(source["source"] == "curriculum_BSCS_2024.txt" for source in result["sources"])


def test_curriculum_progression_uses_local_source_summary_when_llm_is_unavailable(monkeypatch):
    async def unavailable_generation(_request):
        raise AllProvidersFailed(["openrouter"])

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unavailable_generation)

    result = asyncio.run(
        chat_service.process_query(
            "What changes in the BSCS curriculum between first year and second year, in plain language?"
        )
    )

    assert result["intent"] == "curriculum_inquiry"
    assert result["route"] == "policy"
    assert result["escalate"] is False
    assert "Understanding the Self" in result["response"]
    assert "Operating System" in result["response"]
    assert "planned sequence" in result["response"]
    assert any(source["source"] == "curriculum_BSCS_2024.txt" for source in result["sources"])


@pytest.mark.parametrize(("query", "year", "trimester"), [
    ("BSCS first year second trimester subjects", "First Year", "Second Trimester"),
    ("ano ang mga subject sa unang taon, ikalawang trimester ng BSCS", "First Year", "Second Trimester"),
    ("Ano it mga subject ha siyahan nga tuig, ikaduha nga trimester han BSCS", "First Year", "Second Trimester"),
    ("BSCS first-year course list", "First Year", None),
])
def test_curriculum_filters_detect_supported_ordinal_wording(query, year, trimester):
    assert extract_curriculum_filters(query) == (year, trimester)


@pytest.mark.parametrize(("query", "expected_code", "excluded_code"), [
    ("What subjects are in the first-year second trimester of BSCS?", "GE 6102", "CS 6202A"),
    ("Ano ang mga subject sa first year, second term ng BSCS?", "GE 6102", "CS 6202A"),
    ("Ano it mga subject ha siyahan nga tuig ngan ikaduha nga trimester han BSCS?", "GE 6102", "CS 6202A"),
])
def test_selected_curriculum_section_is_answered_from_exact_file_without_llm(
    monkeypatch, query, expected_code, excluded_code
):
    async def unexpected_generation(_request):
        raise AssertionError("A selected curriculum section is available locally.")

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unexpected_generation)
    result = asyncio.run(chat_service.process_query(query))

    assert result["intent"] == "curriculum_inquiry"
    assert result["route"] == "policy"
    assert expected_code in result["response"]
    assert excluded_code not in result["response"]
    assert any(source["source"] == "curriculum_BSCS_2024.txt" for source in result["sources"])


def test_curriculum_catalog_count_and_effective_year_do_not_need_llm(monkeypatch):
    async def unexpected_generation(_request):
        raise AssertionError("Catalog metadata is structured source data.")

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unexpected_generation)
    result = asyncio.run(chat_service.process_query("How many courses are in BSCS, and what is its effective year?"))

    assert result["intent"] == "curriculum_inquiry"
    assert "56 courses" in result["response"]
    assert "2024–2025" in result["response"]
    assert any(source["source"] == "program_catalog.txt" for source in result["sources"])


def test_special_exam_permit_uses_approved_faq_instead_of_code_policy(monkeypatch):
    faq_chunk = {
        "content": (
            "Topic: SPECIAL EXAM PROCEDURE\nQ: How do I process a Special Exam?\n"
            "A:\nStep 1 — Payment\n• Proceed to the Treasury Office and settle the required fees.\n"
            "• Keep the official receipt as proof of payment.\nStep 2 — Exam Schedule\n"
            "• After payment, report to the Dean's Office.\n"
            "• The Dean's Office will provide the Special Exam schedule and any additional instructions.\n"
            "Source: Office of the Registrar"
        ),
        "source": "student_services_faq_2026.txt",
        "category": "student_services_faq",
        "similarity": 0.9,
    }
    monkeypatch.setattr(chat_service_module.retrieval_service, "retrieve", lambda *_args, **_kwargs: [])
    monkeypatch.setattr(
        chat_service_module.retrieval_service,
        "retrieve_source",
        lambda _source: [faq_chunk],
    )

    result = asyncio.run(chat_service.process_query("How do I get my exam permit for a Special Exam?"))

    assert "Treasury Office" in result["response"]
    assert "official receipt" in result["response"]
    assert "Dean's Office" in result["response"]
    assert "Administration Office" not in result["response"]
    assert "8:00 AM" not in result["response"]
    assert any(source["source"] == "student_services_faq_2026.txt" for source in result["sources"])


def test_grade_policy_and_mutation_questions_do_not_route_to_private_grade_records():
    policy = scope_service.route(
        "How many days are allowed for a grade appeal under a current verified rule?"
    )
    mutation = scope_service.route("Can ARIA directly change a grade in my record?")
    personal = scope_service.route("What are my current grades?")
    enrollment_policy = scope_service.route(
        "Does paying the down-payment by itself prove that my portal enrollment status is active?"
    )

    assert policy["route"] != "database"
    assert mutation["route"] != "database"
    assert personal == {"route": "database", "action": "grades", "inScope": True}
    assert enrollment_policy["route"] != "database"


@pytest.mark.parametrize(
    ("query", "expected_fragments"),
    [
        (
            "What past Special Exam processing period did the Registrar memo list?",
            ("special exam processing period",),
        ),
        (
            "What INC form processing period did the February 2026 memo list, and how is it distinct from the later INC completion period?",
            ("inc form processing period", "inc completion period"),
        ),
        (
            "What fee and deadline did the add/drop guideline list?",
            ("add/drop/change deadline", "fee for adding, dropping, or changing"),
        ),
        (
            "Who is identified for proof-of-payment submission?",
            ("who is identified for proof-of-payment submission",),
        ),
        (
            "Which online payment methods are available? Do not repeat recipient account or phone numbers.",
            ("what online payment methods are available",),
        ),
    ],
)
def test_explicit_service_questions_retrieve_the_matching_faq_records(query, expected_fragments):
    from app.services.chat_service import ChatService

    chunks = ChatService._approved_student_services_faq_context(query)
    actual_questions = [
        chat_service_module._faq_question_fragment(chunk)
        for chunk in chunks
    ]

    for expected in expected_fragments:
        assert any(expected in actual for actual in actual_questions), (expected, actual_questions)

    if "online payment" in query.casefold() or "proof-of-payment" in query.casefold():
        serialized = "\n".join(str(chunk.get("content", "")) for chunk in chunks)
        assert "0919 911 8050" not in serialized
        assert "149110075280" not in serialized


def test_document_fee_comparisons_state_the_price_difference_without_llm(monkeypatch):
    async def unexpected_generation(_request):
        raise AssertionError("The fee comparison is fully determined by the approved fee schedule.")

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unexpected_generation)
    result = asyncio.run(
        chat_service.process_query(
            "How much is a certified true copy of grades compared with a second grades copy?"
        )
    )

    assert "PHP 300" in result["response"]
    assert "PHP 150" in result["response"]
    assert "PHP 150 more per copy" in result["response"]
    assert any(source["source"] == "document_fees_user_approved.txt" for source in result["sources"])


def test_down_payment_alone_does_not_assert_enrollment_or_portal_activation(monkeypatch):
    async def unexpected_generation(_request):
        raise AssertionError("The interview source directly covers this enrollment boundary.")

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unexpected_generation)
    result = asyncio.run(
        chat_service.process_query(
            "If I paid the down-payment, may ARIA conclude that my enrollment is complete?"
        )
    )

    assert result["intent"] == "enrollment_inquiry"
    assert result["route"] == "policy"
    assert "do not say that payment alone completes enrollment" in result["response"].lower()
    assert "admissions" in result["response"].lower()
    assert any(source["source"] == "enrollment_interview_guidance.txt" for source in result["sources"])


def test_tuition_unknown_reply_does_not_duplicate_the_ui_assistance_control(monkeypatch):
    async def unexpected_generation(_request):
        raise AssertionError("The approved sources contain no tuition figure for the next term.")

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unexpected_generation)
    result = asyncio.run(chat_service.process_query("How much is tuition?"))

    assert "verified tuition amount" in result["response"].lower()
    assert "request human assistance" not in result["response"].lower()
    assert result["route"] == "knowledge_gap"


def test_bsc_crim_third_term_and_named_math_program_are_deterministic(monkeypatch):
    async def unexpected_generation(_request):
        raise AssertionError("A selected curriculum section or named course has local source data.")

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unexpected_generation)
    third_term = asyncio.run(
        chat_service.process_query("What subjects are listed for first-year third term in BSCrim?")
    )
    math_course = asyncio.run(
        chat_service.process_query("Which term lists Calculus 1 in BSCS?")
    )

    assert third_term["route"] == "policy"
    assert "Third Term" in third_term["response"]
    assert "Fundamental of Criminal Investigation" in third_term["response"]
    assert math_course["route"] == "policy"
    assert "MATH 6100 — Calculus 1" in math_course["response"]
    assert "First Year, Third Trimester" in math_course["response"]


def test_program_catalog_identity_effective_year_and_course_comparison_are_deterministic(monkeypatch):
    async def unexpected_generation(_request):
        raise AssertionError("Catalog facts are structured source data.")

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unexpected_generation)
    identity = asyncio.run(chat_service.process_query("What does BSOA stand for?"))
    effective_year = asyncio.run(
        chat_service.process_query("What is the effective school year for BEED?")
    )
    comparison = asyncio.run(
        chat_service.process_query("Compare the course counts of BSCS and BSCrim.")
    )

    assert "Bachelor of Science in Office Administration" in identity["response"]
    assert "does not specify an effective year" in identity["response"]
    assert "2024–2025" in effective_year["response"]
    assert "52 courses" in effective_year["response"]
    assert "56 courses" in comparison["response"]
    assert "60 courses" in comparison["response"]
    assert "4 courses" in comparison["response"]


def test_compound_policy_questions_keep_each_supported_part(monkeypatch):
    async def unexpected_generation(_request):
        raise AssertionError("These approved facts should be answered deterministically.")

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unexpected_generation)
    cases = [
        (
            "Can I complete enrollment entirely online according to the approved information?",
            ("do not say whether the process can be completed entirely online", "Admissions"),
            "enrollment_interview_guidance.txt",
        ),
        (
            "What does Admissions check during enrollment, according to the interview?",
            ("Admissions checks student information", "submitted documents"),
            "enrollment_interview_guidance.txt",
        ),
        (
            "Does the interview define the exact form or complete workflow for updating both portal and paper records?",
            ("does not specify the exact form", "Records"),
            "enrollment_interview_guidance.txt",
        ),
        (
            "What is the exact tuition amount for the next semester?",
            ("don't have a verified tuition amount", "ask Treasury"),
            None,
        ),
        (
            "How do I get my exam permit?",
            ("does not establish a general or current exam-permit process", "Registrar"),
            "student_services_faq_2026.txt",
        ),
        (
            "Magkano ang add/drop fee, and is the old deadline current?",
            ("PHP 150", "2025", "Registrar"),
            "student_services_faq_2026.txt",
        ),
    ]
    for query, expected_fragments, source_name in cases:
        result = asyncio.run(chat_service.process_query(query))
        for fragment in expected_fragments:
            assert fragment.casefold() in result["response"].casefold(), (query, result["response"])
        if source_name:
            assert any(source["source"] == source_name for source in result["sources"]), query


def test_curriculum_section_answer_wins_over_single_course_mention(monkeypatch):
    async def unexpected_generation(_request):
        raise AssertionError("A selected curriculum section has structured local source data.")

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unexpected_generation)
    result = asyncio.run(
        chat_service.process_query(
            "What is in the BSCS first-year third trimester, and when is Calculus 1 taken?"
        )
    )

    assert "Third Trimester" in result["response"]
    assert "MATH 6100 — Calculus 1" in result["response"]
    assert "GE 6108" in result["response"]
    assert "Second Year" not in result["response"]


def test_catalog_count_question_can_include_first_term_examples(monkeypatch):
    async def unexpected_generation(_request):
        raise AssertionError("Catalog metadata and curriculum examples are structured source data.")

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unexpected_generation)
    result = asyncio.run(
        chat_service.process_query(
            "How many courses are listed for BEED, and give examples from its first term."
        )
    )

    assert "52 courses" in result["response"]
    assert "First Year" in result["response"]
    assert "Understanding the Self" in result["response"]
    assert "Physical Fitness" in result["response"]
    assert any(source["source"] == "program_catalog.txt" for source in result["sources"])
    assert any(source["source"] == "curriculum_BEED_2024.txt" for source in result["sources"])


def test_catalog_distinguishes_both_filipino_curriculum_versions(monkeypatch):
    async def unexpected_generation(_request):
        raise AssertionError("Both catalog entries are structured source data.")

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unexpected_generation)
    result = asyncio.run(
        chat_service.process_query(
            "How does the catalog distinguish the 2024–2025 and 2026–2027 Filipino curriculum files?"
        )
    )

    assert "BSEd-Fil-2024" in result["response"]
    assert "BSEd-Fil-2026" in result["response"]
    assert "2024–2025" in result["response"]
    assert "2026–2027" in result["response"]
    assert "CMO No.17 Series 2017" in result["response"]
    assert "CMO NO. 75 Series 17" in result["response"]
    assert "Both list the same course count" in result["response"]


def test_catalog_lists_all_verified_programs(monkeypatch):
    async def unexpected_generation(_request):
        raise AssertionError("The verified catalog contains the requested program list.")

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unexpected_generation)
    result = asyncio.run(
        chat_service.process_query("Name all academic programs in the verified catalog.")
    )

    for code in ("BSMA", "BSCS", "BSCrim", "BSEd-Fil-2026", "BSOA", "BSEd-Fil-2024", "BSEd-Math", "BSEd-Eng", "BEED"):
        assert code in result["response"]
    assert any(source["source"] == "program_catalog.txt" for source in result["sources"])


def test_curriculum_context_is_kept_for_a_later_follow_up_after_clarification(monkeypatch):
    async def unexpected_generation(_request):
        raise AssertionError("The program and year/term are present in the local conversation context.")

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unexpected_generation)
    query = "Can you restate the first-trimester BSCS subjects in a short list?"
    history = [
        {"role": "user", "content": "I'm a BSCS freshman—can you give me the subjects for my first year?"},
        {"role": "assistant", "content": "Here are the planned first-year BSCS subjects."},
        {"role": "user", "content": "And what comes in the next trimester?"},
        {"role": "assistant", "content": "Which year and trimester do you mean?"},
        {"role": "user", "content": "What prerequisite is listed for Rhythmic Activities?"},
        {"role": "assistant", "content": "The source lists Physical Fitness as the prerequisite."},
        # The frontend's current request includes the newly inserted user turn.
        {"role": "user", "content": query},
    ]
    result = asyncio.run(
        chat_service.process_query(
            query,
            conversation_history=history,
        )
    )

    assert "First Year — First Trimester" in result["response"]
    assert "Understanding the Self" in result["response"]
    assert "Second Year" not in result["response"]


def test_next_trimester_follow_up_uses_recent_program_year_and_current_prompt_shape(monkeypatch):
    async def unexpected_generation(_request):
        raise AssertionError("The requested trimester is available in the verified curriculum.")

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unexpected_generation)
    query = "And what comes in the next trimester?"
    history = [
        {"role": "user", "content": "I'm a BSCS freshman—can you give me the subjects for my first year?"},
        {"role": "assistant", "content": "The answer listed the three first-year trimesters."},
        # Match the actual frontend payload, which contains the current turn.
        {"role": "user", "content": query},
    ]
    result = asyncio.run(chat_service.process_query(query, conversation_history=history))

    assert "First Year — Second Trimester" in result["response"]
    assert "The Contemporary World" in result["response"]
    assert "Third Year" not in result["response"]


def test_explicit_year_request_is_not_narrowed_by_previous_trimester(monkeypatch):
    async def unexpected_generation(_request):
        raise AssertionError("The full first-year curriculum is available locally.")

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unexpected_generation)
    query = "What subjects do first-year BSCS students take?"
    history = [
        {"role": "user", "content": "What is in the BSCS first-year third trimester, and when is Calculus 1 taken?"},
        {"role": "assistant", "content": "Calculus 1 is in the third trimester."},
        # Match the current-turn duplication sent by the frontend.
        {"role": "user", "content": query},
    ]
    result = asyncio.run(chat_service.process_query(query, conversation_history=history))

    assert "First Year — First Trimester" in result["response"]
    assert "First Year — Second Trimester" in result["response"]
    assert "First Year — Third Trimester" in result["response"]
    assert "Second Year" not in result["response"]


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("The answer is complete.s", "The answer is complete."),
        ("This sentence is complete.\n", "This sentence is complete."),
        ("The final word is harmless", "The final word is harmless"),
    ],
)
def test_generated_answer_removes_only_a_trailing_standalone_s(raw, expected):
    assert chat_service_module._remove_trailing_generation_artifact(raw) == expected


def test_fixed_result_also_cleans_trailing_model_artifact():
    result = chat_service_module.ChatService._fixed_result(
        "The displayed answer is complete.s",
        "general_inquiry",
        1.0,
        False,
        "policy",
        {"code": "en"},
        {"categories": []},
    )

    assert result["response"] == "The displayed answer is complete."


@pytest.mark.parametrize(
    ("query", "language"),
    [
        ("Mobalik ko human mohunong sa pag eskwela; unsay angay buhaton?", "ceb"),
        ("Agsubliak kalpasan ti panag-eskwela; ania ti umuna nga aramiden?", "ilo"),
        ("Mabalik ako pagkatapos sang pag untat sa pag eskwela, ano una ko himuon?", "hil"),
        ("Mabalik ako ha eskwelahan katapos umundang, ano an dapat ko buhaton?", "war"),
    ],
)
def test_returning_student_dialect_variants_route_to_interview_guidance(monkeypatch, query, language):
    async def unavailable_generation(_request):
        raise AllProvidersFailed(["deepseek"])

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unavailable_generation)
    result = asyncio.run(chat_service.process_query(query))

    assert result["intent"] == "enrollment_inquiry"
    assert result["language"]["code"] == language
    assert result["route"] in {"policy", "policy_fallback"}
    assert "Treasury" in result["response"]
    assert "Admissions" in result["response"]
    assert "Which program" not in result["response"]
    assert any(
        source["source"] == "enrollment_interview_guidance.txt"
        for source in result["sources"]
    )


def test_returning_student_subject_evaluation_query_uses_enrollment_interview(monkeypatch):
    async def unavailable_generation(_request):
        raise AllProvidersFailed(["deepseek"])

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unavailable_generation)

    result = asyncio.run(
        chat_service.process_query(
            "I'm returning after a break. What does the interview say I should do, "
            "and does it say who evaluates my old subjects?"
        )
    )

    assert result["intent"] == "enrollment_inquiry"
    assert result["route"] == "policy_fallback"
    assert "Treasury" in result["response"]
    assert "Admissions" in result["response"]
    assert "which office handles the evaluation" in result["response"]
    assert "Which program" not in result["response"]
    assert any(source["source"] == "enrollment_interview_guidance.txt" for source in result["sources"])


@pytest.mark.parametrize(
    ("query", "expected_key", "expected_fragment"),
    [
        (
            "What documents does a new student need to submit?",
            "new_student_checklist_unknown",
            "complete new-student document checklist",
        ),
        (
            "Does Admissions check whether student documents are valid during enrollment?",
            "admissions_validation",
            "Admissions checks student information",
        ),
        (
            "Can I still enroll late if classes already started?",
            "late_enrollment_guidance",
            "late enrollment requires Registrar approval",
        ),
    ],
)
def test_admissions_and_late_enrollment_use_interview_guidance(monkeypatch, query, expected_key, expected_fragment):
    async def unexpected_generation(_request):
        raise AssertionError("Interview-backed admissions guidance should use the direct local answer.")

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unexpected_generation)
    result = asyncio.run(chat_service.process_query(query))

    assert expected_fragment in result["response"]
    assert result["route"] in {"policy", "partially_answered"}
    assert any(source["source"] == "enrollment_interview_guidance.txt" for source in result["sources"])


@pytest.mark.parametrize(
    ("query", "language", "expected_fragment"),
    [
        (
            "Ania dagiti dokumento a naibaga para iti transferee, ken kompleto kadi dayta a listaan?",
            "ilo",
            "Nailista kadagiti interview notes",
        ),
        (
            "Ano an dapat ko himuon pagbalik ko ha eskwelahan after a break, base la ha interview?",
            "war",
            "Para han estudyante nga nabalik katapos umundang",
        ),
    ],
)
def test_multilingual_transferee_and_returning_questions_use_interview_answers(
    monkeypatch, query, language, expected_fragment
):
    async def unexpected_generation(_request):
        raise AssertionError("The interview provides enough information for a direct localized answer.")

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unexpected_generation)
    result = asyncio.run(chat_service.process_query(query))

    assert result["language"]["code"] == language
    assert expected_fragment in result["response"]
    assert any(source["source"] == "enrollment_interview_guidance.txt" for source in result["sources"])


def test_plural_orientation_question_matches_historical_faq(monkeypatch):
    async def unexpected_generation(_request):
        raise AssertionError("The approved historical orientation date is an exact FAQ fact.")

    monkeypatch.setattr(chat_service_module.llm_router, "generate", unexpected_generation)
    result = asyncio.run(
        chat_service.process_query("What date were the 2nd and 3rd year orientations in the June 11 memo?")
    )

    assert "June 22, 2026" in result["response"]
    assert "has passed" in result["response"]
    assert any(source["source"] == "student_services_faq_2026.txt" for source in result["sources"])


def test_unavailable_classifier_asks_for_clarification_without_handoff(monkeypatch):
    monkeypatch.setattr(
        chat_service_module.intent_service,
        "predict",
        lambda _query: {
            "intent": "general_inquiry",
            "confidence": 0.0,
            "second_intent": None,
            "second_confidence": 0.0,
            "margin": 0.0,
            "escalate": True,
            "model_version": "unknown",
        },
    )

    result = asyncio.run(chat_service.process_query("How does academic advising work?"))

    assert result["route"] == "clarification"
    assert result["escalate"] is False
    assert result["quotaRefund"] is True
    assert "or general school information" not in result["response"]
