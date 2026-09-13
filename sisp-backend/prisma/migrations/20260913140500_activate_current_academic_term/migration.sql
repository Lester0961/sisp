-- The initial term catalog can already exist in a planned state when the
-- migration is applied to a restored database. Make the active academic
-- period explicit so enrollments without an explicit term resolve safely.
UPDATE "academic_terms"
SET "status" = 'planned',
    "is_current" = false,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "academic_year" = '2026-2027';

UPDATE "academic_terms"
SET "status" = 'active',
    "is_current" = true,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "code" = '2026-2027-T1';
