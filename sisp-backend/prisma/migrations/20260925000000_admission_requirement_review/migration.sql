-- NEXT 1: secure admission requirement uploads + review history.
ALTER TABLE "admission_requirement_submissions"
  ADD COLUMN IF NOT EXISTS "storage_object_key" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewed_by_user_id" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP(3);
