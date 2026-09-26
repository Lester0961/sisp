"""Offline contract tests for DeepSeek request and spend guards."""

import asyncio
import json

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool

from app import database
from app.services.llm.deepseek_provider import DeepSeekProvider
from app.services.llm.errors import ProviderError
from app.services.llm.models import ConversationMessage, LLMRequest


class FakeResponse:
    status_code = 200

    @staticmethod
    def json():
        return {
            "choices": [{"message": {"content": "Grounded answer"}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 50, "completion_tokens": 20, "total_tokens": 70},
        }


class FakeClient:
    requests = []

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return False

    async def post(self, endpoint, **kwargs):
        self.requests.append((endpoint, kwargs))
        return FakeResponse()


def make_request() -> LLMRequest:
    return LLMRequest(
        system_prompt="Answer only from approved school sources.",
        user_prompt="How much is a TOR?",
        history=[ConversationMessage("assistant", "Private prior grade answer")],
        context_chunks=[
            {
                "source": "fees.md",
                "content": (
                    "TOR costs PHP 500 per page. Payment methods include GCash and PNB. "
                    "GCash number: 0919 911 8050; PNB account: 149110075280; "
                    "school email: treasury@example.edu."
                ),
            }
        ],
        max_tokens=900,
    )


def test_deepseek_sends_bounded_grounded_context_and_tracks_usage(monkeypatch):
    FakeClient.requests = []
    monkeypatch.setattr("app.services.llm.deepseek_provider.httpx.AsyncClient", FakeClient)
    provider = DeepSeekProvider("test-key", "deepseek-flash", 1)

    result = asyncio.run(provider.generate(make_request()))

    endpoint, payload = FakeClient.requests[0]
    assert endpoint == provider.endpoint
    body = payload["json"]
    assert body["max_tokens"] == provider.MAX_OUTPUT_TOKENS
    assert body["thinking"] == {"type": "disabled"}
    combined = "\n".join(message["content"] for message in body["messages"])
    assert "TOR costs PHP 500 per page" in combined
    assert "Private prior grade answer" not in combined
    assert "GCash" in combined and "PNB" in combined
    assert "0919 911 8050" not in combined
    assert "149110075280" not in combined
    assert "treasury@example.edu" not in combined
    assert result.text == "Grounded answer"
    assert result.input_tokens == 50
    assert result.output_tokens == 20
    assert result.estimated_cost_upper_usd == pytest.approx(0.000039)
    assert provider.usage_snapshot()["actual_total_tokens"] == 70
    assert provider.usage_snapshot()["reserved_tokens"] <= 5_000_000


def test_deepseek_refuses_before_network_when_local_token_budget_is_exhausted(monkeypatch):
    def unexpected_client(*_args, **_kwargs):
        raise AssertionError("No network request should be made after the budget is exhausted.")

    monkeypatch.setattr("app.services.llm.deepseek_provider.httpx.AsyncClient", unexpected_client)
    provider = DeepSeekProvider("test-key", "deepseek-flash", 1)
    provider.MAX_RUN_TOKENS = 1

    with pytest.raises(ProviderError, match="token_budget_exhausted"):
        asyncio.run(provider.generate(make_request()))

    assert provider.reserved_tokens == 0


def test_deepseek_clips_provider_payload_to_configured_input_bound():
    provider = DeepSeekProvider("test-key", "deepseek-flash", 1)
    request = make_request()
    request.system_prompt = "s" * 10_000
    request.user_prompt = "q" * 10_000
    request.context_chunks = [{"source": "x", "content": "c" * 10_000}]

    messages, reserved_input = provider._bounded_messages(request)

    assert sum(len(message["content"].encode("utf-8")) for message in messages) <= 3_500
    assert reserved_input <= 3_500 + provider.TOKEN_OVERHEAD_RESERVE


def test_deepseek_cumulative_ledger_survives_a_provider_restart(tmp_path, monkeypatch):
    ledger = tmp_path / "deepseek-usage.json"
    ledger.write_text(json.dumps({
        "model": "deepseek-flash",
        "reserved_tokens": 3844,
        "actual_input_tokens": 40,
        "actual_output_tokens": 12,
        "actual_total_tokens": 52,
        "estimated_cost_upper_usd": 0.0000264,
        "usage_unavailable_calls": 1,
        "unobserved_prior_requests": 1,
    }), encoding="utf-8")
    monkeypatch.setenv("DEEPSEEK_USAGE_LEDGER", str(ledger))

    restarted_provider = DeepSeekProvider("test-key", "deepseek-flash", 1)

    snapshot = restarted_provider.usage_snapshot()
    assert snapshot["reserved_tokens"] == 3844
    assert snapshot["actual_total_tokens"] == 52
    assert snapshot["usage_unavailable_calls"] == 1
    assert snapshot["unobserved_prior_requests"] == 1
    assert snapshot["reserved_cost_upper_usd"] == pytest.approx(0.0046128)


def _persistent_test_engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    with engine.begin() as connection:
        connection.execute(text("""
            CREATE TABLE deepseek_usage_budgets (
                provider TEXT PRIMARY KEY,
                model TEXT NOT NULL,
                reserved_tokens BIGINT NOT NULL DEFAULT 0,
                actual_input_tokens BIGINT NOT NULL DEFAULT 0,
                actual_output_tokens BIGINT NOT NULL DEFAULT 0,
                actual_total_tokens BIGINT NOT NULL DEFAULT 0,
                estimated_cost_upper_usd NUMERIC(12, 8) NOT NULL DEFAULT 0,
                usage_unavailable_calls INTEGER NOT NULL DEFAULT 0,
                provider_attempts INTEGER NOT NULL DEFAULT 0,
                successful_responses INTEGER NOT NULL DEFAULT 0,
                unobserved_prior_requests INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
    return engine


def _seed_persistent_test_budget(engine, reserved_tokens=606625):
    with engine.begin() as connection:
        connection.execute(text("""
            INSERT INTO deepseek_usage_budgets (
                provider, model, reserved_tokens, actual_input_tokens,
                actual_output_tokens, actual_total_tokens, estimated_cost_upper_usd,
                usage_unavailable_calls, provider_attempts, successful_responses,
                unobserved_prior_requests
            ) VALUES (
                'deepseek', 'deepseek-flash', :reserved_tokens, 103935,
                16584, 120519, 0.05108130, 0, 302, 301, 1
            )
        """), {"reserved_tokens": reserved_tokens})


def test_deepseek_postgres_budget_survives_service_restart(monkeypatch):
    FakeClient.requests = []
    engine = _persistent_test_engine()
    _seed_persistent_test_budget(engine)
    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setenv("DEEPSEEK_USAGE_BACKEND", "postgres")
    monkeypatch.setattr("app.services.llm.deepseek_provider.httpx.AsyncClient", FakeClient)

    first = DeepSeekProvider("test-key", "deepseek-flash", 1)
    asyncio.run(first.generate(make_request()))
    restarted = DeepSeekProvider("test-key", "deepseek-flash", 1)
    snapshot = restarted.usage_snapshot()

    assert snapshot["usage_backend"] == "postgres"
    assert snapshot["usage_ledger_available"] is True
    assert snapshot["provider_attempts"] == 303
    assert snapshot["successful_responses"] == 302
    assert snapshot["actual_total_tokens"] == 120589
    assert snapshot["reserved_tokens"] > 606625
    assert snapshot["reserved_cost_upper_usd"] <= 1.0
    engine.dispose()


def test_deepseek_persistent_budget_refuses_before_network_at_spend_cap(monkeypatch):
    FakeClient.requests = []
    engine = _persistent_test_engine()
    _seed_persistent_test_budget(engine, reserved_tokens=833330)
    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setenv("DEEPSEEK_USAGE_BACKEND", "postgres")
    monkeypatch.setattr("app.services.llm.deepseek_provider.httpx.AsyncClient", FakeClient)

    provider = DeepSeekProvider("test-key", "deepseek-flash", 1)
    with pytest.raises(ProviderError, match="spend_budget_exhausted"):
        asyncio.run(provider.generate(make_request()))

    assert FakeClient.requests == []
    engine.dispose()


def test_deepseek_health_reports_missing_persistent_budget_row(monkeypatch):
    engine = _persistent_test_engine()
    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setenv("DEEPSEEK_USAGE_BACKEND", "postgres")

    provider = DeepSeekProvider("test-key", "deepseek-flash", 1)

    assert provider.usage_snapshot()["usage_ledger_available"] is False
    engine.dispose()


def test_deepseek_persistent_budget_fails_closed_when_database_is_unavailable(monkeypatch):
    FakeClient.requests = []
    monkeypatch.setattr(database, "engine", None)
    monkeypatch.setenv("DEEPSEEK_USAGE_BACKEND", "postgres")
    monkeypatch.setattr("app.services.llm.deepseek_provider.httpx.AsyncClient", FakeClient)

    provider = DeepSeekProvider("test-key", "deepseek-flash", 1)
    with pytest.raises(ProviderError, match="usage_ledger_unavailable"):
        asyncio.run(provider.generate(make_request()))

    assert FakeClient.requests == []
