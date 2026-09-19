import sys
import os
from contextlib import contextmanager

import numpy as np

# Add parent directory to path so app module can be found
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services import retrieval_service as service_module
from app.services.retrieval_service import retrieval_service
from app.approved_sources import APPROVED_STATIC_SOURCES


def test_retrieval_service_is_ready():
    """Verified local curriculum sources are available in development mode."""
    assert retrieval_service.is_ready() is True


def test_retrieval_uses_verified_program_source():
    results = retrieval_service.retrieve(
        "Which programs are included in the RMC program catalog?", limit=3
    )

    assert results
    assert results[0]["source"] == "program_catalog.txt"
    assert "program" in results[0]["content"].lower()
    assert isinstance(results[0]["similarity"], float)
    assert 0.0 <= results[0]["similarity"] <= 1.0


def test_local_fallback_withholds_unverified_policy_sources():
    results = retrieval_service.retrieve("What is the school GWA probation threshold?", limit=3)

    assert all(result["source"] in APPROVED_STATIC_SOURCES for result in results)


def test_static_source_allowlist_is_exact():
    assert not service_module.RetrievalService._is_approved_static_source("curriculum_unverified.txt")
    assert service_module.RetrievalService._is_approved_static_source("CURRICULUM_BSCS_2024.TXT")


def test_retrieval_threshold_filters_weak_matches(monkeypatch):
    monkeypatch.setattr(service_module.settings, "retrieval_similarity_threshold", 0.3)

    assert service_module.RetrievalService._above_threshold([
        {"similarity": 0.29},
        {"similarity": 0.3},
    ]) == [{"similarity": 0.3}]


def test_production_pgvector_mode_never_falls_back_to_local_data(monkeypatch):
    monkeypatch.setattr(service_module.settings, "require_pgvector", True)
    monkeypatch.setattr(service_module, "check_db_connection", lambda: False)
    monkeypatch.setattr(
        retrieval_service,
        "_lexical_retrieve",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("fallback must not run")),
    )

    assert retrieval_service.retrieve("What is the CS curriculum?", limit=3) == []


def test_production_pgvector_search_uses_active_model_and_similarity_threshold(monkeypatch):
    captured = {}

    class FakeConnection:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def execute(self, statement, params):
            captured["sql"] = str(statement)
            captured["params"] = params
            return iter([("approved content", "program_catalog.txt", "programs_curriculum", 0.8)])

    class FakeEngine:
        @contextmanager
        def connect(self):
            yield FakeConnection()

    monkeypatch.setattr(service_module.settings, "require_pgvector", True)
    monkeypatch.setattr(service_module.settings, "retrieval_similarity_threshold", 0.7)
    monkeypatch.setattr(service_module, "engine", FakeEngine())
    monkeypatch.setattr(service_module, "check_db_connection", lambda: True)
    monkeypatch.setattr(
        retrieval_service,
        "model",
        type("FakeModel", (), {"encode": lambda _self, *_args, **_kwargs: np.array([0.1, 0.2, 0.3])})(),
    )

    results = retrieval_service.retrieve("Which program is offered?", limit=2, category="programs_curriculum")

    assert results == [{
        "content": "approved content",
        "source": "program_catalog.txt",
        "category": "programs_curriculum",
        "similarity": 0.8,
    }]
    assert "chunk.embedding <=> CAST(:query_vector AS vector)" in captured["sql"]
    assert "document.is_active = TRUE" in captured["sql"]
    assert captured["params"]["embedding_model"] == service_module.settings.embedding_model
    assert captured["params"]["category"] == "programs_curriculum"
    assert captured["params"]["limit"] == 2


def test_production_pgvector_empty_result_does_not_fall_back_to_local_index(monkeypatch):
    class FakeConnection:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def execute(self, *_args, **_kwargs):
            return iter([])

    class FakeEngine:
        @contextmanager
        def connect(self):
            yield FakeConnection()

    monkeypatch.setattr(service_module.settings, "require_pgvector", True)
    monkeypatch.setattr(service_module, "engine", FakeEngine())
    monkeypatch.setattr(service_module, "check_db_connection", lambda: True)
    monkeypatch.setattr(
        retrieval_service,
        "model",
        type("FakeModel", (), {"encode": lambda _self, *_args, **_kwargs: np.array([0.1, 0.2, 0.3])})(),
    )
    monkeypatch.setattr(
        retrieval_service,
        "_lexical_retrieve",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("local fallback must not run")),
    )

    assert retrieval_service.retrieve("Unsupported content", limit=2) == []
