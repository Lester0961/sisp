import logging
import asyncio
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app
from app.routers import chat
from app.security import settings


client = TestClient(app)
TEST_SECRET = "chat-trace-test-secret"


def test_chat_logs_backend_request_id_without_logging_question_text(monkeypatch, caplog):
    request_id = str(uuid4())

    async def fake_process_query(**_kwargs):
        return {
            "response": "TOR costs PHP 500 per page.",
            "intent": "document_request",
            "confidence": 1.0,
            "escalate": False,
            "sources": [],
            "route": "policy",
            "language": {"code": "en"},
        }

    monkeypatch.setattr(settings, "ml_secret_token", TEST_SECRET)
    monkeypatch.setattr(chat.chat_service, "process_query", fake_process_query)

    with caplog.at_level(logging.INFO, logger="aria.chat"):
        response = client.post(
            "/chat",
            json={"query": "How much does the transcript cost?"},
            headers={
                "X-ML-Secret": TEST_SECRET,
                "X-Request-ID": request_id,
            },
        )

    assert response.status_code == 200
    assert f"request_id={request_id} received" in caplog.text
    assert f"request_id={request_id} completed" in caplog.text
    assert "How much does the transcript cost?" not in caplog.text


def test_chat_marks_invalid_request_id_as_untracked(monkeypatch, caplog):
    async def fake_process_query(**_kwargs):
        return {
            "response": "Hello.",
            "intent": "general_inquiry",
            "confidence": 1.0,
            "escalate": False,
            "sources": [],
            "route": "policy",
            "language": {"code": "en"},
        }

    monkeypatch.setattr(settings, "ml_secret_token", TEST_SECRET)
    monkeypatch.setattr(chat.chat_service, "process_query", fake_process_query)

    with caplog.at_level(logging.INFO, logger="aria.chat"):
        response = client.post(
            "/chat",
            json={"query": "Hello"},
            headers={"X-ML-Secret": TEST_SECRET, "X-Request-ID": "not-a-uuid"},
        )

    assert response.status_code == 200
    assert "request_id=untracked received" in caplog.text
    assert "request_id=untracked completed" in caplog.text


def test_chat_replays_a_completed_retry_without_running_aria_twice(monkeypatch):
    request_id = str(uuid4())
    calls = 0

    async def fake_process_query(**_kwargs):
        nonlocal calls
        calls += 1
        return {
            "response": "The approved source answers this.",
            "intent": "general_inquiry",
            "confidence": 1.0,
            "escalate": False,
            "sources": [],
            "route": "policy",
            "language": {"code": "en"},
        }

    monkeypatch.setattr(settings, "ml_secret_token", TEST_SECRET)
    monkeypatch.setattr(chat.chat_service, "process_query", fake_process_query)
    headers = {"X-ML-Secret": TEST_SECRET, "X-Request-ID": request_id}
    payload = {"query": "Same request on a network retry"}

    first = client.post("/chat", json=payload, headers=headers)
    replay = client.post("/chat", json=payload, headers=headers)

    assert first.status_code == replay.status_code == 200
    assert first.json() == replay.json()
    assert replay.headers.get("x-aria-request-replayed") == "true"
    assert calls == 1


def test_chat_marks_processed_failures_unsafe_to_retry(monkeypatch):
    request_id = str(uuid4())

    async def failed_process_query(**_kwargs):
        raise RuntimeError("simulated internal failure")

    monkeypatch.setattr(settings, "ml_secret_token", TEST_SECRET)
    monkeypatch.setattr(chat.chat_service, "process_query", failed_process_query)
    response = client.post(
        "/chat",
        json={"query": "A request that fails inside ARIA"},
        headers={"X-ML-Secret": TEST_SECRET, "X-Request-ID": request_id},
    )

    assert response.status_code == 503
    assert response.headers.get("x-aria-retry-safe") == "false"


def test_chat_health_degrades_when_deepseek_budget_ledger_is_unavailable(monkeypatch):
    monkeypatch.setattr(
        chat.llm_router,
        "configured_providers",
        lambda: [{"provider": "deepseek", "model": "deepseek-flash", "configured": True}],
    )
    monkeypatch.setattr(
        chat.llm_router,
        "usage_snapshot",
        lambda: [{"provider": "deepseek", "usage_ledger_available": False}],
    )
    monkeypatch.setattr(chat.retrieval_service, "is_ready", lambda: True)
    monkeypatch.setattr(chat.retrieval_service, "pgvector_index_ready", lambda: False)

    health = asyncio.run(chat.chat_health())

    assert health["llm_ready"] is False
    assert health["deepseek_budget_ready"] is False
    assert health["status"] == "degraded"
