import asyncio

import pytest

from app.services.chat_request_deduplication import (
    ChatRequestConflict,
    ChatRequestDeduplicator,
    ChatRequestPreviouslyFailed,
)


def test_concurrent_and_completed_retries_reuse_one_result():
    async def scenario():
        deduplicator = ChatRequestDeduplicator()
        started = asyncio.Event()
        release = asyncio.Event()
        calls = 0

        async def operation():
            nonlocal calls
            calls += 1
            started.set()
            await release.wait()
            return {"response": "grounded response"}

        first = asyncio.create_task(
            deduplicator.run_once("request-1", {"query": "question"}, operation)
        )
        await started.wait()
        second = asyncio.create_task(
            deduplicator.run_once("request-1", {"query": "question"}, operation)
        )
        release.set()
        first_result, second_result = await asyncio.gather(first, second)
        third_result = await deduplicator.run_once(
            "request-1", {"query": "question"}, operation
        )

        assert calls == 1
        assert first_result == ({"response": "grounded response"}, False)
        assert second_result == ({"response": "grounded response"}, True)
        assert third_result == ({"response": "grounded response"}, True)

    asyncio.run(scenario())


def test_request_id_cannot_be_reused_for_different_content():
    async def scenario():
        deduplicator = ChatRequestDeduplicator()

        async def operation():
            return {"response": "answer"}

        await deduplicator.run_once("request-2", {"query": "first"}, operation)
        with pytest.raises(ChatRequestConflict):
            await deduplicator.run_once("request-2", {"query": "second"}, operation)

    asyncio.run(scenario())


def test_failed_request_is_not_reprocessed_on_retry():
    async def scenario():
        deduplicator = ChatRequestDeduplicator()
        calls = 0

        async def operation():
            nonlocal calls
            calls += 1
            raise RuntimeError("simulated provider failure")

        with pytest.raises(RuntimeError):
            await deduplicator.run_once("request-3", {"query": "question"}, operation)
        with pytest.raises(ChatRequestPreviouslyFailed):
            await deduplicator.run_once("request-3", {"query": "question"}, operation)

        assert calls == 1

    asyncio.run(scenario())
