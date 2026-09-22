"""Idempotently sync the code-allowlisted ARIA source files into the durable KB."""

import hashlib
import sys
import uuid
from pathlib import Path

from sqlalchemy import text

sys.path.append(str(Path(__file__).resolve().parents[2]))

from app.approved_sources import APPROVED_STATIC_SOURCES
from app.database import check_db_connection, engine


KB_DIR = Path(__file__).resolve().parents[1] / "data" / "knowledge_base"


def sync_approved_sources() -> int:
    if engine is None or not check_db_connection():
        raise RuntimeError("Durable database is unavailable; approved sources were not synced.")

    files = sorted(APPROVED_STATIC_SOURCES)
    missing = [name for name in files if not (KB_DIR / name).is_file()]
    if missing:
        raise FileNotFoundError(f"Allowlisted knowledge source is missing: {', '.join(missing)}")

    synced = 0
    with engine.begin() as connection:
        for filename in files:
            content = (KB_DIR / filename).read_text(encoding="utf-8").strip()
            if not content:
                raise ValueError(f"Knowledge source is empty: {filename}")
            title = next((line.strip() for line in content.splitlines() if line.strip()), filename)
            category = (
                "curriculum" if filename.startswith("curriculum_")
                else "document_fees" if filename == "document_fees_user_approved.txt"
                else "enrollment_policy" if filename == "enrollment_interview_guidance.txt"
                else "student_services_faq" if filename == "student_services_faq_2026.txt"
                else "program_catalog"
            )
            version = hashlib.sha256(content.encode("utf-8")).hexdigest()
            document_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"sisp-aria-source:{filename}"))
            connection.execute(text("""
                INSERT INTO knowledge_documents
                    (id, filename, title, category, content, version, is_active, index_status,
                     index_error, indexed_at, created_at, updated_at)
                VALUES
                    (:id, :filename, :title, :category, :content, :version, TRUE, 'pending',
                     NULL, NULL, NOW(), NOW())
                ON CONFLICT (filename) DO UPDATE SET
                    title = EXCLUDED.title,
                    category = EXCLUDED.category,
                    content = EXCLUDED.content,
                    version = EXCLUDED.version,
                    is_active = TRUE,
                    index_status = CASE
                        WHEN knowledge_documents.title IS DISTINCT FROM EXCLUDED.title
                          OR knowledge_documents.category IS DISTINCT FROM EXCLUDED.category
                          OR knowledge_documents.content IS DISTINCT FROM EXCLUDED.content
                          OR knowledge_documents.version IS DISTINCT FROM EXCLUDED.version
                        THEN 'pending' ELSE knowledge_documents.index_status END,
                    index_error = CASE
                        WHEN knowledge_documents.content IS DISTINCT FROM EXCLUDED.content
                        THEN NULL ELSE knowledge_documents.index_error END,
                    indexed_at = CASE
                        WHEN knowledge_documents.content IS DISTINCT FROM EXCLUDED.content
                        THEN NULL ELSE knowledge_documents.indexed_at END,
                    updated_at = NOW()
            """), {
                "id": document_id,
                "filename": filename,
                "title": title,
                "category": category,
                "content": content,
                "version": version,
            })
            synced += 1
    print(f"[KB] Synced {synced} explicitly allowlisted source documents.")
    return synced


if __name__ == "__main__":
    sync_approved_sources()
