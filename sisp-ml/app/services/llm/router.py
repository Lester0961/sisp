import logging

from app.config import get_settings
from .base import LLMProvider
from .errors import AllProvidersFailed, ProviderError
from .gemini_provider import GeminiProvider
from .groq_provider import GroqProvider
from .models import LLMRequest, LLMResponse
from .openrouter_provider import OpenRouterProvider


logger = logging.getLogger("sisp.llm_router")
settings = get_settings()


class LLMRouter:
    def __init__(self, settings=settings) -> None:
        timeout = settings.llm_request_timeout_seconds
        providers = {
            "groq": (GroqProvider(settings.groq_api_key, settings.groq_model, timeout), settings.groq_enabled),
            "gemini": (
                GeminiProvider(settings.google_ai_api_key, settings.gemini_model, timeout),
                settings.gemini_enabled,
            ),
            "openrouter": (
                OpenRouterProvider(settings.openrouter_api_key, settings.openrouter_model, timeout),
                settings.openrouter_enabled,
            ),
        }
        order = [name.strip().lower() for name in settings.llm_provider_order.split(",")]
        self.providers: list[LLMProvider] = [
            providers[name][0] for name in order if name in providers and providers[name][1]
        ]

    async def generate(self, request: LLMRequest) -> LLMResponse:
        attempted: list[str] = []
        for provider in self.providers:
            if not provider.configured:
                logger.info(
                    "provider_skipped provider=%s model=%s reason=not_configured",
                    provider.name,
                    provider.model,
                )
                continue
            attempted.append(provider.name)
            try:
                response = await provider.generate(request)
                logger.info(
                    "provider_success provider=%s model=%s latency_ms=%s",
                    response.provider,
                    response.model,
                    response.latency_ms,
                )
                return response
            except ProviderError as error:
                logger.warning(
                    "provider_failed provider=%s model=%s reason=%s retryable=%s",
                    provider.name,
                    provider.model,
                    error.reason,
                    error.retryable,
                )

        raise AllProvidersFailed(attempted)

    def configured_providers(self) -> list[dict[str, str | bool]]:
        return [
            {"provider": provider.name, "model": provider.model, "configured": provider.configured}
            for provider in self.providers
        ]


llm_router = LLMRouter()
