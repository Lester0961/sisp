-- Assign each enrollment to the faculty member responsible for entering its grades.
-- Nullable keeps existing records safe until an academic administrator maps them.
ALTER TABLE "enrollments"
  ADD COLUMN IF NOT EXISTS "instructor_id" UUID;

CREATE INDEX IF NOT EXISTS "enrollments_instructor_id_idx"
  ON "enrollments"("instructor_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'enrollments_instructor_id_fkey') THEN
    ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_instructor_id_fkey"
      FOREIGN KEY ("instructor_id") REFERENCES "users"("id");
  END IF;
END $$;
