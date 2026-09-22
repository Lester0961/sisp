import asyncio
from types import SimpleNamespace

import pytest

from app.services.llm.errors import ProviderError
from app.services.llm.models import LLMRequest
from app.services.llm.nvidia_provider import NvidiaProvider


class FakeResponse:
    def __init__(self, status_code, body):
        self.status_code = status_code
        self._body = body

    def json(self):
        return self._body


class FakeAsyncClient:
    def __init__(self, response, captured):
        self.response = response
        self.captured = captured

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return False

    async def post(self, url, *, headers, json):
        self.captured.update(url=url, headers=headers, body=json)
        return self.response


def test_nvidia_provider_sends_grounded_chat_request_and_extracts_text(monkeypatch):
    captured = {}
    monkeypatch.setattr(
        "app.services.llm.nvidia_provider.httpx.AsyncClient",
        lambda **_kwargs: FakeAsyncClient(
            FakeResponse(
                200,
                {"choices": [{"message": {"content": "According to the notes, ask Admissions."}}]},
            ),
            captured,
        ),
    )
    provider = NvidiaProvider("test-key", "deepseek-ai/deepseek-v4-flash-0731", 32)

    response = asyncio.run(provider.generate(LLMRequest("Be concise.", "Who should I ask?")))

    assert response.text == "According to the notes, ask Admissions."
    assert response.provider == "nvidia"
    assert response.model == "deepseek-ai/deepseek-v4-flash-0731"
    assert captured["url"] == NvidiaProvider.endpoint
    assert captured["headers"]["Authorization"] == "Bearer test-key"
    assert captured["body"]["chat_template_kwargs"] == {"thinking": False}
    assert captured["body"]["max_tokens"] == 350


def test_nvidia_provider_reports_auth_failure_without_retrying(monkeypatch):
    monkeypatch.setattr(
        "app.services.llm.nvidia_provider.httpx.AsyncClient",
        lambda **_kwargs: FakeAsyncClient(FakeResponse(401, {}), {}),
    )
    provider = NvidiaProvider("test-key", "model", 32)

    with pytest.raises(ProviderError) as failure:
        asyncio.run(provider.generate(LLMRequest("Be concise.", "Question.")))

    assert failure.value.reason == "http_401"
    assert failure.value.retryable is False


def test_nvidia_provider_rejects_reasoning_only_or_empty_answers(monkeypatch):
    monkeypatch.setattr(
        "app.services.llm.nvidia_provider.httpx.AsyncClient",
        lambda **_kwargs: FakeAsyncClient(
            FakeResponse(200, {"choices": [{"message": {"content": "", "reasoning": "private"}}]}),
            {},
        ),
    )
    provider = NvidiaProvider("test-key", "model", 32)

    with pytest.raises(ProviderError) as failure:
        asyncio.run(provider.generate(LLMRequest("Be concise.", "Question.")))

    assert failure.value.reason == "empty_response"


def test_nvidia_provider_rejects_answer_truncated_by_token_limit(monkeypatch):
    monkeypatch.setattr(
        "app.services.llm.nvidia_provider.httpx.AsyncClient",
        lambda **_kwargs: FakeAsyncClient(
            FakeResponse(
                200,
                {"choices": [{"message": {"content": "The enrollment steps are"}, "finish_reason": "length"}]},
            ),
            {},
        ),
    )
    provider = NvidiaProvider("test-key", "z-ai/glm-5.3-flash", 32)

    with pytest.raises(ProviderError) as failure:
        asyncio.run(provider.generate(LLMRequest("Be concise.", "Question.")))

    assert failure.value.reason == "incomplete_response"
    assert failure.value.retryable is False


def test_nvidia_provider_uses_low_reasoning_options_for_glm_flash(monkeypatch):
    captured = {}
    monkeypatch.setattr(
        "app.services.llm.nvidia_provider.httpx.AsyncClient",
        lambda **_kwargs: FakeAsyncClient(
            FakeResponse(200, {"choices": [{"message": {"content": "Grounded answer."}}]}),
            captured,
        ),
    )
    provider = NvidiaProvider("test-key", "z-ai/glm-5.3-flash", 32)

    asyncio.run(provider.generate(LLMRequest("Be concise.", "Question.")))

    assert captured["body"]["model"] == "z-ai/glm-5.3-flash"
    assert captured["body"]["chat_template_kwargs"] == {
        "reasoning_effort": "low",
        "clear_thinking": True,
    }
    assert "top_p" not in captured["body"]
