-- Trisemestral academic calendar and term-level payment metadata.
-- Existing semester/year columns remain during the compatibility window.

CREATE TABLE IF NOT EXISTS "academic_terms" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "academic_year" text NOT NULL,
    "term_number" integer NOT NULL,
    "code" text NOT NULL,
    "label" text NOT NULL,
    "starts_on" date,
    "ends_on" date,
    "status" text NOT NULL DEFAULT 'planned',
    "is_current" boolean NOT NULL DEFAULT false,
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "academic_terms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "academic_terms_code_key"
    ON "academic_terms" ("code");
CREATE UNIQUE INDEX IF NOT EXISTS "academic_terms_academic_year_term_number_key"
    ON "academic_terms" ("academic_year", "term_number");
CREATE INDEX IF NOT EXISTS "academic_terms_current_idx"
    ON "academic_terms" ("is_current", "academic_year", "term_number");

ALTER TABLE "student_semesters"
    ADD COLUMN IF NOT EXISTS "term_id" uuid,
    ADD COLUMN IF NOT EXISTS "payment_status" text NOT NULL DEFAULT 'unpaid',
    ADD COLUMN IF NOT EXISTS "amount_due" numeric(10,2),
    ADD COLUMN IF NOT EXISTS "amount_paid" numeric(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "paid_at" timestamptz,
    ADD COLUMN IF NOT EXISTS "payment_reference" text;

ALTER TABLE "enrollments"
    ADD COLUMN IF NOT EXISTS "term_id" uuid;

ALTER TABLE "curriculum_courses"
    ADD COLUMN IF NOT EXISTS "term_number" integer;

-- Preserve existing 1st/2nd/Summer data while giving every known term a stable id.
INSERT INTO "academic_terms" ("academic_year", "term_number", "code", "label", "status", "is_current")
SELECT DISTINCT
    ss."year",
    CASE lower(trim(ss."semester"))
        WHEN '1st' THEN 1
        WHEN 'first' THEN 1
        WHEN '2nd' THEN 2
        WHEN 'second' THEN 2
        WHEN 'summer' THEN 3
        ELSE 1
    END,
    ss."year" || '-T' || CASE lower(trim(ss."semester"))
        WHEN '1st' THEN 1
        WHEN 'first' THEN 1
        WHEN '2nd' THEN 2
        WHEN 'second' THEN 2
        WHEN 'summer' THEN 3
        ELSE 1
    END,
    CASE lower(trim(ss."semester"))
        WHEN '1st' THEN 'Term 1'
        WHEN 'first' THEN 'Term 1'
        WHEN '2nd' THEN 'Term 2'
        WHEN 'second' THEN 'Term 2'
        WHEN 'summer' THEN 'Term 3'
        ELSE 'Term 1'
    END,
    'planned',
    false
FROM "student_semesters" ss
WHERE ss."year" IS NOT NULL
ON CONFLICT ("academic_year", "term_number") DO NOTHING;

-- Seed the current trisemestral calendar without overwriting a school-configured term.
INSERT INTO "academic_terms" ("academic_year", "term_number", "code", "label", "status", "is_current")
VALUES
    ('2026-2027', 1, '2026-2027-T1', 'Term 1', 'active', true),
    ('2026-2027', 2, '2026-2027-T2', 'Term 2', 'planned', false),
    ('2026-2027', 3, '2026-2027-T3', 'Term 3', 'planned', false)
ON CONFLICT ("academic_year", "term_number") DO NOTHING;

-- RMC program catalog supplied for the trisemestral portal. Existing programs are preserved.
INSERT INTO "programs" ("id", "code", "name", "created_at")
VALUES
    (gen_random_uuid(), 'BSCS', 'Bachelor of Science in Computer Science', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'BSOA', 'Bachelor of Science in Office Administration', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'BSMA', 'Bachelor of Science in Multimedia Arts', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'BSEd-English', 'Bachelor of Secondary Education – English', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'BSEd-Math', 'Bachelor of Secondary Education – Mathematics', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'BSEd-Secondary', 'Bachelor of Secondary Education', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'BSCrim', 'Bachelor of Science in Criminology', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name";

UPDATE "student_semesters" ss
SET "term_id" = at."id",
    "payment_status" = CASE WHEN ss."is_fully_paid" THEN 'paid' ELSE 'unpaid' END
FROM "academic_terms" at
WHERE at."academic_year" = ss."year"
  AND at."term_number" = CASE lower(trim(ss."semester"))
      WHEN '1st' THEN 1
      WHEN 'first' THEN 1
      WHEN '2nd' THEN 2
      WHEN 'second' THEN 2
      WHEN 'summer' THEN 3
      ELSE 1
  END;

UPDATE "enrollments" e
SET "term_id" = at."id"
FROM "academic_terms" at
WHERE e."term_id" IS NULL
  AND e."year" IS NOT NULL
  AND at."academic_year" = e."year"
  AND at."term_number" = CASE lower(trim(e."semester"))
      WHEN '1st' THEN 1
      WHEN 'first' THEN 1
      WHEN '2nd' THEN 2
      WHEN 'second' THEN 2
      WHEN 'summer' THEN 3
      ELSE 1
  END;

UPDATE "curriculum_courses"
SET "term_number" = "semester"
WHERE "term_number" IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'student_semesters_term_id_fkey'
    ) THEN
        ALTER TABLE "student_semesters"
            ADD CONSTRAINT "student_semesters_term_id_fkey"
            FOREIGN KEY ("term_id") REFERENCES "academic_terms"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'enrollments_term_id_fkey'
    ) THEN
        ALTER TABLE "enrollments"
            ADD CONSTRAINT "enrollments_term_id_fkey"
            FOREIGN KEY ("term_id") REFERENCES "academic_terms"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "student_semesters_term_id_idx"
    ON "student_semesters" ("term_id");
CREATE INDEX IF NOT EXISTS "enrollments_term_id_idx"
    ON "enrollments" ("term_id");
CREATE INDEX IF NOT EXISTS "enrollments_instructor_term_idx"
    ON "enrollments" ("instructor_id", "term_id");
