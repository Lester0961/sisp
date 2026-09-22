-- NEXT 1: seed the institutional admission requirement catalog.
-- These are the requirements already referenced by the application code and
-- UI; no invented document types are added.
INSERT INTO "admission_requirement_definitions"
  ("id", "code", "title", "applicant_type", "is_required", "sort_order", "is_active", "created_at", "updated_at")
VALUES
  ('20000000-0000-4000-8000-000000000001', 'FORM_137', 'High School Report Card (Form 138 / SF9)', 'freshman', true, 10, true, now(), now()),
  ('20000000-0000-4000-8000-000000000002', 'GOOD_MORAL', 'Certificate of Good Moral Character', NULL, true, 20, true, now(), now()),
  ('20000000-0000-4000-8000-000000000003', 'PSA_BIRTH', 'PSA Birth Certificate', NULL, true, 30, true, now(), now()),
  ('20000000-0000-4000-8000-000000000004', 'ID_PHOTO', '2x2 Recent Colored Photo', NULL, true, 40, true, now(), now()),
  ('20000000-0000-4000-8000-000000000005', 'HONORABLE_DISMISSAL', 'Honorable Dismissal / Transfer Credential', 'transferee', true, 50, true, now(), now())
ON CONFLICT ("code") DO NOTHING;
