import asyncio

import pytest

import app.services.chat_service as chat_module
from app.services.llm.models import LLMResponse
from app.services.llm.errors import AllProvidersFailed
from app.services.retrieval_service import retrieval_service
from app.services.scope_service import scope_service
from app.services import retrieval_service as retrieval_module


FAQ_CHAT_CASES = [
    (
        "What online payment methods are available?",
        "GCash",
        "The supplied announcement lists GCash and PNB bank transfer or deposit as payment options. Verify the payee with Treasury before sending funds.",
    ),
    (
        "How do I process an INC form?",
        "Records Department",
        "The cited memo directs students to Treasury, then the Dean's Office, and then the Records Department.",
    ),
    (
        "What date did the announcement list for 4th Year Orientation?",
        "June 15, 2026",
        "The June 11 announcement listed June 15, 2026. That date has passed.",
    ),
    (
        "What is the school's address?",
        "Dollar Lane",
        "The official 2026 memoranda list the school's address on Dollar Lane in Paranaque City.",
    ),
]


@pytest.mark.parametrize(("query", "expected_context", "grounded_reply"), FAQ_CHAT_CASES)
def test_supplied_student_service_answers_reach_chat_context(
    monkeypatch, query, expected_context, grounded_reply
):
    monkeypatch.setattr(retrieval_module.settings, "require_pgvector", False)
    monkeypatch.setattr(retrieval_service, "model", None)
    monkeypatch.setattr(retrieval_service, "model_load_attempted", True)

    async def grounded_provider(request):
        faq_chunks = [
            chunk for chunk in request.context_chunks
            if chunk.get("source") == "student_services_faq_2026.txt"
        ]
        assert faq_chunks
        assert any(expected_context.casefold() in chunk["content"].casefold() for chunk in faq_chunks)
        return LLMResponse(grounded_reply, "test-double", "test-only", 1)

    monkeypatch.setattr(chat_module.llm_router, "generate", grounded_provider)

    result = asyncio.run(chat_module.chat_service.process_query(query, preferred_language="en"))

    assert result["route"] == "policy"
    assert any(source["source"] == "student_services_faq_2026.txt" for source in result["sources"])
    assert result["response"] == grounded_reply


@pytest.mark.parametrize(("query",), [
    (case[0],) for case in FAQ_CHAT_CASES
])
def test_supplied_student_service_questions_are_in_scope(query):
    assert scope_service.route(query) == {
        "route": "policy",
        "action": None,
        "inScope": True,
    }


@pytest.mark.parametrize("query", [
    "What steps should a continuing student take before enrolling?",
    "What does a continuing student do before enrolling next semester?",
])
def test_natural_continuing_student_wording_retrieves_interview_steps(monkeypatch, query):
    monkeypatch.setattr(retrieval_module.settings, "require_pgvector", False)
    monkeypatch.setattr(retrieval_service, "model", None)
    monkeypatch.setattr(retrieval_service, "model_load_attempted", True)

    async def grounded_provider(request):
        assert any(
            chunk["source"] == "enrollment_interview_guidance.txt"
            and "Continuing-student enrollment" in chunk["content"]
            for chunk in request.context_chunks
        )
        return LLMResponse(
            "The interview notes say to clear any previous balance with Treasury, then proceed to Admissions to enroll.",
            "test-double",
            "test-only",
            1,
        )

    monkeypatch.setattr(chat_module.llm_router, "generate", grounded_provider)
    result = asyncio.run(chat_module.chat_service.process_query(query, preferred_language="en"))

    assert result["intent"] == "enrollment_inquiry"
    assert result["route"] == "policy"
    assert "Treasury" in result["response"]
    assert "Admissions" in result["response"]


@pytest.mark.parametrize(("language", "query"), [
    ("fil", "Ano ang mga hakbang para sa estudyanteng magpapatuloy sa susunod na semester?"),
    ("ceb", "Unsa ang buhaton sa estudyante nga magpadayon sa sunod nga semester?"),
    ("ilo", "Ania dagiti addang nga aramiden ti estudiante nga agtultuloy iti sumaruno a term?"),
    ("hil", "Ano ang himuon sang estudyante nga magapadayon sa masunod nga term?"),
    ("war", "Ano an mga angay buhaton han estudyante nga magpapadayon ha sunod nga semestre?"),
])
def test_continuing_enrollment_fallback_uses_detected_language(monkeypatch, language, query):
    monkeypatch.setattr(retrieval_module.settings, "require_pgvector", False)
    monkeypatch.setattr(retrieval_service, "model", None)
    monkeypatch.setattr(retrieval_service, "model_load_attempted", True)

    async def unavailable_provider(_request):
        raise AllProvidersFailed(["nvidia"])

    monkeypatch.setattr(chat_module.llm_router, "generate", unavailable_provider)
    result = asyncio.run(chat_module.chat_service.process_query(query))

    assert result["language"]["code"] == language
    assert result["intent"] == "enrollment_inquiry"
    assert result["route"] == "policy_fallback"
    assert "Treasury" in result["response"]
    assert "Admissions" in result["response"]
    assert any(source["source"] == "enrollment_interview_guidance.txt" for source in result["sources"])


def test_waray_enrollment_and_tuition_question_preserves_the_supported_steps(monkeypatch):
    monkeypatch.setattr(retrieval_module.settings, "require_pgvector", False)
    monkeypatch.setattr(retrieval_service, "model", None)
    monkeypatch.setattr(retrieval_service, "model_load_attempted", True)

    async def unavailable_provider(_request):
        raise AllProvidersFailed(["nvidia"])

    monkeypatch.setattr(chat_module.llm_router, "generate", unavailable_provider)
    query = (
        "Ano it proseso hit pag enroll para hit sunod nga semester, "
        "ngan tagpira it kinahanglang bayad hit matrikula?"
    )
    result = asyncio.run(chat_module.chat_service.process_query(query))

    assert result["language"]["code"] == "war"
    assert result["intent"] == "enrollment_inquiry"
    assert result["route"] == "partially_answered"
    assert "Treasury" in result["response"]
    assert "Admissions" in result["response"]
    assert "Waray ako hin napamatud-an nga kantidad" in result["response"]
    assert "PHP 500" not in result["response"]
    assert any(source["source"] == "enrollment_interview_guidance.txt" for source in result["sources"])


@pytest.mark.parametrize("query", [
    "Where to pay my tuition?",
    "Saan ako magbabayad ng tuition?",
    "Asa ko mobayad sa tuition?",
    "Sadino ti agbayad iti tuition?",
    "Diin ako magbayad sang tuition?",
    "Hain ako magbayad hin tuition?",
])
def test_payment_instructions_with_personal_pronouns_route_to_policy(query):
    assert scope_service.route(query) == {
        "route": "policy",
        "action": None,
        "inScope": True,
    }


def test_payment_faq_is_answered_from_approved_source_when_nim_fails(monkeypatch):
    monkeypatch.setattr(retrieval_module.settings, "require_pgvector", False)
    monkeypatch.setattr(retrieval_service, "model", None)
    monkeypatch.setattr(retrieval_service, "model_load_attempted", True)

    async def unavailable_provider(_request):
        raise AllProvidersFailed(["nvidia"])

    monkeypatch.setattr(chat_module.llm_router, "generate", unavailable_provider)
    result = asyncio.run(
        chat_module.chat_service.process_query("Where to pay my tuition?", preferred_language="en")
    )

    assert result["intent"] == "payment_inquiry"
    assert result["route"] == "policy_fallback"
    assert "GCash" in result["response"]
    assert "PNB" in result["response"]
    assert "Verify recipient details with Treasury" in result["response"]
    assert any(source["source"] == "student_services_faq_2026.txt" for source in result["sources"])
    assert "temporarily unavailable" not in result["response"]


def test_unverified_model_claim_falls_back_to_approved_faq_answer(monkeypatch):
    monkeypatch.setattr(retrieval_module.settings, "require_pgvector", False)
    monkeypatch.setattr(retrieval_service, "model", None)
    monkeypatch.setattr(retrieval_service, "model_load_attempted", True)

    async def hallucinating_provider(_request):
        return LLMResponse(
            "Tuition is PHP 120000 per semester. You can also pay using the listed methods.",
            "test-double",
            "test-only",
            1,
        )

    monkeypatch.setattr(chat_module.llm_router, "generate", hallucinating_provider)
    result = asyncio.run(
        chat_module.chat_service.process_query("Where to pay my tuition?", preferred_language="en")
    )

    assert result["route"] == "policy_fallback"
    assert "PHP 120000" not in result["response"]
    assert "GCash" in result["response"]
    assert "Verify recipient details with Treasury" in result["response"]


def test_inc_procedure_uses_source_answer_when_nim_fails(monkeypatch):
    monkeypatch.setattr(retrieval_module.settings, "require_pgvector", False)
    monkeypatch.setattr(retrieval_service, "model", None)
    monkeypatch.setattr(retrieval_service, "model_load_attempted", True)

    async def unavailable_provider(_request):
        raise AllProvidersFailed(["nvidia"])

    monkeypatch.setattr(chat_module.llm_router, "generate", unavailable_provider)
    result = asyncio.run(
        chat_module.chat_service.process_query(
            "What is the procedure for processing an INC form, according to the February 2026 Registrar memo?",
            preferred_language="en",
        )
    )

    assert result["route"] == "policy_fallback"
    assert "Treasury Office" in result["response"]
    assert "Dean's Office" in result["response"]
    assert "Records Department" in result["response"]
    assert "June 22" not in result["response"]
    assert any(source["source"] == "student_services_faq_2026.txt" for source in result["sources"])


def test_unverified_tuition_amount_is_not_replaced_with_payment_options(monkeypatch):
    monkeypatch.setattr(retrieval_module.settings, "require_pgvector", False)
    monkeypatch.setattr(retrieval_service, "model", None)
    monkeypatch.setattr(retrieval_service, "model_load_attempted", True)

    async def provider_must_not_run(_request):
        raise AssertionError("An unsupported tuition amount must not reach generation")

    monkeypatch.setattr(chat_module.llm_router, "generate", provider_must_not_run)
    result = asyncio.run(
        chat_module.chat_service.process_query("How much is tuition?", preferred_language="en")
    )

    assert result["route"] == "knowledge_gap"
    assert "verified tuition amount" in result["response"]
    assert "GCash" not in result["response"]
    assert result["sources"] == []
