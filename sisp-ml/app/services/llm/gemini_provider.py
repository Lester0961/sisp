import time
from urllib.parse import quote

import httpx

from .base import LLMProvider
from .errors import ProviderError
from .models import LLMRequest, LLMResponse


class GeminiProvider(LLMProvider):
    name = "gemini"

    async def generate(self, request: LLMRequest) -> LLMResponse:
        started = time.perf_counter()
        messages = request.openai_messages()
        system_text = messages[0]["content"]
        contents = [
            {
                "role": "model" if message["role"] == "assistant" else "user",
                "parts": [{"text": message["content"]}],
            }
            for message in messages[1:]
        ]
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{quote(self.model, safe='')}:generateContent"
        )
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(
                    url,
                    headers={"x-goog-api-key": self.api_key},
                    json={
                        "systemInstruction": {"parts": [{"text": system_text}]},
                        "contents": contents,
                        "generationConfig": {
                            "temperature": request.temperature,
                            "maxOutputTokens": request.max_tokens,
                        },
                    },
                )

            if response.status_code >= 400:
                raise ProviderError(
                    self.name,
                    f"http_{response.status_code}",
                    self.retryable_status(response.status_code),
                )
            data = response.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
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
