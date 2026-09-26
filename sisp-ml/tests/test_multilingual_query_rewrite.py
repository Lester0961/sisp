import asyncio

import pytest

from app.services.chat_service import chat_service
from app.services.llm.errors import AllProvidersFailed
from app.services.llm.models import LLMResponse
from app.services.query_rewrite_service import query_rewrite_service, settings
from app.services.scope_service import scope_service


def enable_rewrite(monkeypatch):
    monkeypatch.setattr(settings, "multilingual_query_rewrite_enabled", True)
    monkeypatch.setattr(
        query_rewrite_service.__class__,
        "_deepseek_available",
        staticmethod(lambda: True),
    )


def test_query_rewrite_calls_deepseek_for_search_only_and_keeps_named_terms(monkeypatch):
    enable_rewrite(monkeypatch)
    received = []

    async def generate(request):
        received.append(request)
        return LLMResponse(
            text="What is the BSCS enrollment process for 2026?",
            provider="deepseek",
            model="test-model",
            latency_ms=7,
        )

    monkeypatch.setattr("app.services.query_rewrite_service.llm_router.generate", generate)

    rewritten = asyncio.run(
        query_rewrite_service.rewrite_for_search(
            "Ano an proseso han BSCS enrollment para ha 2026?",
            "war",
        )
    )

    assert rewritten == "What is the BSCS enrollment process for 2026?"
    assert len(received) == 1
    assert received[0].max_tokens == 96
    assert received[0].temperature == 0.0
    assert received[0].context_chunks == []
    assert "Do not answer the question" in received[0].system_prompt


def test_query_rewrite_fails_closed_for_english_unsupported_and_unconfigured(monkeypatch):
    enable_rewrite(monkeypatch)
    called = False

    async def generate(_request):
        nonlocal called
        called = True
        raise AssertionError("Should not call the provider for this input")

    monkeypatch.setattr("app.services.query_rewrite_service.llm_router.generate", generate)
    assert asyncio.run(query_rewrite_service.rewrite_for_search("How much is the TOR?", "en")) is None
    assert asyncio.run(query_rewrite_service.rewrite_for_search("Nǐ hǎo", "zh")) is None
    assert called is False

    monkeypatch.setattr(settings, "multilingual_query_rewrite_enabled", False)
    assert asyncio.run(query_rewrite_service.rewrite_for_search("Magkano ang TOR?", "fil")) is None
    assert called is False


def test_query_rewrite_rejects_lost_codes_numbers_and_sensitive_identifiers(monkeypatch):
    enable_rewrite(monkeypatch)
    responses = iter(("How much is the document fee?", "Where should I pay the fee?"))
    called = 0

    async def generate(_request):
        nonlocal called
        called += 1
        return LLMResponse(next(responses), "deepseek", "test-model", 5)

    monkeypatch.setattr("app.services.query_rewrite_service.llm_router.generate", generate)

    assert asyncio.run(query_rewrite_service.rewrite_for_search("Magkano ang TOR?", "fil")) is None
    assert asyncio.run(query_rewrite_service.rewrite_for_search("Saan magbayad ng 2026 fee?", "fil")) is None
    assert asyncio.run(
        query_rewrite_service.rewrite_for_search(
            "Saan ako magbayad? student.demo@gmail.com",
            "fil",
        )
    ) is None
    assert called == 2


def test_provider_failure_keeps_original_query_path(monkeypatch):
    enable_rewrite(monkeypatch)

    async def generate(_request):
        raise AllProvidersFailed(["deepseek"])

    monkeypatch.setattr("app.services.query_rewrite_service.llm_router.generate", generate)
    assert asyncio.run(query_rewrite_service.rewrite_for_search("Paano mag-enroll?", "fil")) is None


def test_multilingual_personal_balance_stays_on_authenticated_database_route(monkeypatch):
    async def unexpected_rewrite(*_args, **_kwargs):
        raise AssertionError("Personal record questions must not reach the LLM rewrite")

    monkeypatch.setattr(
        "app.services.chat_service.query_rewrite_service.rewrite_for_search",
        unexpected_rewrite,
    )

    assert scope_service.route("Unsa akong balanse?") == {
        "route": "database",
        "action": "balance",
        "inScope": True,
    }
    result = asyncio.run(chat_service.process_query("Unsa akong balanse?"))
    assert result["route"] == "database"
    assert result["action"] == "balance"


@pytest.mark.parametrize(
    ("query", "action"),
    [
        ("Pila ang balanse nako?", "balance"),
        ("Ano ang grades ko?", "grades"),
        ("Ania dagiti subject ko?", "schedule"),
        ("Ano ang subject sang akon?", "schedule"),
        ("Ano it mga subject ko ha?", "schedule"),
    ],
)
def test_supported_language_personal_record_phrasings_route_without_llm(query, action, monkeypatch):
    async def unexpected_rewrite(*_args, **_kwargs):
        raise AssertionError("Private record questions must stay on the authenticated route")

    monkeypatch.setattr(
        "app.services.chat_service.query_rewrite_service.rewrite_for_search",
        unexpected_rewrite,
    )
    assert scope_service.route(query) == {
        "route": "database",
        "action": action,
        "inScope": True,
    }
    result = asyncio.run(chat_service.process_query(query))
    assert result["route"] == "database"
    assert result["action"] == action


@pytest.mark.parametrize(
    ("query", "expected_language"),
    [
        ("Paano mag-enroll sa susunod na semestre?", "fil"),
        ("Unsaon pag-enroll sa sunod nga semestre?", "ceb"),
        ("Kasano ti ag-enroll iti sumaruno a semestre?", "ilo"),
        ("Paano mag-enroll sa sunod nga semester kag ano ang proseso?", "hil"),
        ("Ano it proseso pag-enroll ha sunod nga semester?", "war"),
    ],
)
def test_non_english_rewrite_augments_but_does_not_replace_original_search(
    monkeypatch, query, expected_language
):
    rewritten_languages = []
    searches = []
    monkeypatch.setattr(
        "app.services.chat_service.settings.multilingual_query_rewrite_enabled", True
    )

    async def rewrite(query, language_code):
        rewritten_languages.append(language_code)
        assert query
        return "How do I enroll next semester?"

    def retrieve(query, limit, category):
        searches.append((query, limit, category))
        if query == "How do I enroll next semester?":
            return [{
                "content": (
                    "According to the interview notes, continuing students clear any previous balance "
                    "with Treasury, then proceed to Admissions for enrollment."
                ),
                "source": "enrollment_interview_guidance.txt",
                "category": "enrollment_policy",
                "similarity": 0.82,
            }]
        return []

    async def generate(_request):
        return LLMResponse(
            text=(
                "According to the interview notes, clear any previous balance with Treasury, "
                "then proceed to Admissions for enrollment."
            ),
            provider="deepseek",
            model="test-model",
            latency_ms=8,
        )

    monkeypatch.setattr(
        "app.services.chat_service.query_rewrite_service.rewrite_for_search",
        rewrite,
    )
    monkeypatch.setattr("app.services.chat_service.retrieval_service.retrieve", retrieve)
    monkeypatch.setattr("app.services.chat_service.llm_router.generate", generate)

    result = asyncio.run(
        chat_service.process_query(
            query,
            preferred_language="en",
        )
    )

    assert rewritten_languages == [expected_language]
    assert [query for query, _, _ in searches] == [
        query,
        "How do I enroll next semester?",
    ]
    assert all(category == "enrollment_policy" for _, _, category in searches)
    assert result["language"]["code"] == "en"
    assert result["language"]["inputCode"] == expected_language
    assert result["route"] == "policy"
    assert any(
        source["source"] == "enrollment_interview_guidance.txt"
        for source in result["sources"]
    )


def test_strong_original_retrieval_skips_paid_query_rewrite(monkeypatch):
    monkeypatch.setattr(
        "app.services.chat_service.settings.multilingual_query_rewrite_enabled", True
    )
    searches = []

    async def unexpected_rewrite(*_args, **_kwargs):
        raise AssertionError("A strong original-language match must avoid the paid rewrite call")

    def retrieve(query, limit, category):
        searches.append((query, limit, category))
        return [{
            "content": (
                "Continuing students clear any previous balance with Treasury, then proceed to Admissions."
            ),
            "source": "enrollment_interview_guidance.txt",
            "category": "enrollment_policy",
            "similarity": 0.82,
        }]

    async def generate(_request):
        return LLMResponse(
            text=(
                "Clear any previous balance with Treasury, then proceed to Admissions."
            ),
            provider="deepseek",
            model="test-model",
            latency_ms=8,
        )

    monkeypatch.setattr(
        "app.services.chat_service.query_rewrite_service.rewrite_for_search",
        unexpected_rewrite,
    )
    monkeypatch.setattr("app.services.chat_service.retrieval_service.retrieve", retrieve)
    monkeypatch.setattr("app.services.chat_service.llm_router.generate", generate)

    result = asyncio.run(
        chat_service.process_query("Unsaon pag-enroll sa sunod nga semestre?")
    )

    assert result["route"] == "policy"
    assert len(searches) == 1
    assert searches[0][0] == "Unsaon pag-enroll sa sunod nga semestre?"
