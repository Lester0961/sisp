-- Phase 7 (P7-04): audit trail captures old/new values for status changes.
ALTER TABLE "audit_logs" ADD COLUMN "old_value" TEXT,
ADD COLUMN "new_value" TEXT;