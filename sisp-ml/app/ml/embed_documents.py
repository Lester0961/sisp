"""Index active, durably stored KB documents into the migration-managed pgvector tables."""

import sys
import os
import uuid

from sqlalchemy import text

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.config import get_settings
from app.database import check_db_connection, engine
from app.services.embedding_model import load_embedding_model

settings = get_settings()


def split_content(content: str, title: str) -> list[str]:
    paragraphs = [part.strip() for part in content.split("\n\n") if part.strip()]
    if not paragraphs:
        return []
    first_line = next((line.strip() for line in content.splitlines() if line.strip()), title)
    prefix = first_line if first_line.casefold() != title.casefold() else title
    if len(paragraphs) > 1 and paragraphs[0].casefold() == prefix.casefold():
        paragraphs = paragraphs[1:]
    return [f"{prefix}\n{paragraph}" for paragraph in paragraphs]


def _set_failed(document_id: str, message: str) -> None:
    if engine is None:
        return
    try:
        with engine.begin() as connection:
            connection.execute(text("""
                UPDATE knowledge_documents
                SET index_status = 'failed', index_error = :message,
                    indexed_at = NULL
                WHERE id = :document_id AND is_active = TRUE
            """), {"document_id": document_id, "message": message})
    except Exception as exc:
        print(f"[INDEXING] Could not persist failure status ({type(exc).__name__}).")


def _index_document(model, document: dict) -> bool:
    chunks = split_content(document["content"], document["title"])
    if not chunks:
        raise ValueError("Document has no indexable content.")
    embeddings = model.encode(chunks, show_progress_bar=False, normalize_embeddings=True)

    with engine.begin() as connection:
        current = connection.execute(text("""
            SELECT title, category, content, is_active
            FROM knowledge_documents
            WHERE id = :document_id
            FOR UPDATE
        """), {"document_id": document["id"]}).mappings().first()
        if (
            current is None
            or not current["is_active"]
            or current["title"] != document["title"]
            or current["category"] != document["category"]
            or current["content"] != document["content"]
        ):
            return False

        for index, (content, embedding) in enumerate(zip(chunks, embeddings)):
            connection.execute(text("""
                INSERT INTO knowledge_chunks
                    (id, document_id, chunk_index, content, category, embedding,
                     embedding_model, embedded_at, created_at)
                VALUES
                (:id, :document_id, :chunk_index, :content, :category,
                     CAST(:embedding AS vector), :embedding_model, NOW(), NOW())
                ON CONFLICT (document_id, chunk_index) DO UPDATE SET
                    content = EXCLUDED.content,
                    category = EXCLUDED.category,
                    embedding = EXCLUDED.embedding,
                    embedding_model = EXCLUDED.embedding_model,
                    embedded_at = EXCLUDED.embedded_at
            """), {
                "id": str(uuid.uuid4()),
                "document_id": document["id"],
                "chunk_index": index,
                "content": content,
                "category": document["category"],
                "embedding": str(embedding.tolist()),
                "embedding_model": settings.embedding_model,
            })

        connection.execute(text("""
            UPDATE knowledge_chunks
            SET embedding = NULL, embedding_model = NULL, embedded_at = NULL
            WHERE document_id = :document_id AND chunk_index >= :chunk_count
        """), {"document_id": document["id"], "chunk_count": len(chunks)})
        connection.execute(text("""
            UPDATE knowledge_documents
            SET index_status = 'indexed', index_error = NULL,
                indexed_at = NOW()
            WHERE id = :document_id AND is_active = TRUE
        """), {"document_id": document["id"]})
    return True


def embed_and_index() -> dict:
    if not settings.use_dense_retrieval:
        print("[INDEXING] Dense embedding is disabled; live approved documents use sparse retrieval.")
        return {"indexed": 0, "failed": 0, "skipped": 0, "mode": "sparse"}

    if engine is None or not check_db_connection():
        raise RuntimeError("Durable database is unavailable; no local-only indexing success is reported.")

    with engine.connect() as connection:
        documents = [dict(row) for row in connection.execute(text("""
            SELECT document.id, document.filename, document.title, document.category, document.content
            FROM knowledge_documents AS document
            WHERE document.is_active = TRUE
              AND (
                document.index_status IS DISTINCT FROM 'indexed'
                OR NOT EXISTS (
                    SELECT 1
                    FROM knowledge_chunks AS chunk
                    WHERE chunk.document_id = document.id
                      AND chunk.embedding IS NOT NULL
                      AND chunk.embedding_model = :embedding_model
                )
              )
            ORDER BY document.filename ASC
        """), {"embedding_model": settings.embedding_model}).mappings().all()]

    if not documents:
        return {"indexed": 0, "failed": 0}

    try:
        model = load_embedding_model(settings.embedding_model)
    except Exception as exc:
        message = "Embedding model could not be loaded; retry indexing after service recovery."
        for document in documents:
            _set_failed(document["id"], message)
        print(f"[INDEXING] Embedding model load failed ({type(exc).__name__}); {len(documents)} document(s) marked failed.")
        return {"indexed": 0, "failed": len(documents)}

    indexed = 0
    failed = 0
    skipped = 0
    for document in documents:
        try:
            if _index_document(model, document):
                indexed += 1
            else:
                skipped += 1
        except Exception as exc:
            _set_failed(document["id"], "Indexing failed; retry the re-index request.")
            print(f"[INDEXING] {document['filename']} failed ({type(exc).__name__}).")
            failed += 1

    print(f"[INDEXING] Complete: {indexed} indexed, {failed} failed, {skipped} changed/archived during indexing.")
    return {"indexed": indexed, "failed": failed, "skipped": skipped}


if __name__ == "__main__":
    embed_and_index()
