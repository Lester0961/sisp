-- Add server-owned billing bases and immutable TOR quote snapshots.
ALTER TABLE "document_catalog_items"
  ADD COLUMN "billing_basis" TEXT NOT NULL DEFAULT 'copy';

UPDATE "document_catalog_items"
SET "billing_basis" = 'page'
WHERE "code" = 'transcript_of_records';

ALTER TABLE "document_request_items"
  ADD COLUMN "billing_basis" TEXT NOT NULL DEFAULT 'copy',
  ADD COLUMN "page_count" INTEGER;

UPDATE "document_request_items" AS item
SET "billing_basis" = catalog."billing_basis"
FROM "document_catalog_items" AS catalog
WHERE item."catalog_item_id" = catalog."id";

ALTER TABLE "document_request_items"
  ADD CONSTRAINT "document_request_items_page_count_positive"
  CHECK ("page_count" IS NULL OR "page_count" > 0);

ALTER TABLE "document_requests"
  ADD COLUMN "quote_confirmed_by_id" TEXT,
  ADD COLUMN "quote_confirmed_at" TIMESTAMP(3);

ALTER TABLE "document_requests"
  ADD CONSTRAINT "document_requests_quote_confirmed_by_id_fkey"
  FOREIGN KEY ("quote_confirmed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "document_requests_payment_proof_reference_unique"
  ON "document_requests" ("payment_proof_channel", "payment_proof_reference");
