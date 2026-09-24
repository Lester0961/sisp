"""Budget-capped OpenAI-compatible adapter for DeepSeek Flash."""

import logging
import json
import os
import re
import time
import asyncio
from pathlib import Path

import httpx

from .base import LLMProvider
from .errors import ProviderError
from .models import LLMRequest, LLMResponse


logger = logging.getLogger("sisp.deepseek")
logger.setLevel(logging.INFO)

_LONG_NUMBER = re.compile(r"(?<!\d)(?:\+?\d(?:[\s().-]*\d){9,15})(?!\d)")
_EMAIL_ADDRESS = re.compile(r"(?i)\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b")


class DeepSeekProvider(LLMProvider):
    name = "deepseek"
    endpoint = "https://api.deepseek.com/chat/completions"

    # Hard ceilings for one local QA run. The input bound uses UTF-8 bytes as
    # a deliberately conservative token estimate; output tokens are API-capped.
    MAX_RUN_USD = 1.00
    MAX_RUN_TOKENS = 5_000_000
    MAX_INPUT_BYTES = 3_500
    MAX_OUTPUT_TOKENS = 384
    TOKEN_OVERHEAD_RESERVE = 64

    # DeepSeek Flash's peak rates verified 2026-09-24. Reserving every token
    # at the highest current per-token rate keeps preflight below the $1 cap.
    WORST_CASE_USD_PER_MILLION_TOKENS = 1.20
    PEAK_INPUT_USD_PER_MILLION = 0.30
    PEAK_OUTPUT_USD_PER_MILLION = 1.20

    def __init__(self, api_key: str, model: str, timeout_seconds: float) -> None:
        super().__init__(api_key, model, timeout_seconds)
        self.usage_backend = os.getenv("DEEPSEEK_USAGE_BACKEND", "file").strip().lower()
        self._database_engine = None
        self._usage_backend_error = False
        if self.usage_backend == "postgres":
            try:
                from app import database

                self._database_engine = database.engine
                self._usage_backend_error = self._database_engine is None
            except Exception:
                self._usage_backend_error = True
            if self._usage_backend_error:
                logger.error("DeepSeek persistent usage ledger is unavailable; paid requests will be refused.")
        elif self.usage_backend != "file":
            self._usage_backend_error = True
            logger.error("DeepSeek usage backend is invalid; paid requests will be refused.")
        ledger_path = os.getenv("DEEPSEEK_USAGE_LEDGER", "").strip()
        self.usage_ledger_path = Path(ledger_path) if ledger_path else None
        self.reserved_tokens = 0
        self.actual_input_tokens = 0
        self.actual_output_tokens = 0
        self.actual_total_tokens = 0
        self.estimated_cost_upper_usd = 0.0
        self.usage_unavailable_calls = 0
        self.provider_attempts = 0
        self.successful_responses = 0
        self.unobserved_prior_requests = 0
        if self.usage_backend == "file":
            self._load_usage_ledger()

    def _apply_usage_row(self, row) -> None:
        self.reserved_tokens = max(0, int(row["reserved_tokens"] or 0))
        self.actual_input_tokens = max(0, int(row["actual_input_tokens"] or 0))
        self.actual_output_tokens = max(0, int(row["actual_output_tokens"] or 0))
        self.actual_total_tokens = max(0, int(row["actual_total_tokens"] or 0))
        self.estimated_cost_upper_usd = max(0.0, float(row["estimated_cost_upper_usd"] or 0))
        self.usage_unavailable_calls = max(0, int(row["usage_unavailable_calls"] or 0))
        self.provider_attempts = max(0, int(row["provider_attempts"] or 0))
        self.successful_responses = max(0, int(row["successful_responses"] or 0))
        self.unobserved_prior_requests = max(0, int(row["unobserved_prior_requests"] or 0))

    def _read_persistent_usage(self):
        if self._usage_backend_error or self._database_engine is None:
            raise RuntimeError("persistent DeepSeek usage ledger is unavailable")
        from sqlalchemy import text

        with self._database_engine.connect() as connection:
            row = connection.execute(
                text(
                    "SELECT reserved_tokens, actual_input_tokens, actual_output_tokens, "
                    "actual_total_tokens, estimated_cost_upper_usd, usage_unavailable_calls, "
                    "provider_attempts, successful_responses, unobserved_prior_requests "
                    "FROM deepseek_usage_budgets WHERE provider = :provider AND model = :model"
                ),
                {"provider": self.name, "model": self.model},
            ).mappings().first()
        if row is None:
            raise RuntimeError("persistent DeepSeek usage budget row is missing")
        return row

    def _reserve_persistent_budget(self, reserve: int):
        if self._usage_backend_error or self._database_engine is None:
            raise RuntimeError("persistent DeepSeek usage ledger is unavailable")
        from sqlalchemy import text

        max_cost_tokens = int(self.MAX_RUN_USD * 1_000_000 / self.WORST_CASE_USD_PER_MILLION_TOKENS)
        with self._database_engine.begin() as connection:
            row = connection.execute(
                text(
                    "UPDATE deepseek_usage_budgets "
                    "SET reserved_tokens = reserved_tokens + :reserve, "
                    "provider_attempts = provider_attempts + 1, updated_at = CURRENT_TIMESTAMP "
                    "WHERE provider = :provider AND model = :model "
                    "AND reserved_tokens + :reserve <= :max_tokens "
                    "AND reserved_tokens + :reserve <= :max_cost_tokens "
                    "RETURNING reserved_tokens, actual_input_tokens, actual_output_tokens, "
                    "actual_total_tokens, estimated_cost_upper_usd, usage_unavailable_calls, "
                    "provider_attempts, successful_responses, unobserved_prior_requests"
                ),
                {
                    "reserve": reserve,
                    "provider": self.name,
                    "model": self.model,
                    "max_tokens": self.MAX_RUN_TOKENS,
                    "max_cost_tokens": max_cost_tokens,
                },
            ).mappings().first()
        return row

    def _record_persistent_usage(
        self, input_tokens: int, output_tokens: int, total_tokens: int, cost_upper: float
    ):
        if self._usage_backend_error or self._database_engine is None:
            raise RuntimeError("persistent DeepSeek usage ledger is unavailable")
        from sqlalchemy import text

        with self._database_engine.begin() as connection:
            row = connection.execute(
                text(
                    "UPDATE deepseek_usage_budgets "
                    "SET actual_input_tokens = actual_input_tokens + :input_tokens, "
                    "actual_output_tokens = actual_output_tokens + :output_tokens, "
                    "actual_total_tokens = actual_total_tokens + :total_tokens, "
                    "estimated_cost_upper_usd = estimated_cost_upper_usd + :cost_upper, "
                    "updated_at = CURRENT_TIMESTAMP WHERE provider = :provider AND model = :model "
                    "RETURNING reserved_tokens, actual_input_tokens, actual_output_tokens, "
                    "actual_total_tokens, estimated_cost_upper_usd, usage_unavailable_calls, "
                    "provider_attempts, successful_responses, unobserved_prior_requests"
                ),
                {
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "total_tokens": total_tokens,
                    "cost_upper": cost_upper,
                    "provider": self.name,
                    "model": self.model,
                },
            ).mappings().first()
        if row is None:
            raise RuntimeError("persistent DeepSeek usage budget row is missing")
        return row

    def _record_persistent_usage_unavailable(self):
        if self._usage_backend_error or self._database_engine is None:
            raise RuntimeError("persistent DeepSeek usage ledger is unavailable")
        from sqlalchemy import text

        with self._database_engine.begin() as connection:
            row = connection.execute(
                text(
                    "UPDATE deepseek_usage_budgets "
                    "SET usage_unavailable_calls = usage_unavailable_calls + 1, "
                    "updated_at = CURRENT_TIMESTAMP "
                    "WHERE provider = :provider AND model = :model "
                    "RETURNING reserved_tokens, actual_input_tokens, actual_output_tokens, "
                    "actual_total_tokens, estimated_cost_upper_usd, usage_unavailable_calls, "
                    "provider_attempts, successful_responses, unobserved_prior_requests"
                ),
                {"provider": self.name, "model": self.model},
            ).mappings().first()
        if row is None:
            raise RuntimeError("persistent DeepSeek usage budget row is missing")
        return row

    def _record_persistent_success(self):
        if self._usage_backend_error or self._database_engine is None:
            raise RuntimeError("persistent DeepSeek usage ledger is unavailable")
        from sqlalchemy import text

        with self._database_engine.begin() as connection:
            row = connection.execute(
                text(
                    "UPDATE deepseek_usage_budgets "
                    "SET successful_responses = successful_responses + 1, "
                    "updated_at = CURRENT_TIMESTAMP "
                    "WHERE provider = :provider AND model = :model "
                    "RETURNING reserved_tokens, actual_input_tokens, actual_output_tokens, "
                    "actual_total_tokens, estimated_cost_upper_usd, usage_unavailable_calls, "
                    "provider_attempts, successful_responses, unobserved_prior_requests"
                ),
                {"provider": self.name, "model": self.model},
            ).mappings().first()
        if row is None:
            raise RuntimeError("persistent DeepSeek usage budget row is missing")
        return row

    def _load_usage_ledger(self) -> None:
        if not self.usage_ledger_path or not self.usage_ledger_path.exists():
            return
        try:
            data = json.loads(self.usage_ledger_path.read_text(encoding="utf-8"))
            if data.get("model") != self.model:
                raise ValueError("usage ledger model does not match configured model")
            self.reserved_tokens = max(0, int(data.get("reserved_tokens", 0)))
            self.actual_input_tokens = max(0, int(data.get("actual_input_tokens", 0)))
            self.actual_output_tokens = max(0, int(data.get("actual_output_tokens", 0)))
            self.actual_total_tokens = max(0, int(data.get("actual_total_tokens", 0)))
            self.estimated_cost_upper_usd = max(
                0.0, float(data.get("estimated_cost_upper_usd", 0.0))
            )
            self.usage_unavailable_calls = max(0, int(data.get("usage_unavailable_calls", 0)))
            self.provider_attempts = max(0, int(data.get("provider_attempts", 0)))
            self.successful_responses = max(0, int(data.get("successful_responses", 0)))
            self.unobserved_prior_requests = max(
                0, int(data.get("unobserved_prior_requests", 0))
            )
        except (OSError, ValueError, TypeError, json.JSONDecodeError) as exc:
            # Fail closed: a corrupt ledger must not silently reset a paid-run
            # budget. The provider will reject rather than call the API.
            self.reserved_tokens = self.MAX_RUN_TOKENS
            self.usage_unavailable_calls = 1
            logger.error("DeepSeek usage ledger could not be read; provider budget locked.")

    def _persist_usage_ledger(self) -> None:
        if self.usage_backend != "file" or not self.usage_ledger_path:
            return
        self.usage_ledger_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "model": self.model,
            "reserved_tokens": self.reserved_tokens,
            "actual_input_tokens": self.actual_input_tokens,
            "actual_output_tokens": self.actual_output_tokens,
            "actual_total_tokens": self.actual_total_tokens,
            "estimated_cost_upper_usd": round(self.estimated_cost_upper_usd, 8),
            "usage_unavailable_calls": self.usage_unavailable_calls,
            "provider_attempts": self.provider_attempts,
            "successful_responses": self.successful_responses,
            "unobserved_prior_requests": self.unobserved_prior_requests,
            "reserved_cost_upper_usd": round(
                self.reserved_tokens * self.WORST_CASE_USD_PER_MILLION_TOKENS / 1_000_000,
                8,
            ),
        }
        temporary = self.usage_ledger_path.with_suffix(
            self.usage_ledger_path.suffix + ".tmp"
        )
        temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        os.replace(temporary, self.usage_ledger_path)

    @staticmethod
    def _clip_utf8(value: str, max_bytes: int) -> str:
        if max_bytes <= 0:
            return ""
        return value.encode("utf-8")[:max_bytes].decode("utf-8", errors="ignore")

    @staticmethod
    def _sanitize_context(value: str) -> str:
        """Keep contact/payment account identifiers inside local source handling."""
        scrubbed = _EMAIL_ADDRESS.sub("[email omitted from model prompt]", value)
        return _LONG_NUMBER.sub("[number omitted from model prompt]", scrubbed)

    def _bounded_messages(self, request: LLMRequest) -> tuple[list[dict[str, str]], int]:
        context_text = "\n\n".join(
            f"Source: {chunk.get('source', 'institutional source')}\n"
            f"{self._sanitize_context(str(chunk.get('content', '')))}"
            for chunk in request.context_chunks
        )
        # The regular provider path can receive conversation history. For this
        # paid adapter, omit it to avoid sending prior personal-record replies.
        pieces = [
            ("system", self._clip_utf8(request.system_prompt, 1_200)),
            ("system", self._clip_utf8(
                "Verified institutional context follows. Use only these facts; do not invent missing details.\n\n" + context_text,
                1_300,
            )),
            ("user", self._clip_utf8(request.user_prompt, 1_000)),
        ]
        messages = [{"role": role, "content": content} for role, content in pieces if content]
        input_byte_ceiling = sum(len(item["content"].encode("utf-8")) for item in messages)
        return messages, input_byte_ceiling + self.TOKEN_OVERHEAD_RESERVE

    def usage_snapshot(self) -> dict[str, int | float | str]:
        if self.usage_backend == "postgres" and not self._usage_backend_error:
            try:
                self._apply_usage_row(self._read_persistent_usage())
            except Exception:
                logger.error("DeepSeek persistent usage ledger could not be read.")
        return {
            "usage_backend": self.usage_backend,
            "usage_ledger_available": not self._usage_backend_error,
            "model": self.model,
            "actual_input_tokens": self.actual_input_tokens,
            "actual_output_tokens": self.actual_output_tokens,
            "actual_total_tokens": self.actual_total_tokens,
            "estimated_cost_upper_usd": round(self.estimated_cost_upper_usd, 8),
            "reserved_cost_upper_usd": round(
                self.reserved_tokens * self.WORST_CASE_USD_PER_MILLION_TOKENS / 1_000_000,
                8,
            ),
            "reserved_tokens": self.reserved_tokens,
            "usage_unavailable_calls": self.usage_unavailable_calls,
            "provider_attempts": self.provider_attempts,
            "successful_responses": self.successful_responses,
            "unobserved_prior_requests": self.unobserved_prior_requests,
            "run_token_limit": self.MAX_RUN_TOKENS,
            "run_usd_limit": self.MAX_RUN_USD,
        }

    async def generate(self, request: LLMRequest) -> LLMResponse:
        messages, estimated_input_tokens = self._bounded_messages(request)
        output_token_cap = min(max(int(request.max_tokens or 1), 1), self.MAX_OUTPUT_TOKENS)
        reserve = estimated_input_tokens + output_token_cap
        if self._usage_backend_error:
            raise ProviderError(self.name, "usage_ledger_unavailable", retryable=False)
        if self.usage_backend == "postgres":
            try:
                row = await asyncio.to_thread(self._reserve_persistent_budget, reserve)
            except Exception as exc:
                logger.error("DeepSeek request refused: persistent usage ledger unavailable (%s).", type(exc).__name__)
                raise ProviderError(self.name, "usage_ledger_unavailable", retryable=False) from exc
            if row is None:
                logger.error("DeepSeek request refused: persistent spend/token budget reached.")
                raise ProviderError(self.name, "local_spend_budget_exhausted", retryable=False)
            self._apply_usage_row(row)
        elif self.usage_backend == "file":
            max_cost_tokens = int(self.MAX_RUN_USD * 1_000_000 / self.WORST_CASE_USD_PER_MILLION_TOKENS)
            if self.reserved_tokens + reserve > self.MAX_RUN_TOKENS:
                logger.error("DeepSeek request refused: local token budget reached.")
                raise ProviderError(self.name, "local_token_budget_exhausted", retryable=False)
            if self.reserved_tokens + reserve > max_cost_tokens:
                logger.error("DeepSeek request refused: local $1 spend ceiling reached.")
                raise ProviderError(self.name, "local_spend_budget_exhausted", retryable=False)

            # Reserve before the network call. A timeout may occur after the
            # provider has processed/billed the request, so failed calls still
            # consume the conservative local ceiling.
            self.reserved_tokens += reserve
            self.provider_attempts += 1
            self._persist_usage_ledger()
        else:
            raise ProviderError(self.name, "usage_ledger_unavailable", retryable=False)
        started = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(
                    self.endpoint,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "model": self.model,
                        "messages": messages,
                        "max_tokens": output_token_cap,
                        "stream": False,
                        "thinking": {"type": "disabled"},
                    },
                )

            if response.status_code >= 400:
                raise ProviderError(
                    self.name,
                    f"http_{response.status_code}",
                    self.retryable_status(response.status_code),
                )

            body = response.json()
            choices = body.get("choices") or []
            choice = choices[0] if choices else {}
            message = choice.get("message") or {}
            content = message.get("content")
            finish_reason = choice.get("finish_reason")
            if isinstance(content, list):
                content = "".join(
                    part.get("text", "") for part in content if isinstance(part, dict)
                )

            usage = body.get("usage") or {}
            prompt_tokens = usage.get("prompt_tokens")
            completion_tokens = usage.get("completion_tokens")
            if prompt_tokens is not None and completion_tokens is not None:
                prompt_tokens = int(prompt_tokens)
                completion_tokens = int(completion_tokens)
                total_tokens = int(usage.get("total_tokens", prompt_tokens + completion_tokens))
                cost_upper = (
                    prompt_tokens * self.PEAK_INPUT_USD_PER_MILLION
                    + completion_tokens * self.PEAK_OUTPUT_USD_PER_MILLION
                ) / 1_000_000
                if self.usage_backend == "postgres":
                    try:
                        self._apply_usage_row(await asyncio.to_thread(
                            self._record_persistent_usage,
                            prompt_tokens,
                            completion_tokens,
                            total_tokens,
                            cost_upper,
                        ))
                    except Exception as exc:
                        # The prior reservation remains persisted and charged
                        # against the hard ceiling even if detailed metering fails.
                        logger.error("DeepSeek usage detail write failed (%s); reservation remains charged.", type(exc).__name__)
                else:
                    self.actual_input_tokens += prompt_tokens
                    self.actual_output_tokens += completion_tokens
                    self.actual_total_tokens += total_tokens
                    self.estimated_cost_upper_usd += cost_upper
                    self._persist_usage_ledger()
                logger.info(
                    "deepseek_usage prompt_tokens=%s completion_tokens=%s total_tokens=%s "
                    "estimated_cost_upper_usd=%.8f reserved_tokens=%s",
                    prompt_tokens,
                    completion_tokens,
                    total_tokens,
                    cost_upper,
                    self.reserved_tokens,
                )
            else:
                prompt_tokens = completion_tokens = None
                cost_upper = None
                if self.usage_backend == "postgres":
                    try:
                        self._apply_usage_row(await asyncio.to_thread(self._record_persistent_usage_unavailable))
                    except Exception as exc:
                        logger.error("DeepSeek usage-unavailable counter write failed (%s); reservation remains charged.", type(exc).__name__)
                else:
                    self.usage_unavailable_calls += 1
                    self._persist_usage_ledger()
                logger.warning(
                    "deepseek_usage_unavailable reserved_tokens=%s; conservative reservation remains charged",
                    self.reserved_tokens,
                )

            if not isinstance(content, str) or not content.strip():
                raise ProviderError(self.name, "empty_response")
            if finish_reason == "length":
                raise ProviderError(self.name, "incomplete_response", retryable=False)

            self.successful_responses += 1
            if self.usage_backend == "postgres":
                try:
                    self._apply_usage_row(await asyncio.to_thread(self._record_persistent_success))
                except Exception as exc:
                    logger.error("DeepSeek successful-response counter write failed (%s).", type(exc).__name__)
            else:
                self._persist_usage_ledger()
            return LLMResponse(
                text=content.strip(),
                provider=self.name,
                model=self.model,
                latency_ms=int((time.perf_counter() - started) * 1000),
                input_tokens=prompt_tokens,
                output_tokens=completion_tokens,
                estimated_cost_upper_usd=cost_upper,
            )
        except ProviderError:
            raise
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise ProviderError(self.name, type(exc).__name__) from exc
        except Exception as exc:
            raise ProviderError(self.name, "invalid_provider_response") from exc
