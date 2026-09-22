-- Human-readable tracking reference for document requests (REQ-YYYY-####).
-- Nullable for historical rows; new requests always receive a value.

ALTER TABLE "document_requests" ADD COLUMN "reference_no" TEXT;

CREATE UNIQUE INDEX "document_requests_reference_no_key" ON "document_requests"("reference_no");
