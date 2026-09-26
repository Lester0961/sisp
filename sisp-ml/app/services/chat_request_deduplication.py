"""Short-lived idempotency for retried Nest-to-ML chat requests.

Render currently runs one Uvicorn worker for this service. The cache collapses
concurrent retries and replays completed results within that process; the
provider's PostgreSQL budget remains the cross-restart and cross-instance cost
guard. If ML is scaled to multiple instances, move this cache to a shared store.
"""

import asyncio
import hashlib
import json
import time
from collections import OrderedDict
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any


_CACHE_TTL_SECONDS = 300
_MAX_CACHE_ENTRIES = 512


class ChatRequestConflict(Exception):
    """A request ID was reused with a different body."""


class ChatRequestPreviouslyFailed(Exception):
    """A replay of a request that already failed after processing began."""


@dataclass
class _CachedResult:
    body_hash: str
    result: dict[str, Any] | None
    failed: bool
    expires_at: float


class ChatRequestDeduplicator:
    def __init__(self) -> None:
        self._completed: OrderedDict[str, _CachedResult] = OrderedDict()
        self._in_flight: dict[str, tuple[str, asyncio.Task[dict[str, Any]]]] = {}
        self._lock = asyncio.Lock()

    @staticmethod
    def _hash_body(body: dict[str, Any]) -> str:
        encoded = json.dumps(body, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
        return hashlib.sha256(encoded.encode("utf-8")).hexdigest()

    def _purge_expired(self, now: float) -> None:
        for request_id, entry in list(self._completed.items()):
            if entry.expires_at <= now:
                self._completed.pop(request_id, None)

    def _remember(self, request_id: str, entry: _CachedResult) -> None:
        self._completed[request_id] = entry
        self._completed.move_to_end(request_id)
        while len(self._completed) > _MAX_CACHE_ENTRIES:
            self._completed.popitem(last=False)

    async def run_once(
        self,
        request_id: str,
        body: dict[str, Any],
        operation: Callable[[], Awaitable[dict[str, Any]]],
    ) -> tuple[dict[str, Any], bool]:
        """Run once per request ID and body; return ``(result, was_replay)``."""
        if not request_id or request_id == "untracked":
            return await operation(), False

        body_hash = self._hash_body(body)
        async with self._lock:
            self._purge_expired(time.monotonic())
            cached = self._completed.get(request_id)
            if cached:
                if cached.body_hash != body_hash:
                    raise ChatRequestConflict
                self._completed.move_to_end(request_id)
                if cached.failed or cached.result is None:
                    raise ChatRequestPreviouslyFailed
                return dict(cached.result), True

            current = self._in_flight.get(request_id)
            if current:
                existing_hash, task = current
                if existing_hash != body_hash:
                    raise ChatRequestConflict
                is_replay = True
            else:
                is_replay = False

                async def execute_and_remember() -> dict[str, Any]:
                    try:
                        result = await operation()
                    except BaseException:
                        async with self._lock:
                            self._remember(
                                request_id,
                                _CachedResult(
                                    body_hash=body_hash,
                                    result=None,
                                    failed=True,
                                    expires_at=time.monotonic() + _CACHE_TTL_SECONDS,
                                ),
                            )
                            self._in_flight.pop(request_id, None)
                        raise

                    async with self._lock:
                        self._remember(
                            request_id,
                            _CachedResult(
                                body_hash=body_hash,
                                result=dict(result),
                                failed=False,
                                expires_at=time.monotonic() + _CACHE_TTL_SECONDS,
                            ),
                        )
                        self._in_flight.pop(request_id, None)
                    return result

                task = asyncio.create_task(execute_and_remember())
                self._in_flight[request_id] = (body_hash, task)

        # A disconnected HTTP caller must not cancel the provider request;
        # Nest may retry with the same request ID and replay its outcome.
        return await asyncio.shield(task), is_replay


chat_request_deduplicator = ChatRequestDeduplicator()
