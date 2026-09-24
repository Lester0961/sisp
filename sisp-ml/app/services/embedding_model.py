"""Shared dense embedding model loader for retrieval and pgvector indexing."""

from functools import lru_cache

import numpy as np


class FastEmbedAdapter:
    """Expose FastEmbed's ONNX model through the SentenceTransformer encode API."""

    def __init__(self, model_name: str):
        from fastembed import TextEmbedding

        # A single ONNX thread keeps the model within Render's free memory limit.
        self._model = TextEmbedding(model_name=model_name, threads=1)

    def encode(self, texts, show_progress_bar: bool = False, normalize_embeddings: bool = False):
        single = isinstance(texts, str)
        batch = [texts] if single else list(texts)
        vectors = np.array(list(self._model.embed(batch)), dtype="float32")
        if normalize_embeddings and vectors.size:
            norms = np.linalg.norm(vectors, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            vectors = vectors / norms
        return vectors[0] if single else vectors


@lru_cache(maxsize=2)
def load_embedding_model(model_name: str):
    """Prefer sentence-transformers when installed, otherwise use FastEmbed."""
    try:
        from sentence_transformers import SentenceTransformer

        return SentenceTransformer(model_name)
    except Exception as first_error:
        print(
            f"[RETRIEVAL] sentence-transformers unavailable ({first_error}); "
            "trying fastembed (ONNX)"
        )
        return FastEmbedAdapter(model_name)
