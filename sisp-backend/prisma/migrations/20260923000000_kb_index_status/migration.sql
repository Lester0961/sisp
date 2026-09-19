-- Phase 11: persist per-document retrieval synchronization state.
-- Additive only; reviewed against KnowledgeDocument in schema.prisma.
ALTER TABLE "knowledge_documents"
    ADD COLUMN "index_status" TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN "index_error" TEXT,
    ADD COLUMN "indexed_at" TIMESTAMP(3);
