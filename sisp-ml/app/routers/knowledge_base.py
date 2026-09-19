import re
import uuid
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, status
from pydantic import BaseModel, constr
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.database import check_db_connection, engine
from app.ml.embed_documents import embed_and_index
from app.security import verify_ml_secret_value

router = APIRouter(prefix="/kb", tags=["knowledge_base"])

SAFE_FILENAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,123}\.txt$")
SAFE_CATEGORY_RE = re.compile(r"^[a-z][a-z0-9_-]{0,63}$")
SELECT_DOCUMENT = """
    SELECT id, filename, title, category, content, version, effective_date,
           is_active, index_status, index_error, indexed_at, updated_at
    FROM knowledge_documents
"""


def verify_secret(x_ml_secret: Optional[str]):
    verify_ml_secret_value(x_ml_secret)


class DocumentCreate(BaseModel):
    filename: str
    content: constr(min_length=1)
    category: constr(pattern=r"^[a-z][a-z0-9_-]{0,63}$")


class DocumentUpdate(BaseModel):
    content: constr(min_length=1)


def normalize_filename(filename: str) -> str:
    normalized = filename if filename.endswith(".txt") else f"{filename}.txt"
    if not SAFE_FILENAME_RE.fullmatch(normalized):
        raise HTTPException(status_code=400, detail="Invalid document filename.")
    return normalized


def _require_database():
    if engine is None or not check_db_connection():
        raise HTTPException(status_code=503, detail="Durable knowledge-base storage is unavailable.")
    return engine


def _iso(value):
    if value is None:
        return None
    return value.isoformat() if hasattr(value, "isoformat") else str(value)


def _document_response(row, include_content: bool = True) -> dict:
    data = {
        "id": row["id"],
        "filename": row["filename"],
        "title": row["title"],
        "category": row["category"],
        "version": row["version"],
        "effectiveDate": _iso(row["effective_date"]),
        "updatedAt": _iso(row["updated_at"]),
        "active": row["is_active"],
        "indexStatus": row["index_status"],
        "indexError": row["index_error"],
        "indexedAt": _iso(row["indexed_at"]),
    }
    if include_content:
        content = row["content"]
        data["content"] = content
        data["sizeBytes"] = len(content.encode("utf-8"))
    return data


def _title(content: str, fallback: str) -> str:
    return next((line.strip() for line in content.splitlines() if line.strip()), fallback)


@router.get("/documents")
async def list_documents(x_ml_secret: str = Header(None)):
    verify_secret(x_ml_secret)
    database = _require_database()
    try:
        with database.connect() as connection:
            rows = connection.execute(text(SELECT_DOCUMENT + " ORDER BY updated_at DESC, filename ASC")).mappings().all()
        return {"documents": [_document_response(row) for row in rows]}
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        print(f"[KB] Durable document list failed: {type(exc).__name__}")
        raise HTTPException(status_code=503, detail="Knowledge-base documents could not be loaded.") from exc


@router.get("/documents/{filename}")
async def get_document(filename: str, x_ml_secret: str = Header(None)):
    verify_secret(x_ml_secret)
    filename = normalize_filename(filename)
    database = _require_database()
    try:
        with database.connect() as connection:
            row = connection.execute(
                text(SELECT_DOCUMENT + " WHERE filename = :filename AND is_active = TRUE"),
                {"filename": filename},
            ).mappings().first()
        if row is None:
            raise HTTPException(status_code=404, detail=f"Document '{filename}' not found.")
        return _document_response(row)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        print(f"[KB] Durable document read failed: {type(exc).__name__}")
        raise HTTPException(status_code=503, detail="Knowledge-base document could not be loaded.") from exc


@router.put("/documents/{filename}")
async def update_document(filename: str, body: DocumentUpdate, x_ml_secret: str = Header(None)):
    verify_secret(x_ml_secret)
    if not body.content.strip():
        raise HTTPException(status_code=422, detail="Document content must include non-whitespace text.")
    filename = normalize_filename(filename)
    database = _require_database()
    try:
        with database.begin() as connection:
            result = connection.execute(text("""
                UPDATE knowledge_documents
                SET content = :content,
                    title = :title,
                    index_status = 'pending',
                    index_error = NULL,
                    indexed_at = NULL,
                    updated_at = NOW()
                WHERE filename = :filename AND is_active = TRUE
                RETURNING id, filename
            """), {"filename": filename, "content": body.content, "title": _title(body.content, filename)})
            document = result.mappings().first()
            if document is None:
                raise HTTPException(status_code=404, detail=f"Document '{filename}' not found.")
            connection.execute(text("""
                UPDATE knowledge_chunks
                SET embedding = NULL, embedding_model = NULL, embedded_at = NULL
                WHERE document_id = :document_id
            """), {"document_id": document["id"]})
        return {
            "message": f"Document '{filename}' was saved to durable storage; retrieval synchronization is pending.",
            "filename": filename,
            "indexStatus": "pending",
        }
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        print(f"[KB] Durable document update failed: {type(exc).__name__}")
        raise HTTPException(status_code=503, detail="Knowledge-base document could not be updated.") from exc


@router.post("/documents", status_code=status.HTTP_201_CREATED)
async def create_document(body: DocumentCreate, x_ml_secret: str = Header(None)):
    verify_secret(x_ml_secret)
    if not body.content.strip():
        raise HTTPException(status_code=422, detail="Document content must include non-whitespace text.")
    filename = normalize_filename(body.filename)
    if not SAFE_CATEGORY_RE.fullmatch(body.category):
        raise HTTPException(status_code=400, detail="Invalid document category.")
    database = _require_database()
    try:
        with database.begin() as connection:
            row = connection.execute(text("""
                INSERT INTO knowledge_documents
                    (id, filename, title, category, content, version, effective_date,
                     is_active, index_status, index_error, indexed_at, created_at, updated_at)
                VALUES
                    (:id, :filename, :title, :category, :content, NULL, NULL,
                     TRUE, 'pending', NULL, NULL, NOW(), NOW())
                RETURNING id, filename
            """), {
                "id": str(uuid.uuid4()),
                "filename": filename,
                "title": _title(body.content, filename),
                "category": body.category,
                "content": body.content,
            }).mappings().one()
        return {
            "message": f"Document '{filename}' was saved to durable storage; retrieval synchronization is pending.",
            "id": row["id"],
            "filename": filename,
            "indexStatus": "pending",
        }
    except IntegrityError as exc:
        raise HTTPException(status_code=409, detail=f"Document '{filename}' already exists.") from exc
    except SQLAlchemyError as exc:
        print(f"[KB] Durable document creation failed: {type(exc).__name__}")
        raise HTTPException(status_code=503, detail="Knowledge-base document could not be created.") from exc


@router.delete("/documents/{filename}")
async def archive_document(filename: str, x_ml_secret: str = Header(None)):
    verify_secret(x_ml_secret)
    filename = normalize_filename(filename)
    database = _require_database()
    try:
        with database.begin() as connection:
            document = connection.execute(text("""
                UPDATE knowledge_documents
                SET is_active = FALSE,
                    index_status = 'pending',
                    index_error = NULL,
                    indexed_at = NULL,
                    updated_at = NOW()
                WHERE filename = :filename AND is_active = TRUE
                RETURNING id
            """), {"filename": filename}).mappings().first()
            if document is None:
                raise HTTPException(status_code=404, detail=f"Document '{filename}' not found.")
            connection.execute(text("""
                UPDATE knowledge_chunks
                SET embedding = NULL, embedding_model = NULL, embedded_at = NULL
                WHERE document_id = :document_id
            """), {"document_id": document["id"]})
        return {
            "message": f"Document '{filename}' was archived in durable storage.",
            "filename": filename,
            "active": False,
            "indexStatus": "pending",
        }
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        print(f"[KB] Durable document archive failed: {type(exc).__name__}")
        raise HTTPException(status_code=503, detail="Knowledge-base document could not be archived.") from exc


def run_reindex_task():
    try:
        print("[KB] Starting durable knowledge-base re-indexing.")
        embed_and_index()
    except Exception as exc:
        print(f"[KB] Durable re-index task failed: {type(exc).__name__}")


@router.post("/reindex", status_code=status.HTTP_202_ACCEPTED)
async def reindex_embeddings(background_tasks: BackgroundTasks, x_ml_secret: str = Header(None)):
    verify_secret(x_ml_secret)
    database = _require_database()
    try:
        with database.begin() as connection:
            count = connection.execute(text("""
                UPDATE knowledge_documents
                SET index_status = 'pending', index_error = NULL, indexed_at = NULL
                WHERE is_active = TRUE
            """)).rowcount
    except SQLAlchemyError as exc:
        print(f"[KB] Durable re-index request failed: {type(exc).__name__}")
        raise HTTPException(status_code=503, detail="Knowledge-base re-indexing could not be scheduled.") from exc

    background_tasks.add_task(run_reindex_task)
    return {
        "status": "accepted",
        "documentsQueued": count,
        "message": "Re-indexing was accepted. Per-document completion is recorded in the knowledge-base list.",
    }
