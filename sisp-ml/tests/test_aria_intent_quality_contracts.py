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
from app.services.intent_router import IntentRouter
from app.services.llm.errors import AllProvidersFailed
from app.services.response_validator import ResponseValidator


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
