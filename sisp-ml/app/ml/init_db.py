"""Read-only verification for the migration-managed ARIA vector schema.

Schema creation belongs to reviewed Prisma migrations. This utility must not
issue DDL or create the legacy ``VectorEmbeddings`` table.
"""

from sqlalchemy import text

from app.database import check_db_connection, engine


def check_knowledge_schema() -> bool:
    if engine is None or not check_db_connection():
        print("Database is unavailable; apply the reviewed Prisma migrations before checking ARIA pgvector.")
        return False

    try:
        with engine.connect() as connection:
            result = connection.execute(text("""
                SELECT
                    to_regclass('public.knowledge_documents') IS NOT NULL
                    AND to_regclass('public.knowledge_chunks') IS NOT NULL
                    AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')
            """)).scalar_one()
        if not result:
            print("Reviewed Phase 3 ARIA pgvector structures are missing; no schema changes were attempted.")
            return False
        print("Reviewed Phase 3 ARIA pgvector structures are present.")
        return True
    except Exception as exc:
        print(f"Read-only ARIA pgvector schema check failed: {exc}")
        return False


if __name__ == "__main__":
    raise SystemExit(0 if check_knowledge_schema() else 1)
