-- Phase 1: remove the Live Agent role from the role catalog.
--
-- The escalation FEATURE is retained: tickets go to the Dean queue and are
-- forwarded to other staff accounts (faculty/dean/registrar/treasury/sys_admin)
-- through the escalation.* permissions. This migration is data-safe: it only
-- deletes the obsolete role row when no user still references it. Otherwise it
-- leaves the role in place and reports, so operators can run the account
-- migration report first and no historical authorship is ever orphaned.

DO $$
DECLARE
  live_role_id text;
  referencing_users integer;
BEGIN
  SELECT "id" INTO live_role_id FROM "roles" WHERE "name" = 'live_agent';
  IF live_role_id IS NULL THEN
    RETURN;
  END IF;

  SELECT count(*) INTO referencing_users FROM "users" WHERE "role_id" = live_role_id;
  IF referencing_users > 0 THEN
    RAISE NOTICE 'live_agent role retained: % user(s) still reference it. Migrate those accounts to institutional roles, then re-run this migration.', referencing_users;
    RETURN;
  END IF;

  DELETE FROM "role_permissions" WHERE "role_id" = live_role_id;
  DELETE FROM "roles" WHERE "id" = live_role_id;
END $$;
