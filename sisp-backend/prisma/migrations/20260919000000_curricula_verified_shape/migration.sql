-- Prod-safe migration: VERIFIED curricula shape
-- Preserves existing rows. No data deletion. Review before `prisma migrate deploy`.

-- 1. courses: add LEC/LAB + source fields
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "lec_units" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "lab_units" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "subject_area" TEXT;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "cat_no" TEXT;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "prereq_text" TEXT;

-- 2. courses: relax code uniqueness to (code, title) to allow verified duplicates
-- (OFAD 6300 x2, FILI 6324 x2, MATH 6324 x2, GE reuse). Only drop if it exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_code_key') THEN
    ALTER TABLE "courses" DROP CONSTRAINT "courses_code_key";
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_code_title_key') THEN
    ALTER TABLE "courses" ADD CONSTRAINT "courses_code_title_key" UNIQUE ("code", "title");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "courses_code_idx" ON "courses"("code");

-- 3. course_prerequisites (resolved links, unresolved/self-refs preserved as flags)
CREATE TABLE IF NOT EXISTS "course_prerequisites" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "course_id" TEXT NOT NULL,
  "requires_code" TEXT NOT NULL,
  "requires_id" TEXT,
  "is_self_reference" BOOLEAN NOT NULL DEFAULT false,
  "is_unresolved" BOOLEAN NOT NULL DEFAULT false,
  "note" TEXT,
  CONSTRAINT "course_prerequisites_pkey" PRIMARY KEY ("id")
);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_prerequisites_course_id_fkey') THEN
    ALTER TABLE "course_prerequisites" ADD CONSTRAINT "course_prerequisites_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_prerequisites_requires_id_fkey') THEN
    ALTER TABLE "course_prerequisites" ADD CONSTRAINT "course_prerequisites_requires_id_fkey" FOREIGN KEY ("requires_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_prerequisites_course_id_requires_code_key') THEN
    ALTER TABLE "course_prerequisites" ADD CONSTRAINT "course_prerequisites_course_id_requires_code_key" UNIQUE ("course_id", "requires_code");
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "course_prerequisites_course_id_idx" ON "course_prerequisites"("course_id");

-- 4. curricula: add provenance + dedupe per program/year
ALTER TABLE "curricula" ADD COLUMN IF NOT EXISTS "school_year" TEXT;
ALTER TABLE "curricula" ADD COLUMN IF NOT EXISTS "cmo" TEXT;
ALTER TABLE "curricula" ADD COLUMN IF NOT EXISTS "source_file" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'curricula_program_id_effective_year_key') THEN
    ALTER TABLE "curricula" ADD CONSTRAINT "curricula_program_id_effective_year_key" UNIQUE ("program_id", "effective_year");
  END IF;
END $$;

-- 5. curriculum_courses: add term labels + index for filtered queries
ALTER TABLE "curriculum_courses" ADD COLUMN IF NOT EXISTS "term_label" TEXT;
ALTER TABLE "curriculum_courses" ADD COLUMN IF NOT EXISTS "source_total" TEXT;

CREATE INDEX IF NOT EXISTS "curriculum_courses_curriculum_year_term_idx" ON "curriculum_courses"("curriculum_id", "year_level", "term_number");
