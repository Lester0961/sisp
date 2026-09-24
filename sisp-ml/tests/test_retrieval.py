import sys
import os
import re
from contextlib import contextmanager

import numpy as np
import pytest

# Add parent directory to path so app module can be found
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services import retrieval_service as service_module
from app.services.retrieval_service import retrieval_service
from app.approved_sources import APPROVED_STATIC_SOURCES


@pytest.fixture(autouse=True)
def use_deterministic_local_retrieval(monkeypatch):
    # These tests assert corpus selection/ranking behavior, not model-download
    # availability. Exercise the built-in sparse fallback without attempting
    # to fetch FastEmbed assets during a test run.
    monkeypatch.setattr(retrieval_service, "model", None)
    monkeypatch.setattr(retrieval_service, "model_load_attempted", True)
    monkeypatch.setattr(service_module.settings, "require_pgvector", False)


def test_retrieval_service_is_ready():
    """Verified local curriculum sources are available in development mode."""
    assert retrieval_service.is_ready() is True


def test_retrieval_uses_verified_program_source():
    results = retrieval_service.retrieve(
        "Which programs are included in the RMC program catalog?", limit=3
    )

    assert results
    assert results[0]["source"] == "program_catalog.txt"


def test_retrieval_uses_user_approved_document_fee_source():
    results = retrieval_service.retrieve("What is the TOR fee per page?", limit=3)

    assert any(result["source"] == "document_fees_user_approved.txt" for result in results)
    fee_result = next(result for result in results if result["source"] == "document_fees_user_approved.txt")
    assert isinstance(fee_result["similarity"], float)
    assert 0.0 <= fee_result["similarity"] <= 1.0


def test_retrieval_uses_qualified_enrollment_interview_source():
    results = retrieval_service.retrieve(
        "How do I enroll and who should I ask?", limit=4, category="enrollment_policy"
    )

    assert results
    assert any(
        result["source"] == "enrollment_interview_guidance.txt"
        and "Treasury" in result["content"]
        and "Admissions" in result["content"]
        for result in results
    )


def test_retrieval_handles_continuing_student_enrolling_paraphrase():
    results = retrieval_service.retrieve(
        "What steps should a continuing student take before enrolling?",
        limit=4,
        category="enrollment_policy",
    )

    assert results
    assert results[0]["source"] == "enrollment_interview_guidance.txt"
    assert "previous outstanding balance" in results[0]["content"]


def test_payment_method_retrieval_handles_natural_and_multilingual_wording():
    cases = [
        "Where to pay my tuition?",
        "Can I use GCash or bank transfer to pay?",
        "Saan ako magbabayad ng tuition?",
        "Asa ko mobayad sa tuition?",
        "Sadino ti agbayad iti tuition?",
        "Diin ako magbayad sang tuition?",
        "Hain ako magbayad hin tuition?",
    ]

    for query in cases:
        results = retrieval_service.retrieve(query, limit=4, category="payment_policy")
        assert any(
            item["source"] == "student_services_faq_2026.txt"
            and "GCash" in item["content"]
            and "PNB" in item["content"]
            for item in results
        ), query


def test_tuition_amount_query_does_not_expand_into_payment_method_answer():
    results = retrieval_service.retrieve("How much is tuition?", limit=4, category="payment_policy")

    assert not any(
        item["source"] == "student_services_faq_2026.txt"
        and "online payment methods" in item["content"].casefold()
        for item in results
    )


def test_retrieval_uses_user_supplied_student_services_faq_for_enrollment_and_payment():
    cases = [
        (
            "How do I add or drop a subject?",
            "enrollment_policy",
            "Registrar's Office",
        ),
        (
            "What online payment methods are available?",
            "payment_policy",
            "GCash",
        ),
        (
            "How do I process an INC form?",
            "grading_policy",
            "Records Department",
        ),
        (
            "How is a Special Exam processed after payment?",
            "grading_policy",
            "Dean's Office",
        ),
        (
            "Who should receive proof of online payment?",
            "payment_policy",
            "Ms. Arlyne Punzalan",
        ),
        (
            "What is the school's address?",
            None,
            "#7072 Dollar Lane",
        ),
    ]

    for query, category, expected_text in cases:
        results = retrieval_service.retrieve(query, limit=5, category=category)
        match = next(
            (
                item for item in results
                if item["source"] == "student_services_faq_2026.txt"
                and expected_text.casefold() in item["content"].casefold()
            ),
            None,
        )
        assert match is not None, query


def test_every_approved_faq_question_retrieves_its_own_answer():
    faq_records = [
        item for item in retrieval_service.text_documents
        if item.get("source") == "student_services_faq_2026.txt"
        and re.search(r"(?im)^Q:\s*", item.get("content", ""))
    ]
    assert faq_records

    for record in faq_records:
        question_match = re.search(
            r"(?ims)^Q:\s*(.*?)(?=^A:)",
            record["content"],
        )
        assert question_match, record["content"][:120]
        query = re.sub(r"\s+", " ", question_match.group(1)).strip()
        results = retrieval_service.retrieve(
            query,
            limit=5,
            category="student_services_faq",
        )
        assert any(
            result["source"] == record["source"]
            and result["content"] == record["content"]
            for result in results
        ), query


def test_retrieval_marks_old_schedule_entries_as_historical():
    results = retrieval_service.retrieve(
        "When were classes scheduled to start for the first term of SY 2026-2027?",
        limit=5,
        category="enrollment_policy",
    )

    match = next(
        (
            item for item in results
            if item["source"] == "student_services_faq_2026.txt"
            and "June 22, 2026" in item["content"]
        ),
        None,
    )
    assert match is not None
    assert "historical" in match["content"].casefold()
    assert "June 22, 2026" in match["content"]


def test_local_fallback_withholds_unverified_policy_sources():
    results = retrieval_service.retrieve("What is the school GWA probation threshold?", limit=3)

    assert all(result["source"] in APPROVED_STATIC_SOURCES for result in results)


def test_static_source_allowlist_is_exact():
    assert not service_module.RetrievalService._is_approved_static_source("curriculum_unverified.txt")
    assert service_module.RetrievalService._is_approved_static_source("CURRICULUM_BSCS_2024.TXT")
    assert service_module.RetrievalService._is_approved_static_source("enrollment_interview_guidance.txt")
    assert service_module.RetrievalService._is_approved_static_source("student_services_faq_2026.txt")
    assert not service_module.RetrievalService._is_approved_static_source("enrollment_policy.txt")


def test_retrieval_threshold_filters_weak_matches(monkeypatch):
    monkeypatch.setattr(service_module.settings, "retrieval_similarity_threshold", 0.3)

    assert service_module.RetrievalService._above_threshold([
        {"similarity": 0.29},
        {"similarity": 0.3},
    ]) == [{"similarity": 0.3}]


def test_production_pgvector_mode_never_falls_back_to_local_data(monkeypatch):
    monkeypatch.setattr(service_module.settings, "require_pgvector", True)
    monkeypatch.setattr(service_module, "check_db_connection", lambda: False)
    monkeypatch.setattr(
        retrieval_service,
        "_lexical_retrieve",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("fallback must not run")),
    )

    assert retrieval_service.retrieve("What is the CS curriculum?", limit=3) == []


def test_production_pgvector_search_uses_active_model_and_similarity_threshold(monkeypatch):
    captured = {}

    class FakeConnection:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def execute(self, statement, params):
            captured["sql"] = str(statement)
            captured["params"] = params
            return iter([("approved content", "program_catalog.txt", "programs_curriculum", 0.8)])

    class FakeEngine:
        @contextmanager
        def connect(self):
            yield FakeConnection()

    monkeypatch.setattr(service_module.settings, "require_pgvector", True)
    monkeypatch.setattr(service_module.settings, "retrieval_similarity_threshold", 0.7)
    monkeypatch.setattr(service_module, "engine", FakeEngine())
    monkeypatch.setattr(service_module, "check_db_connection", lambda: True)
    monkeypatch.setattr(
        retrieval_service,
        "model",
        type("FakeModel", (), {"encode": lambda _self, *_args, **_kwargs: np.array([0.1, 0.2, 0.3])})(),
    )

    results = retrieval_service.retrieve("Which program is offered?", limit=2, category="programs_curriculum")

    assert results == [{
        "content": "approved content",
        "source": "program_catalog.txt",
        "category": "programs_curriculum",
        "similarity": 0.8,
    }]
    assert "chunk.embedding <=> CAST(:query_vector AS vector)" in captured["sql"]
    assert "document.is_active = TRUE" in captured["sql"]
    assert captured["params"]["embedding_model"] == service_module.settings.embedding_model
    assert captured["params"]["category"] == "programs_curriculum"
    # Fetch a candidate pool for sparse reranking, then return the requested top 2.
    assert captured["params"]["limit"] == 15


def test_pgvector_policy_search_also_includes_student_services_faq(monkeypatch):
    captured = {}

    class FakeConnection:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def execute(self, statement, params):
            captured["sql"] = str(statement)
            captured["params"] = params
            return iter([(
                "Q: What online payment methods are available? A: GCash and PNB.",
                "student_services_faq_2026.txt",
                "student_services_faq",
                0.9,
            )])

    class FakeEngine:
        @contextmanager
        def connect(self):
            yield FakeConnection()

    monkeypatch.setattr(service_module.settings, "require_pgvector", True)
    monkeypatch.setattr(service_module.settings, "retrieval_similarity_threshold", 0.3)
    monkeypatch.setattr(service_module, "engine", FakeEngine())
    monkeypatch.setattr(service_module, "check_db_connection", lambda: True)
    monkeypatch.setattr(
        retrieval_service,
        "model",
        type("FakeModel", (), {"encode": lambda _self, *_args, **_kwargs: np.array([0.1, 0.2, 0.3])})(),
    )

    results = retrieval_service.retrieve(
        "What online payment methods are available?",
        limit=3,
        category="payment_policy",
    )

    assert results and results[0]["source"] == "student_services_faq_2026.txt"
    assert "= :student_services_category" in captured["sql"]
    assert captured["params"]["category"] == "payment_policy"
    assert captured["params"]["student_services_category"] == "student_services_faq"


def test_production_pgvector_empty_result_does_not_fall_back_to_local_index(monkeypatch):
    class FakeConnection:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def execute(self, *_args, **_kwargs):
            return iter([])

    class FakeEngine:
        @contextmanager
        def connect(self):
            yield FakeConnection()

    monkeypatch.setattr(service_module.settings, "require_pgvector", True)
    monkeypatch.setattr(service_module, "engine", FakeEngine())
    monkeypatch.setattr(service_module, "check_db_connection", lambda: True)
    monkeypatch.setattr(
        retrieval_service,
        "model",
        type("FakeModel", (), {"encode": lambda _self, *_args, **_kwargs: np.array([0.1, 0.2, 0.3])})(),
    )
    monkeypatch.setattr(
        retrieval_service,
        "_lexical_retrieve",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("local fallback must not run")),
    )

    assert retrieval_service.retrieve("Unsupported content", limit=2) == []
