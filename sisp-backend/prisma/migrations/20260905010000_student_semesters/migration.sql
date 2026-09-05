CREATE TABLE IF NOT EXISTS "student_semesters" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "student_id" UUID NOT NULL,
  "semester" TEXT NOT NULL,
  "year" TEXT NOT NULL,
  "is_fully_paid" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_semesters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "student_semesters_student_id_semester_year_key"
  ON "student_semesters"("student_id", "semester", "year");

CREATE INDEX IF NOT EXISTS "student_semesters_student_id_idx"
  ON "student_semesters"("student_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_semesters_student_id_fkey') THEN
    ALTER TABLE "student_semesters" ADD CONSTRAINT "student_semesters_student_id_fkey"
      FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE;
  END IF;
END $$;
