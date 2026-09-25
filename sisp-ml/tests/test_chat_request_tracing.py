import logging
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
