import sys
import types

import numpy as np

from app.services import embedding_model


def test_loader_uses_fastembed_onnx_when_sentence_transformers_is_not_installed(monkeypatch):
    class FakeFastEmbed:
        def __init__(self, model_name, threads):
            assert model_name == "test-model"
            assert threads == 1

        def embed(self, texts):
            assert texts == ["first", "second"]
            return iter([[3.0, 4.0], [0.0, 2.0]])

    monkeypatch.setitem(sys.modules, "sentence_transformers", None)
    monkeypatch.setitem(sys.modules, "fastembed", types.SimpleNamespace(TextEmbedding=FakeFastEmbed))
    embedding_model.load_embedding_model.cache_clear()
    try:
        model = embedding_model.load_embedding_model("test-model")
        vectors = model.encode(["first", "second"], normalize_embeddings=True)
    finally:
        embedding_model.load_embedding_model.cache_clear()

    np.testing.assert_allclose(vectors, [[0.6, 0.8], [0.0, 1.0]])


def test_loader_reuses_one_model_for_retrieval_and_indexing(monkeypatch):
    class FakeSentenceTransformer:
        def __init__(self, model_name):
            self.model_name = model_name

    monkeypatch.setitem(
        sys.modules,
        "sentence_transformers",
        types.SimpleNamespace(SentenceTransformer=FakeSentenceTransformer),
    )
    embedding_model.load_embedding_model.cache_clear()
    try:
        first = embedding_model.load_embedding_model("test-model")
        second = embedding_model.load_embedding_model("test-model")
    finally:
        embedding_model.load_embedding_model.cache_clear()

    assert first is second
    assert first.model_name == "test-model"
