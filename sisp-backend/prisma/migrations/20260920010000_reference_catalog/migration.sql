-- Canonical roles, least-privilege permissions, and the six user-approved
-- document requests. No user or person-linked records are created here.

INSERT INTO "roles" ("id", "name") VALUES
  ('role-id-student', 'student'),
  ('role-id-faculty', 'faculty'),
  ('role-id-dean', 'dean'),
  ('role-id-registrar', 'registrar'),
  ('role-id-treasury', 'treasury'),
  ('role-id-sys_admin', 'sys_admin'),
  ('role-id-live_agent', 'live_agent')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "permissions" ("id", "action", "resource") VALUES
  ('perm-student-record-read-own', 'read_own', 'student_record'),
  ('perm-student-record-read-assigned', 'read_assigned', 'student_record'),
  ('perm-student-record-update', 'update', 'student_record'),
  ('perm-enrollment-read-own', 'read_own', 'enrollment'),
  ('perm-enrollment-process', 'process', 'enrollment'),
  ('perm-financial-read-own', 'read_own', 'financial'),
  ('perm-financial-manage', 'manage', 'financial'),
  ('perm-service-request-create', 'create', 'service_request'),
  ('perm-service-request-process', 'process', 'service_request'),
  ('perm-aria-use', 'use', 'aria'),
  ('perm-aria-trends-read', 'read', 'aria_trends'),
  ('perm-knowledge-base-manage', 'manage', 'knowledge_base'),
  ('perm-report-read', 'read', 'report'),
  ('perm-user-manage', 'manage', 'user'),
  ('perm-role-manage', 'manage', 'role'),
  ('perm-audit-read', 'read', 'audit'),
  ('perm-system-settings-manage', 'manage', 'system_settings'),
  ('perm-security-manage', 'manage', 'security')
ON CONFLICT ("action", "resource") DO NOTHING;

-- student
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
WHERE r."name" = 'student'
  AND (p."resource" || '.' || p."action") IN ('student_record.read_own', 'enrollment.read_own', 'financial.read_own', 'service_request.create', 'aria.use')
ON CONFLICT DO NOTHING;

-- faculty
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
WHERE r."name" = 'faculty'
  AND (p."resource" || '.' || p."action") IN ('student_record.read_assigned')
ON CONFLICT DO NOTHING;

-- dean
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
WHERE r."name" = 'dean'
  AND (p."resource" || '.' || p."action") IN ('student_record.read_assigned', 'aria_trends.read', 'report.read')
ON CONFLICT DO NOTHING;

-- registrar
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
WHERE r."name" = 'registrar'
  AND (p."resource" || '.' || p."action") IN ('student_record.read_assigned', 'student_record.update', 'enrollment.process', 'service_request.process', 'knowledge_base.manage', 'report.read')
ON CONFLICT DO NOTHING;

-- treasury
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
WHERE r."name" = 'treasury'
  AND (p."resource" || '.' || p."action") IN ('financial.manage', 'report.read')
ON CONFLICT DO NOTHING;

-- sys_admin has administrative actions and limited record read access only.
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
WHERE r."name" = 'sys_admin'
  AND (p."resource" || '.' || p."action") IN ('student_record.read_assigned', 'knowledge_base.manage', 'report.read', 'user.manage', 'role.manage', 'audit.read', 'system_settings.manage', 'security.manage')
ON CONFLICT DO NOTHING;

-- live_agent has no global permission grants; chat access is assignment-scoped.

UPDATE "document_catalog_items"
SET "is_active" = false
WHERE "code" NOT IN (
  'certificate_of_good_moral', 'copy_of_grades', 'certificate_of_registration',
  'certified_true_copy_grades', 'transcript_of_records', 'certificate_of_enrollment'
);

INSERT INTO "document_catalog_items"
  ("id", "code", "label", "fee", "fee_note", "sort_order", "is_active", "updated_at")
VALUES
  ('10000000-0000-4000-8000-000000000001', 'certificate_of_good_moral', 'Certificate of good moral', 500, NULL, 10, true, now()),
  ('10000000-0000-4000-8000-000000000002', 'copy_of_grades', '2nd copy of grades', 150, NULL, 20, true, now()),
  ('10000000-0000-4000-8000-000000000003', 'certificate_of_registration', 'COR', 300, NULL, 30, true, now()),
  ('10000000-0000-4000-8000-000000000004', 'certified_true_copy_grades', 'certified true copy - copy of grades', 300, NULL, 40, true, now()),
  ('10000000-0000-4000-8000-000000000005', 'transcript_of_records', 'TOR', 500, 'per page', 50, true, now()),
  ('10000000-0000-4000-8000-000000000006', 'certificate_of_enrollment', 'COE', 300, NULL, 60, true, now())
ON CONFLICT ("code") DO UPDATE SET
  "label" = EXCLUDED."label",
  "fee" = EXCLUDED."fee",
  "fee_note" = EXCLUDED."fee_note",
  "sort_order" = EXCLUDED."sort_order",
  "is_active" = true,
  "updated_at" = now();
