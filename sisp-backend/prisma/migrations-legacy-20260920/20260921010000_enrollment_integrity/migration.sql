-- Phase 3 (P3-02): enforce one active enrollment identity per
-- student/course/term at the database level.
--
-- Staged constraint application: duplicates must be resolved by the
-- institution first. This migration never deletes or mutates enrollment
-- rows; it fails with a clear message when duplicates exist so they can be
-- reviewed. Rows with a NULL term_id (legacy records) are exempt because
-- PostgreSQL treats NULLs as distinct in unique indexes.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "enrollments"
        WHERE "term_id" IS NOT NULL
        GROUP BY "student_id", "course_id", "term_id"
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate enrollments detected for the same student/course/term. Resolve duplicates before applying this migration.';
    END IF;
END $$;

CREATE UNIQUE INDEX "enrollments_student_id_course_id_term_id_key" ON "enrollments"("student_id", "course_id", "term_id");
