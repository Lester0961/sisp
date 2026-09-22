-- A course can occur in more than one program with different or blank unit
-- values. Preserve each source row on its curriculum link instead of
-- collapsing program-specific values into the shared courses table.
ALTER TABLE "curriculum_courses"
  ADD COLUMN "source_units" INTEGER,
  ADD COLUMN "source_lec_units" INTEGER,
  ADD COLUMN "source_lab_units" INTEGER;

UPDATE "curriculum_courses" cc
SET "source_units" = c."units",
    "source_lec_units" = c."lec_units",
    "source_lab_units" = c."lab_units"
FROM "courses" c
WHERE c."id" = cc."course_id";

ALTER TABLE "curriculum_courses"
  ALTER COLUMN "source_units" SET NOT NULL,
  ALTER COLUMN "source_lec_units" SET NOT NULL;
