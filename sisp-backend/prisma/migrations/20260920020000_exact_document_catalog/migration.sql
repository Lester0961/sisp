-- Enforce exactly the six user-approved active request choices. Legacy
-- catalog rows are made inactive, not deleted, so this remains reversible.
UPDATE "document_catalog_items"
SET "is_active" = false, "updated_at" = now()
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
