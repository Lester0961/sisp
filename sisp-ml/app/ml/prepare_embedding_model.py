"""Build-time warm-up for the ARIA embedding model.

Render's build step pre-downloads the ONNX embedding model so the first
request does not pay the download cost. This is a safe no-op when the model is
already cached; it never blocks the build on network failures.
"""
from app.config import get_settings


def main() -> None:
    settings = get_settings()
    model_name = settings.embedding_model
    try:
        from fastembed import TextEmbedding

        print(f"[prepare] Warming fastembed model: {model_name}")
        TextEmbedding(model_name=model_name)
        print("[prepare] Embedding model ready.")
    except Exception as error:  # pragma: no cover - build-time diagnostic
        print(f"[prepare] WARNING: could not pre-download embedding model ({error})")


if __name__ == "__main__":
    main()
