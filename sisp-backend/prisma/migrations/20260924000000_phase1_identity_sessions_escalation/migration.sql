-- Phase 1 repair (identity, sessions, MFA challenges, onboarding verification)
-- and the escalation permission model. Additive only; no drops.

-- ---------------------------------------------------------------------------
-- 1. Amended columns
-- ---------------------------------------------------------------------------
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "lifecycle_status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "escalation_queue" ADD COLUMN IF NOT EXISTS "routing_note" TEXT;
ALTER TABLE "escalation_queue" ADD COLUMN IF NOT EXISTS "resolved_at" TIMESTAMP(3);

-- ---------------------------------------------------------------------------
-- 2. Server-side session storage (refresh rotation / revocation / logout)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "auth_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "token_family_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "auth_sessions_refresh_token_hash_key" ON "auth_sessions"("refresh_token_hash");
CREATE INDEX IF NOT EXISTS "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "auth_sessions_token_family_id_idx" ON "auth_sessions"("token_family_id");

-- ---------------------------------------------------------------------------
-- 3. MFA challenges (hashed OTP, single use, hashed at rest)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "mfa_challenges" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'login',
    "otp_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "consumed_at" TIMESTAMP(3),
    "ip_address" TEXT,

    CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "mfa_challenges_user_id_purpose_idx" ON "mfa_challenges"("user_id", "purpose");
CREATE INDEX IF NOT EXISTS "mfa_challenges_expires_at_idx" ON "mfa_challenges"("expires_at");

-- ---------------------------------------------------------------------------
-- 4. Password reset tokens (hashed)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "requested_ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- ---------------------------------------------------------------------------
-- 5. Returning / alumni identity verification
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "student_identity_verifications" (
    "id" TEXT NOT NULL,
    "applicant_email" TEXT NOT NULL,
    "verification_type" TEXT NOT NULL,
    "claimed_student_number" TEXT,
    "claimed_first_name" TEXT NOT NULL,
    "claimed_middle_name" TEXT,
    "claimed_last_name" TEXT NOT NULL,
    "previous_name" TEXT,
    "date_of_birth" DATE,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_user_id" TEXT,
    "matched_student_profile_id" TEXT,
    "remarks" TEXT,

    CONSTRAINT "student_identity_verifications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "student_identity_verifications_matched_student_profile_id_key" ON "student_identity_verifications"("matched_student_profile_id");
CREATE INDEX IF NOT EXISTS "student_identity_verifications_status_idx" ON "student_identity_verifications"("status");
CREATE INDEX IF NOT EXISTS "student_identity_verifications_applicant_email_idx" ON "student_identity_verifications"("applicant_email");

CREATE TABLE IF NOT EXISTS "identity_verification_documents" (
    "id" TEXT NOT NULL,
    "verification_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "storage_object_key" TEXT NOT NULL,
    "original_file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "review_status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by_user_id" TEXT,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "identity_verification_documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "identity_verification_documents_verification_id_idx" ON "identity_verification_documents"("verification_id");

-- ---------------------------------------------------------------------------
-- 6. Foreign keys
-- ---------------------------------------------------------------------------
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mfa_challenges" ADD CONSTRAINT "mfa_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_identity_verifications" ADD CONSTRAINT "student_identity_verifications_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_identity_verifications" ADD CONSTRAINT "student_identity_verifications_matched_student_profile_id_fkey" FOREIGN KEY ("matched_student_profile_id") REFERENCES "student_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "identity_verification_documents" ADD CONSTRAINT "identity_verification_documents_verification_id_fkey" FOREIGN KEY ("verification_id") REFERENCES "student_identity_verifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "identity_verification_documents" ADD CONSTRAINT "identity_verification_documents_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 7. Escalation permission model (Dean queue + assigned staff response)
-- ---------------------------------------------------------------------------
INSERT INTO "permissions" ("id", "action", "resource") VALUES
  ('perm-escalation-view-assigned', 'view_assigned', 'escalation'),
  ('perm-escalation-respond', 'respond', 'escalation'),
  ('perm-escalation-view-dean-queue', 'view_dean_queue', 'escalation'),
  ('perm-escalation-assign', 'assign', 'escalation'),
  ('perm-escalation-reassign', 'reassign', 'escalation'),
  ('perm-escalation-resolve', 'resolve', 'escalation')
ON CONFLICT ("action", "resource") DO NOTHING;

-- Re-link the institutional roles with their complete permission sets.
DELETE FROM "role_permissions"
WHERE "role_id" IN (
  SELECT "id" FROM "roles"
  WHERE "name" IN ('faculty', 'dean', 'registrar', 'treasury', 'sys_admin')
);

-- faculty
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
WHERE r."name" = 'faculty'
  AND (p."resource" || '.' || p."action") IN ('student_record.read_assigned', 'escalation.view_assigned', 'escalation.respond', 'escalation.resolve')
ON CONFLICT DO NOTHING;

-- dean
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
WHERE r."name" = 'dean'
  AND (p."resource" || '.' || p."action") IN ('student_record.read_assigned', 'aria_trends.read', 'report.read', 'escalation.view_assigned', 'escalation.respond', 'escalation.view_dean_queue', 'escalation.assign', 'escalation.reassign', 'escalation.resolve')
ON CONFLICT DO NOTHING;

-- registrar
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
WHERE r."name" = 'registrar'
  AND (p."resource" || '.' || p."action") IN ('student_record.read_assigned', 'student_record.update', 'enrollment.process', 'service_request.process', 'knowledge_base.manage', 'report.read', 'escalation.view_assigned', 'escalation.respond', 'escalation.resolve')
ON CONFLICT DO NOTHING;

-- treasury
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
WHERE r."name" = 'treasury'
  AND (p."resource" || '.' || p."action") IN ('financial.manage', 'report.read', 'escalation.view_assigned', 'escalation.respond', 'escalation.resolve')
ON CONFLICT DO NOTHING;

-- sys_admin has administrative actions and limited record read access only.
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
WHERE r."name" = 'sys_admin'
  AND (p."resource" || '.' || p."action") IN ('student_record.read_assigned', 'knowledge_base.manage', 'report.read', 'user.manage', 'role.manage', 'audit.read', 'system_settings.manage', 'security.manage', 'escalation.view_assigned', 'escalation.respond', 'escalation.resolve')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. RLS + client-role grants for the new tables (matches fresh_schema policy)
-- ---------------------------------------------------------------------------
DO $$
DECLARE item text;
BEGIN
  FOREACH item IN ARRAY ARRAY[
    'auth_sessions',
    'mfa_challenges',
    'password_reset_tokens',
    'student_identity_verifications',
    'identity_verification_documents'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', item);
  END LOOP;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
