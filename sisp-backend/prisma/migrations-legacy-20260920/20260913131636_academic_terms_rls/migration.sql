-- Academic terms are read-only reference data for authenticated portal users.
-- Backend Prisma access continues through the server-side database role.

ALTER TABLE "academic_terms" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'academic_terms'
          AND policyname = 'academic_terms_authenticated_read'
    ) THEN
        CREATE POLICY "academic_terms_authenticated_read"
            ON "academic_terms"
            FOR SELECT
            TO authenticated
            USING (true);
    END IF;
END $$;
