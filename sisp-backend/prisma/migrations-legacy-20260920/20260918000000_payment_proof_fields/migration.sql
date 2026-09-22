-- Add student-submitted online payment proof columns (GCash/PNB reference,
-- verified by Treasury before payment confirmation).
ALTER TABLE "document_requests" ADD COLUMN "payment_proof_channel" TEXT,
ADD COLUMN "payment_proof_reference" TEXT,
ADD COLUMN "payment_proof_submitted_at" TIMESTAMPTZ;
