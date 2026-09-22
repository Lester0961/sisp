"""OpenAI-compatible provider adapter for NVIDIA NIM hosted chat models."""

import time

import httpx

from .base import LLMProvider
from .errors import ProviderError
from .models import LLMRequest, LLMResponse


class NvidiaProvider(LLMProvider):
    name = "nvidia"
    endpoint = "https://integrate.api.nvidia.com/v1/chat/completions"

    async def generate(self, request: LLMRequest) -> LLMResponse:
        started = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                payload = {
                    "model": self.model,
                    "messages": request.openai_messages(),
                    "temperature": request.temperature,
                    "max_tokens": min(request.max_tokens, 350),
                    "stream": False,
                }
                if self.model == "z-ai/glm-5.3-flash":
                    # NVIDIA's GLM API recommends setting temperature or
                    # top_p, not both; keep its documented default top_p.
                    payload["chat_template_kwargs"] = {
                        "reasoning_effort": "low",
                        "clear_thinking": True,
                    }
                else:
                    payload["top_p"] = 0.95
                if self.model.startswith("deepseek-ai/deepseek-v4"):
                    # NVIDIA's DeepSeek endpoint supports this model-specific
                    # extension; other OpenAI-compatible NIMs may reject it.
                    payload["chat_template_kwargs"] = {"thinking": False}
                response = await client.post(
                    self.endpoint,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json=payload,
                )

            if response.status_code >= 400:
                raise ProviderError(
                    self.name,
                    f"http_{response.status_code}",
                    self.retryable_status(response.status_code),
                )

            choices = response.json().get("choices") or []
            message = choices[0].get("message") if choices else None
            finish_reason = choices[0].get("finish_reason") if choices else None
            text = message.get("content") if isinstance(message, dict) else None
            if isinstance(text, list):
                text = "".join(
                    part.get("text", "") for part in text if isinstance(part, dict)
                )
            if not isinstance(text, str) or not text.strip():
                raise ProviderError(self.name, "empty_response")
            if finish_reason == "length":
                raise ProviderError(self.name, "incomplete_response", retryable=False)

            return LLMResponse(
                text=text.strip(),
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
