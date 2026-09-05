CREATE TABLE IF NOT EXISTS "document_catalog_items" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "fee" DECIMAL(10,2) NOT NULL,
  "sort_order" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "document_catalog_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "document_catalog_items_code_key"
  ON "document_catalog_items"("code");

CREATE TABLE IF NOT EXISTS "document_request_items" (
  "id" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "catalog_item_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_fee" DECIMAL(10,2) NOT NULL,
  "line_total" DECIMAL(10,2) NOT NULL,
  "remarks" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_request_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "document_request_items_request_id_idx"
  ON "document_request_items"("request_id");

ALTER TABLE "document_request_items"
  ADD CONSTRAINT "document_request_items_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "document_requests"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "document_request_items"
  ADD CONSTRAINT "document_request_items_catalog_item_id_fkey"
  FOREIGN KEY ("catalog_item_id") REFERENCES "document_catalog_items"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "chat_daily_usage" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "usage_date" DATE NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "chat_daily_usage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "chat_daily_usage_user_id_usage_date_key"
  ON "chat_daily_usage"("user_id", "usage_date");

ALTER TABLE "chat_daily_usage"
  ADD CONSTRAINT "chat_daily_usage_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "document_catalog_items" ("id", "code", "label", "fee", "sort_order", "is_active", "created_at", "updated_at")
VALUES
  ('10000000-0000-4000-8000-000000000001', 'transcript_of_records', 'Transcript of Records', 200, 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000002', 'certificate_of_enrollment', 'Certificate of Enrollment', 150, 20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000003', 'certificate_of_good_moral', 'Certificate of Good Moral Character', 100, 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000004', 'diploma', 'Diploma', 500, 40, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000005', 'course_description', 'Course Description', 50, 50, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000006', 'authentication', 'Document Authentication', 300, 60, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000007', 'other', 'Other Document', 100, 70, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "label" = EXCLUDED."label",
  "fee" = EXCLUDED."fee",
  "sort_order" = EXCLUDED."sort_order",
  "is_active" = true,
  "updated_at" = CURRENT_TIMESTAMP;
