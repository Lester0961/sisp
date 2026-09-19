from contextlib import contextmanager
import sys
import types

import numpy as np

from app.ml import embed_documents


class FakeEngine:
    def __init__(self, documents=None):
        self.calls = []
        self.documents = documents or []
        self.current_document = None

    @contextmanager
    def connect(self):
        yield self

    @contextmanager
    def begin(self):
        yield self

    def execute(self, query, params=None):
        sql = str(query)
        self.calls.append((sql, params or {}))
        if "SELECT id, filename, title, category, content" in sql:
            return type("Rows", (), {"mappings": lambda _self: _self, "all": lambda _self: self.documents})()
        if "SELECT title, category, content, is_active" in sql:
            row = [self.current_document] if self.current_document else []
            return type("Current", (), {"mappings": lambda _self: _self, "first": lambda _self: row[0] if row else None})()


class FakeModel:
    def encode(self, chunks, **_kwargs):
        return np.array([[0.1, 0.2], [0.3, 0.4]])[:len(chunks)]


def test_index_document_upserts_chunks_and_marks_document_indexed(monkeypatch):
    database = FakeEngine()
    database.current_document = {
        "id": "doc-1", "title": "Guide title", "category": "academic_guide",
        "content": "Guide title\n\nFirst section\n\nSecond section", "is_active": True,
    }
    monkeypatch.setattr(embed_documents, "engine", database)
    monkeypatch.setattr(embed_documents.settings, "embedding_model", "test-embedding-model")

    assert embed_documents._index_document(FakeModel(), {
        "id": "doc-1",
        "filename": "guide.txt",
        "title": "Guide title",
        "category": "academic_guide",
        "content": "Guide title\n\nFirst section\n\nSecond section",
    }) is True

    inserts = [call for call in database.calls if "INSERT INTO knowledge_chunks" in call[0]]
    assert len(inserts) == 2
    assert inserts[0][1]["document_id"] == "doc-1"
    assert inserts[0][1]["embedding_model"] == "test-embedding-model"
    assert inserts[0][1]["content"] == "Guide title\nFirst section"
    assert any("SET embedding = NULL" in sql for sql, _params in database.calls)
    status_update = [call for call in database.calls if "SET index_status = 'indexed'" in call[0]]
    assert len(status_update) == 1
    assert status_update[0][1]["document_id"] == "doc-1"


def test_changed_document_is_not_marked_indexed_from_a_stale_snapshot(monkeypatch):
    database = FakeEngine()
    database.current_document = {
        "id": "doc-1", "title": "Updated Guide", "category": "academic_guide",
        "content": "New content", "is_active": True,
    }
    monkeypatch.setattr(embed_documents, "engine", database)

    indexed = embed_documents._index_document(FakeModel(), {
        "id": "doc-1", "title": "Guide", "category": "academic_guide",
        "content": "Old content", "is_active": True,
    })

    assert indexed is False
    assert not any("INSERT INTO knowledge_chunks" in sql for sql, _params in database.calls)
    assert not any("SET index_status = 'indexed'" in sql for sql, _params in database.calls)


def test_indexing_fails_closed_without_database(monkeypatch):
    monkeypatch.setattr(embed_documents, "engine", None)
    monkeypatch.setattr(embed_documents, "check_db_connection", lambda: False)

    try:
        embed_documents.embed_and_index()
        assert False, "expected durable indexing to fail without a database"
    except RuntimeError as exc:
        assert "no local-only indexing success" in str(exc)


def test_failed_document_embedding_persists_failed_index_status(monkeypatch):
    database = FakeEngine([{
        "id": "doc-1", "filename": "guide.txt", "title": "Guide",
        "category": "academic_guide", "content": "Guide\n\nText",
    }])

    class FailedModel:
        def encode(self, *_args, **_kwargs):
            raise RuntimeError("model unavailable")

    monkeypatch.setattr(embed_documents, "engine", database)
    monkeypatch.setattr(embed_documents, "check_db_connection", lambda: True)
    monkeypatch.setitem(sys.modules, "sentence_transformers", types.SimpleNamespace(
        SentenceTransformer=lambda _name: FailedModel(),
    ))

    result = embed_documents.embed_and_index()

    assert result == {"indexed": 0, "failed": 1, "skipped": 0}
    status_update = [call for call in database.calls if "SET index_status = 'failed'" in call[0]]
    assert len(status_update) == 1
    assert status_update[0][1]["document_id"] == "doc-1"
    assert status_update[0][1]["message"] == "Indexing failed; retry the re-index request."
