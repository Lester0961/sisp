import asyncio
from contextlib import contextmanager
from datetime import date, datetime, timezone

import pytest
from fastapi import BackgroundTasks, HTTPException

from app.routers import knowledge_base as kb


class Result:
    def __init__(self, rows=None, rowcount=0):
        self.rows = rows or []
        self.rowcount = rowcount

    def mappings(self):
        return self

    def all(self):
        return self.rows

    def first(self):
        return self.rows[0] if self.rows else None

    def one(self):
        if len(self.rows) != 1:
            raise AssertionError("expected exactly one returned row")
        return self.rows[0]


class FakeEngine:
    def __init__(self, responder=None):
        self.calls = []
        self.responder = responder or (lambda _sql, _params: Result())

    @contextmanager
    def connect(self):
        yield self

    @contextmanager
    def begin(self):
        yield self

    def execute(self, query, params=None):
        sql = str(query)
        self.calls.append((sql, params or {}))
        return self.responder(sql, params or {})


def test_filename_normalization_rejects_unsafe_names():
    for filename in ["../outside.txt", "..\\outside.txt", ".hidden.txt", "nested/file.txt", "bad name.txt", "a" * 125 + ".txt"]:
        with pytest.raises(HTTPException) as exc:
            kb.normalize_filename(filename)
        assert exc.value.status_code == 400


def test_filename_normalization_adds_txt_extension():
    assert kb.normalize_filename("program_catalog") == "program_catalog.txt"


def test_metadata_projection_preserves_source_fields_without_inventing_version():
    row = {
        "id": "doc-1",
        "filename": "program_catalog.txt",
        "title": "RMC Program Catalog",
        "category": "programs_curriculum",
        "content": "RMC Program Catalog\nBSCS",
        "version": None,
        "effective_date": None,
        "is_active": True,
        "index_status": "pending",
        "index_error": None,
        "indexed_at": None,
        "updated_at": datetime(2026, 9, 1, tzinfo=timezone.utc),
    }

    document = kb._document_response(row)

    assert document["title"] == "RMC Program Catalog"
    assert document["category"] == "programs_curriculum"
    assert document["version"] is None
    assert document["effectiveDate"] is None
    assert document["active"] is True
    assert document["indexStatus"] == "pending"
    assert document["sizeBytes"] == len(row["content"].encode("utf-8"))


def test_list_documents_reads_durable_rows_and_includes_archived_status(monkeypatch):
    row = {
        "id": "doc-1", "filename": "old.txt", "title": "Old", "category": "policy",
        "content": "text", "version": None, "effective_date": date(2026, 1, 1),
        "is_active": False, "index_status": "pending", "index_error": None,
        "indexed_at": None, "updated_at": datetime(2026, 9, 1, tzinfo=timezone.utc),
    }
    database = FakeEngine(lambda sql, _params: Result([row]) if "ORDER BY updated_at" in sql else Result())
    monkeypatch.setattr(kb, "verify_secret", lambda _secret: None)
    monkeypatch.setattr(kb, "engine", database)
    monkeypatch.setattr(kb, "check_db_connection", lambda: True)

    result = asyncio.run(kb.list_documents("test"))

    assert result["documents"][0]["active"] is False
    assert result["documents"][0]["effectiveDate"] == "2026-01-01"
    assert "FROM knowledge_documents" in database.calls[0][0]


def test_list_documents_fails_closed_when_database_is_unavailable(monkeypatch):
    monkeypatch.setattr(kb, "verify_secret", lambda _secret: None)
    monkeypatch.setattr(kb, "engine", None)
    monkeypatch.setattr(kb, "check_db_connection", lambda: False)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(kb.list_documents("test"))

    assert exc.value.status_code == 503


def test_create_document_persists_metadata_and_marks_index_pending(monkeypatch):
    database = FakeEngine(lambda sql, _params: Result([{"id": "doc-1", "filename": "guide.txt"}]) if "INSERT INTO knowledge_documents" in sql else Result())
    monkeypatch.setattr(kb, "verify_secret", lambda _secret: None)
    monkeypatch.setattr(kb, "engine", database)
    monkeypatch.setattr(kb, "check_db_connection", lambda: True)
    body = kb.DocumentCreate(filename="guide", content="Academic Guide\n\nSource content", category="academic_guide")

    result = asyncio.run(kb.create_document(body, "test"))

    assert result["filename"] == "guide.txt"
    assert result["indexStatus"] == "pending"
    sql, params = database.calls[0]
    assert "INSERT INTO knowledge_documents" in sql
    assert params["title"] == "Academic Guide"
    assert params["category"] == "academic_guide"
    assert "version" in sql and "effective_date" in sql


def test_update_invalidates_old_vectors_before_pending_status(monkeypatch):
    def responder(sql, _params):
        if "UPDATE knowledge_documents" in sql:
            return Result([{"id": "doc-1", "filename": "guide.txt"}])
        return Result()

    database = FakeEngine(responder)
    monkeypatch.setattr(kb, "verify_secret", lambda _secret: None)
    monkeypatch.setattr(kb, "engine", database)
    monkeypatch.setattr(kb, "check_db_connection", lambda: True)

    result = asyncio.run(kb.update_document("guide.txt", kb.DocumentUpdate(content="Updated Guide"), "test"))

    assert result["indexStatus"] == "pending"
    assert len(database.calls) == 2
    assert "index_error = NULL" in database.calls[0][0]
    assert "embedding = NULL" in database.calls[1][0]
    assert database.calls[1][1]["document_id"] == "doc-1"


def test_archive_is_soft_and_removes_vectors_from_retrieval(monkeypatch):
    database = FakeEngine(lambda sql, _params: Result([{"id": "doc-1"}]) if "UPDATE knowledge_documents" in sql else Result())
    monkeypatch.setattr(kb, "verify_secret", lambda _secret: None)
    monkeypatch.setattr(kb, "engine", database)
    monkeypatch.setattr(kb, "check_db_connection", lambda: True)

    result = asyncio.run(kb.archive_document("guide.txt", "test"))

    assert result["active"] is False
    assert "is_active = FALSE" in database.calls[0][0]
    assert "DELETE FROM" not in database.calls[0][0]
    assert "embedding = NULL" in database.calls[1][0]


def test_reindex_persists_pending_before_scheduling_background_work(monkeypatch):
    database = FakeEngine(lambda sql, _params: Result(rowcount=3) if "UPDATE knowledge_documents" in sql else Result())
    monkeypatch.setattr(kb, "verify_secret", lambda _secret: None)
    monkeypatch.setattr(kb, "engine", database)
    monkeypatch.setattr(kb, "check_db_connection", lambda: True)
    tasks = BackgroundTasks()

    result = asyncio.run(kb.reindex_embeddings(tasks, "test"))

    assert result["status"] == "accepted"
    assert result["documentsQueued"] == 3
    assert "index_status = 'pending'" in database.calls[0][0]
    assert len(tasks.tasks) == 1
