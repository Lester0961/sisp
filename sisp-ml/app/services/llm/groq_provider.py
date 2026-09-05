import time

import httpx

from .base import LLMProvider
from .errors import ProviderError
from .models import LLMRequest, LLMResponse


class GroqProvider(LLMProvider):
    name = "groq"

    async def generate(self, request: LLMRequest) -> LLMResponse:
        started = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "model": self.model,
                        "messages": request.openai_messages(),
                        "temperature": request.temperature,
                        "max_tokens": request.max_tokens,
                    },
                )

            if response.status_code >= 400:
                raise ProviderError(
                    self.name,
                    f"http_{response.status_code}",
                    self.retryable_status(response.status_code),
                )

            text = response.json()["choices"][0]["message"]["content"].strip()
            if not text:
                raise ProviderError(self.name, "empty_response")
            return LLMResponse(
                text=text,
                provider=self.name,
                model=self.model,
                latency_ms=int((time.perf_counter() - started) * 1000),
            )
        except ProviderError:
            raise
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise ProviderError(self.name, type(exc).__name__) from exc
        except Exception as exc:
            raise ProviderError(self.name, "invalid_provider_response") from exc
