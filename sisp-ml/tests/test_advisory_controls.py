import asyncio

from app.services.language_service import language_service
from app.services.llm.errors import ProviderError
from app.services.llm.models import LLMRequest, LLMResponse
from app.services.llm.router import LLMRouter
from app.services.moderation_service import moderation_service
from app.services.scope_service import scope_service


def test_moderation_dataset_counts_and_context_review():
    assert moderation_service.metadata["categorizedEntryCount"] == 1608
    assert moderation_service.metadata["contextReviewEntryCount"] == 70
    result = moderation_service.evaluate("Breast cancer awareness")
    assert result["action"] == "allow"
    assert any(category["contextOnly"] for category in result["categories"])


def test_moderation_escalates_credible_threat_phrase():
    result = moderation_service.evaluate("I will kill you")
    assert result["level"] == "CRITICAL"
    assert result["action"] == "escalate"


def test_moderation_catches_constructed_and_leetspeak_variants():
    assert moderation_service.evaluate("f.u.c.k this")['action'] in {"block", "escalate"}
    assert moderation_service.evaluate("p u t a n g 1 n a")['action'] in {"block", "escalate"}
    assert moderation_service.evaluate("pakyuuu")['action'] in {"block", "escalate"}


def test_language_and_scope_routing():
    language = language_service.detect("Paano ako kukuha ng exam permit po?")
    assert language["code"] == "fil"
    assert language["register"] == "formal"
    assert scope_service.route("What is the weather tomorrow?")["route"] == "out_of_scope"
    assert scope_service.route("What is my current tuition balance?") == {
        "route": "database",
        "action": "balance",
        "inScope": True,
    }


def test_unsupported_academic_policy_escalates_without_unverified_sources():
    from app.services.chat_service import chat_service

    result = asyncio.run(chat_service.process_query("What is the school's academic probation rule?"))

    assert result["escalate"] is True
    assert result["route"] == "live_advisor"
    assert result["sources"] == []


class FakeProvider:
    configured = True

    def __init__(self, name: str, succeeds: bool):
        self.name = name
        self.model = f"{name}-test"
        self.succeeds = succeeds
        self.calls = 0

    async def generate(self, _request):
        self.calls += 1
        if not self.succeeds:
            raise ProviderError(self.name, "http_429")
        return LLMResponse(text="grounded answer", provider=self.name, model=self.model, latency_ms=3)


def test_router_falls_back_once_in_order():
    primary = FakeProvider("groq", False)
    secondary = FakeProvider("gemini", True)
    final = FakeProvider("openrouter", True)
    router = LLMRouter.__new__(LLMRouter)
    router.providers = [primary, secondary, final]

    response = asyncio.run(router.generate(LLMRequest("grounded", "question")))
    assert response.provider == "gemini"
    assert primary.calls == 1
    assert secondary.calls == 1
    assert final.calls == 0
