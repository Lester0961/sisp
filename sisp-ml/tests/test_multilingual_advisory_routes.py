import asyncio

import pytest

from app.services.chat_service import chat_service
from app.services.curriculum_service import curriculum_service
from app.services.language_service import language_service
from app.services.llm.errors import AllProvidersFailed
from app.services.localized_messages import message
from app.services.response_service import response_service
from app.services.scope_service import scope_service


LANGUAGE_SAMPLES = [
    ("en", "How do I enroll next semester and how much is tuition?"),
    ("fil", "Paano mag-enroll sa susunod na semestre at magkano ang matrikula?"),
    ("ceb", "Unsaon nako pag-enroll sa sunod nga semestre ug pila ang tuition?"),
    ("ilo", "Kasano ti ag-enroll iti sumaruno a semestre, ken mano ti matrikula?"),
    ("hil", "Paano mag-enroll sa sunod nga semestre kag pila ang matrikula?"),
    ("war", "Ano it proseso pag-enroll han sunod nga semester ngan pira an matrikula?"),
]

CURRICULUM_LIST_SAMPLES = [
    ("en", "What subjects are listed in the BSCS curriculum?", "Here is"),
    ("fil", "Ano ang mga subject ko sa BSCS?", "Narito"),
    ("ceb", "Unsa ang mga subjects nako sa BSCS?", "Mao kini"),
    ("ilo", "Ania dagiti subject ti BSCS?", "Daytoy ti"),
    ("hil", "Ano ang mga subject sang BSCS?", "Ari ang"),
    ("war", "Ano it mga subject ha BSCS, ngan ano an mga kurso?", "Ini an"),
]


def install_enrollment_interview_source(monkeypatch):
    def retrieve(_query, limit, category):
        if category == "enrollment_policy":
            return [{
                "content": (
                    "According to the interview notes, continuing students clear any previous balance "
                    "with Treasury, then proceed to Admissions for enrollment."
                ),
                "source": "enrollment_interview_guidance.txt",
                "category": "enrollment_policy",
                "similarity": 0.8,
            }]
        return []

    monkeypatch.setattr("app.services.chat_service.retrieval_service.retrieve", retrieve)


@pytest.mark.parametrize(("expected", "query"), LANGUAGE_SAMPLES)
def test_auto_detection_handles_distinctive_supported_language_cues(expected, query):
    result = language_service.detect(query)

    assert result["code"] == expected
    assert result["manual"] is False
    assert result["confidence"] > 0


def test_cebuano_first_person_pronoun_does_not_trigger_personal_balance_lookup():
    query = "Unsaon nako pag-enroll sa sunod nga semestre ug pila ang tuition?"

    assert scope_service.route(query)["route"] == "policy"
    assert scope_service.route("Unsa akong tuition balance?") == {
        "route": "database",
        "action": "balance",
        "inScope": True,
    }


@pytest.mark.parametrize(("expected", "query"), [
    ("hil", "Paano mag-enroll sa sunod nga semester kag pila ang matrikula?"),
    ("war", "Ano it proseso hit pag pa-enroll para hit sunod nga semester, ngan tagpira it bayad hit matrikula?"),
])
def test_distinctive_regional_cues_win_over_conflicting_code_switched_text(expected, query):
    result = language_service.detect(query)

    assert result["code"] == expected
    assert result["nativeReviewRequired"] is True


def test_short_english_fee_abbreviation_does_not_inherit_previous_dialect():
    history = [{"role": "user", "content": "Ano an dapat ko himuon pagbalik ko ha eskwelahan?"}]

    result = asyncio.run(
        chat_service.process_query("hw mch for COR?", conversation_history=history)
    )

    assert result["intent"] == "document_request"
    assert result["language"]["code"] == "en"
    assert "PHP 300" in result["response"]
    assert result["response"].startswith("The current document fees are:")


@pytest.mark.parametrize(("language", "query"), [
    ("en", "What is the TOR fee?"),
    ("fil", "Magkano ang TOR?"),
    ("ceb", "Ug pila ang bayad sa TOR?"),
    ("ilo", "Mano ti bayad iti TOR?"),
    ("hil", "Pila sang bayad sang TOR?"),
    ("war", "Tagpira an bayad han TOR?"),
])
def test_tor_fee_answers_use_the_selected_language_and_approved_rate(language, query):
    result = asyncio.run(chat_service.process_query(query))
    expected_unit = {
        "en": "per page",
        "fil": "bawat pahina",
        "ceb": "matag panid",
        "ilo": "iti tunggal panid",
        "hil": "kada pahina",
        "war": "kada pahina",
    }[language]

    assert result["intent"] == "document_request"
    assert result["language"]["code"] == language
    assert "PHP 500" in result["response"]
    assert expected_unit in result["response"]
    assert result["sources"][0]["source"] == "document_fees_user_approved.txt"


@pytest.mark.parametrize(("language", "query", "intro"), CURRICULUM_LIST_SAMPLES)
def test_named_curriculum_subject_list_uses_verified_source_and_response_language(
    language, query, intro
):
    result = asyncio.run(chat_service.process_query(query))

    assert result["intent"] == "curriculum_inquiry"
    assert result["language"]["code"] == language
    assert result["route"] == "policy"
    assert any(source["source"] == "curriculum_BSCS_2024.txt" for source in result["sources"])
    assert "GE 6100" in result["response"]
    assert result["response"].startswith(intro)


@pytest.mark.parametrize(("expected", "query"), LANGUAGE_SAMPLES)
def test_combined_enrollment_and_tuition_missing_sources_are_localized_without_auto_handoff(
    monkeypatch, expected, query
):
    retrieved_categories = []

    def no_approved_policy(query, limit, category):
        retrieved_categories.append(category)
        return []

    monkeypatch.setattr(
        "app.services.chat_service.retrieval_service.retrieve",
        no_approved_policy,
    )
    result = asyncio.run(chat_service.process_query(query))

    assert set(retrieved_categories) == {"enrollment_policy", "payment_policy"}
    assert result["intent"] == "enrollment_inquiry"
    assert result["language"]["code"] == expected
    assert result["route"] == "knowledge_gap"
    assert result["escalate"] is False
    assert result["quotaRefund"] is True
    assert result["sources"] == []
    assert result["response"] == message(expected, "enrollment_and_tuition_unverified")


@pytest.mark.parametrize(("language", "question"), LANGUAGE_SAMPLES)
def test_enrollment_provider_failure_returns_source_grounded_partial_answer_in_detected_language(
    monkeypatch, language, question
):
    install_enrollment_interview_source(monkeypatch)

    async def provider_unavailable(_request):
        raise AllProvidersFailed(["nvidia"])

    monkeypatch.setattr("app.services.chat_service.llm_router.generate", provider_unavailable)

    result = asyncio.run(chat_service.process_query(question, preferred_language=language))

    assert result["intent"] == "enrollment_inquiry"
    assert result["language"]["code"] == language
    assert result["route"] == "partially_answered"
    assert result["escalate"] is False
    assert result.get("quotaRefund") is not True
    assert "Treasury" in result["response"]
    assert "Admissions" in result["response"]
    assert message(language, "tuition_unverified") in result["response"]
    assert "PHP 500" not in result["response"]
    assert any(source["source"] == "enrollment_interview_guidance.txt" for source in result["sources"])


@pytest.mark.parametrize(
    ("question", "expected_key"),
    [
        ("I am returning after a break; how do I enroll?", "enrollment_returning_fallback"),
        ("I am a transferee; what documents do I need to enroll?", "enrollment_transferee_fallback"),
        ("I am a new student; how does enrollment work?", "enrollment_new_fallback"),
    ],
)
def test_provider_failure_keeps_returning_transferee_and_new_student_paths_distinct(
    monkeypatch, question, expected_key
):
    install_enrollment_interview_source(monkeypatch)

    async def provider_unavailable(_request):
        raise AllProvidersFailed(["nvidia"])

    monkeypatch.setattr("app.services.chat_service.llm_router.generate", provider_unavailable)

    result = asyncio.run(chat_service.process_query(question, preferred_language="en"))

    if expected_key == "enrollment_returning_fallback":
        assert result["route"] in {"policy", "policy_fallback"}
    elif expected_key == "enrollment_transferee_fallback":
        assert result["route"] in {"partially_answered", "policy_fallback"}
    else:
        assert result["route"] == "policy_fallback"
    assert result["response"] == message("en", expected_key)
    assert any(source["source"] == "enrollment_interview_guidance.txt" for source in result["sources"])


@pytest.mark.parametrize("language", ("en", "fil", "ceb", "ilo", "hil", "war"))
def test_curriculum_fact_and_full_list_wrappers_are_localized(language, monkeypatch):
    source = "curriculum_BSCS_2024.txt"
    content = (
        "First Year — First Trimester:\n"
        "- CSC 101 — Introduction to Computing | LEC 3 LAB 0 Units 3\n"
    )
    chunks = [{"content": content, "source": source}]
    monkeypatch.setattr(
        "app.services.curriculum_service.retrieval_service.retrieve_source",
        lambda _source: chunks,
    )

    fact = curriculum_service.format_course_answer(
        source,
        chunks,
        "course_units",
        ["CSC 101"],
        None,
        language,
    )
    full = curriculum_service.format_full_answer(source, chunks, language)
    prompt = response_service.ask_for_program(language)

    assert "CSC 101 — Introduction to Computing" in fact
    assert "3 units" in fact
    assert "CSC 101 — Introduction to Computing" in full
    assert prompt
    if language != "en":
        assert not fact.startswith("CSC 101 carries")
        assert "Here is the verified official" not in full
        assert prompt != response_service.ask_for_program("en")
