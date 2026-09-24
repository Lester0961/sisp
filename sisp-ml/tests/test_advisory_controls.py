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


def test_normal_question_mark_does_not_trigger_constructed_profanity_match():
    query = "ano ang proseso ng pag enroll sa susunod na semester at magkano?"
    result = moderation_service.evaluate(query)
    assert result["action"] == "allow"
    assert result["categories"] == []


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
    assert scope_service.route("How much do I owe?") == {
        "route": "database",
        "action": "balance",
        "inScope": True,
    }
    assert scope_service.route("How do I enroll?")["route"] == "policy"
    assert scope_service.route("Paano mag-enroll?")["route"] == "policy"
    assert scope_service.route("How much is a TOR?")["route"] == "policy"
    assert scope_service.route("How much is the TOR?")["route"] == "policy"
    assert scope_service.route(
        "How much does a Certificate of Good Moral cost?"
    )["route"] == "policy"
    assert scope_service.route("Tagpila ang transcript of records kada pahina?")["route"] == "policy"


def test_unsupported_academic_policy_does_not_create_automatic_handoff():
    from app.services.chat_service import chat_service

    result = asyncio.run(chat_service.process_query("What is the school's academic probation rule?"))

    assert result["escalate"] is False
    assert result["route"] == "knowledge_gap"
    assert result["sources"] == []
    assert result["quotaRefund"] is True


def test_approved_document_fee_answer_is_specific_and_source_cited():
    from app.services.chat_service import chat_service

    tor = asyncio.run(chat_service.process_query("How much is a TOR?"))
    assert "PHP 500 per page" in tor["response"]
    assert "Records Office confirms the page count" in tor["response"]
    assert tor["response"].count("Records Office confirms the page count") == 1
    assert tor["sources"][0]["source"] == "document_fees_user_approved.txt"

    tor_with_article = asyncio.run(chat_service.process_query("How much is the TOR?"))
    assert "PHP 500 per page" in tor_with_article["response"]
    assert tor_with_article["response"].count("Records Office confirms the page count") == 1
    assert tor_with_article["sources"][0]["source"] == "document_fees_user_approved.txt"

    tor_quantity = asyncio.run(
        chat_service.process_query("How much for a 4-page TOR?")
    )
    assert "PHP 500 per page" in tor_quantity["response"]
    assert "PHP 2,000 total" in tor_quantity["response"]
    assert "Records Office confirms the page count" in tor_quantity["response"]

    waray_quantity = asyncio.run(
        chat_service.process_query("Tagpira an 4 pahina nga TOR?")
    )
    assert "PHP 2,000" in waray_quantity["response"]
    assert waray_quantity["language"]["code"] == "war"

    grades = asyncio.run(chat_service.process_query("How much is the 2nd copy of grades?"))
    assert "PHP 150 per copy" in grades["response"]
    assert "PHP 300 per copy" not in grades["response"]

    tagpila_tor = asyncio.run(
        chat_service.process_query("Tagpila ang transcript of records kada pahina?")
    )
    assert "PHP 500" in tagpila_tor["response"]
    assert "pahina" in tagpila_tor["response"].casefold()
    assert tagpila_tor["sources"][0]["source"] == "document_fees_user_approved.txt"

    enrollment_certificate = asyncio.run(
        chat_service.process_query("How much is the Certificate of Enrollment?"))
    assert "COE: PHP 300 per copy" in enrollment_certificate["response"]
    assert "I don't have that information" not in enrollment_certificate["response"]

    fee_comparison = asyncio.run(
        chat_service.process_query("Compare the listed COR and COE fees.")
    )
    assert "COR: PHP 300 per copy" in fee_comparison["response"]
    assert "COE: PHP 300 per copy" in fee_comparison["response"]

    combined_request = asyncio.run(
        chat_service.process_query(
            "If I request a two-page TOR and one COE, what listed total should I expect, "
            "and what can change the final TOR amount?"
        )
    )
    assert "PHP 1,000 total" in combined_request["response"]
    assert "PHP 1,300" in combined_request["response"]
    assert "Records Office confirms the page count" in combined_request["response"]


def test_document_fee_shortcut_does_not_hijack_enrollment_or_tuition_questions(monkeypatch):
    from app.services.chat_service import ChatService, chat_service
    from app.services.llm.models import LLMResponse

    waray = "Ano it proseso hit pag enroll para hit sunod nga semester, ngan tag per it kinahanglang nga bayad hit matrikula"
    tagalog = "ano ang proseso ng pag enroll sa susunod na semester at magkano?"
    assert ChatService._approved_document_fee_answer(waray, "war") is None
    assert ChatService._approved_document_fee_answer(tagalog, "fil") is None

    async def grounded_answer(request):
        assert request.max_tokens <= 260
        assert any(
            item["source"] == "enrollment_interview_guidance.txt"
            for item in request.context_chunks
        )
        answer = (
            "Sumala ha interview notes han College, pakiana anay ha Treasury para ma-clear an daan nga balance, "
            "katapos ngadto ha Admissions para mag-enroll."
            if "Waray" in request.system_prompt
            else "Ayon sa interview notes ng College, magtanong muna sa Treasury para ma-clear ang dating balance, "
            "pagkatapos ay pumunta sa Admissions para mag-enroll."
        )
        return LLMResponse(answer, "nvidia", "test-model", 1)

    monkeypatch.setattr("app.services.chat_service.llm_router.generate", grounded_answer)
    waray_result = asyncio.run(chat_service.process_query(waray))
    tagalog_result = asyncio.run(chat_service.process_query(tagalog))
    for result, language in ((waray_result, "war"), (tagalog_result, "fil")):
        assert result["intent"] == "enrollment_inquiry"
        assert result["language"]["code"] == language
        assert result["route"] == "policy"
        assert result["escalate"] is False
        assert any(s["source"] == "enrollment_interview_guidance.txt" for s in result["sources"])
        assert "PHP 500" not in result["response"]
        assert "Treasury" in result["response"]
        assert "Admissions" in result["response"]


def test_generic_document_fee_request_still_lists_approved_fees():
    from app.services.chat_service import chat_service

    result = asyncio.run(chat_service.process_query("How much are the document request fees?"))
    assert result["intent"] == "document_request"
    assert "PHP 500 per page" in result["response"]
    assert "PHP 150 per copy" in result["response"]

    plural_prices = asyncio.run(
        chat_service.process_query("Can you list the current prices for document requests?")
    )
    assert plural_prices["intent"] == "document_request"
    assert "PHP 500 per page" in plural_prices["response"]
    assert "PHP 150 per copy" in plural_prices["response"]
    assert plural_prices["sources"][0]["source"] == "document_fees_user_approved.txt"


def test_mixed_answer_does_not_repeat_a_paraphrased_document_fee():
    from app.services.chat_service import ChatService

    fee_answer = ChatService._approved_document_fee_answer("How much is a good moral?", "en")
    model_answer = (
        "According to the interview notes, clear the previous balance at Treasury, then go to Admissions. "
        "The notes do not give the fee amount. Regarding the fee, it will be added below."
    )

    cleaned = ChatService._remove_separately_answered_fee_claims(model_answer, fee_answer)
    combined = ChatService._append_document_fee_answer(cleaned, fee_answer)

    assert combined.count("PHP 500 per copy") == 1
    assert "fee amount" not in combined.casefold()
    assert "added below" not in combined.casefold()
    assert "Treasury" in combined
    assert "Admissions" in combined
    assert combined.count("The current document fees are:") == 1


def test_enrollment_question_reaches_grounded_response_flow(monkeypatch):
    from app.services.chat_service import chat_service
    from app.services.llm.models import LLMResponse

    async def grounded_answer(request):
        assert request.user_prompt == "How do I enroll?"
        assert any(
            item["source"] == "enrollment_interview_guidance.txt"
            for item in request.context_chunks
        )
        return LLMResponse(
            "According to the College interview notes, start with Treasury to clear a previous balance, then proceed to Admissions for enrollment.",
            "nvidia",
            "test-model",
            1,
        )

    monkeypatch.setattr("app.services.chat_service.llm_router.generate", grounded_answer)

    result = asyncio.run(chat_service.process_query("How do I enroll?"))
    assert result["route"] == "policy"
    assert result["escalate"] is False
    assert "Treasury" in result["response"]
    assert "Admissions" in result["response"]
    assert result["sources"][0]["source"] == "enrollment_interview_guidance.txt"


def test_enrollment_plus_document_fee_keeps_both_answers_and_sources(monkeypatch):
    from app.services.chat_service import chat_service
    from app.services.llm.models import LLMResponse

    def retrieve(_query, limit, category):
        if category == "enrollment_policy":
            return [{
                "content": "Continuing students clear previous balances with Treasury, then proceed to Admissions.",
                "source": "enrollment_interview_guidance.txt",
                "category": "enrollment_policy",
                "similarity": 0.8,
            }]
        return []

    async def grounded_answer(request):
        assert "do not mention fees, costs, amounts" in request.system_prompt.casefold()
        assert any(
            item["source"] == "enrollment_interview_guidance.txt"
            for item in request.context_chunks
        )
        assert not any(
            item["source"] == "document_fees_user_approved.txt"
            and "PHP 500" in item["content"]
            for item in request.context_chunks
        )
        return LLMResponse(
            "According to the interview notes, clear any previous balance with Treasury, then go to Admissions to enroll.",
            "nvidia",
            "test-model",
            1,
        )

    monkeypatch.setattr("app.services.chat_service.retrieval_service.retrieve", retrieve)
    monkeypatch.setattr("app.services.chat_service.llm_router.generate", grounded_answer)

    result = asyncio.run(
        chat_service.process_query("How do I enroll and how much is a good moral?")
    )

    assert result["route"] == "policy"
    assert "Treasury" in result["response"]
    assert "Admissions" in result["response"]
    assert "Certificate of good moral: PHP 500 per copy" in result["response"]
    assert {source["source"] for source in result["sources"]} == {
        "enrollment_interview_guidance.txt",
        "document_fees_user_approved.txt",
    }


def test_enrollment_plus_document_fee_still_answers_when_provider_is_unavailable(monkeypatch):
    from app.services.chat_service import chat_service
    from app.services.llm.errors import AllProvidersFailed

    def retrieve(_query, limit, category):
        if category == "enrollment_policy":
            return [{
                "content": "Continuing students clear previous balances with Treasury, then proceed to Admissions.",
                "source": "enrollment_interview_guidance.txt",
                "category": "enrollment_policy",
                "similarity": 0.8,
            }]
        return []

    async def provider_unavailable(_request):
        raise AllProvidersFailed(["nvidia"])

    monkeypatch.setattr("app.services.chat_service.retrieval_service.retrieve", retrieve)
    monkeypatch.setattr("app.services.chat_service.llm_router.generate", provider_unavailable)

    result = asyncio.run(
        chat_service.process_query("How do I enroll and how much is a good moral?")
    )

    assert result["route"] == "policy_fallback"
    assert "tuition" not in result["response"].casefold()
    assert "Treasury" in result["response"]
    assert "Admissions" in result["response"]
    assert "Certificate of good moral: PHP 500 per copy" in result["response"]
    assert {source["source"] for source in result["sources"]} == {
        "enrollment_interview_guidance.txt",
        "document_fees_user_approved.txt",
    }


def test_enrollment_plus_missing_tuition_returns_the_supported_process(monkeypatch):
    from app.services.chat_service import chat_service
    from app.services.llm.models import LLMResponse

    retrieved = []

    def retrieve(_query, limit, category):
        retrieved.append(category)
        if category == "enrollment_policy":
            return [{
                "content": "According to the interview, continuing students clear previous balances at Treasury, then proceed to Admissions.",
                "source": "enrollment_interview_guidance.txt",
                "category": "enrollment_policy",
                "similarity": 0.8,
            }]
        return []

    async def grounded_answer(request):
        assert "supported steps" in request.system_prompt
        assert "verified tuition amount" in request.system_prompt
        return LLMResponse(
            "According to the College interview notes, start with Treasury to clear any previous balance, then proceed to Admissions. The notes do not specify the tuition amount.",
            "nvidia",
            "test-model",
            1,
        )

    monkeypatch.setattr("app.services.chat_service.retrieval_service.retrieve", retrieve)
    monkeypatch.setattr("app.services.chat_service.llm_router.generate", grounded_answer)

    result = asyncio.run(
        chat_service.process_query("How do I enroll and how much is tuition?")
    )

    assert set(retrieved) == {"enrollment_policy", "payment_policy"}
    assert result["route"] == "policy"
    assert result["escalate"] is False
    assert "Treasury" in result["response"]
    assert "Admissions" in result["response"]
    assert "PHP 500" not in result["response"]


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
