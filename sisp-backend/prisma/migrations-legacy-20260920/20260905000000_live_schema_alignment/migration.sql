-- Align the hosted database with the current Prisma models without rewriting
-- existing student, grade, request, or chat records.

ALTER TABLE "enrollments"
  ADD COLUMN IF NOT EXISTS "semester" TEXT,
  ADD COLUMN IF NOT EXISTS "year" TEXT;

ALTER TABLE "grades"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS "submitted_by_id" UUID,
  ADD COLUMN IF NOT EXISTS "submitted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "posted_by_id" UUID,
  ADD COLUMN IF NOT EXISTS "posted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approved_by_id" UUID,
  ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejected_by_id" UUID,
  ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejected_remarks" TEXT;

ALTER TABLE "document_requests"
  ADD COLUMN IF NOT EXISTS "fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS "payment_reference" TEXT,
  ADD COLUMN IF NOT EXISTS "qr_code_url" TEXT,
  ADD COLUMN IF NOT EXISTS "payment_confirmed_by_id" UUID,
  ADD COLUMN IF NOT EXISTS "payment_confirmed_at" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "chat_sessions" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "student_id" UUID NOT NULL,
  "escalation_id" UUID,
  "agent_id" UUID,
  "status" TEXT NOT NULL DEFAULT 'open',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "chat_sessions_escalation_id_key"
  ON "chat_sessions"("escalation_id");

CREATE INDEX IF NOT EXISTS "chat_sessions_student_id_idx"
  ON "chat_sessions"("student_id");

CREATE INDEX IF NOT EXISTS "chat_sessions_agent_id_idx"
  ON "chat_sessions"("agent_id");

CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "session_id" UUID NOT NULL,
  "sender_id" UUID NOT NULL,
  "sender_role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "chat_messages_session_id_created_at_idx"
  ON "chat_messages"("session_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grades_submitted_by_id_fkey') THEN
    ALTER TABLE "grades" ADD CONSTRAINT "grades_submitted_by_id_fkey"
      FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grades_posted_by_id_fkey') THEN
    ALTER TABLE "grades" ADD CONSTRAINT "grades_posted_by_id_fkey"
      FOREIGN KEY ("posted_by_id") REFERENCES "users"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grades_approved_by_id_fkey') THEN
    ALTER TABLE "grades" ADD CONSTRAINT "grades_approved_by_id_fkey"
      FOREIGN KEY ("approved_by_id") REFERENCES "users"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grades_rejected_by_id_fkey') THEN
    ALTER TABLE "grades" ADD CONSTRAINT "grades_rejected_by_id_fkey"
      FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_requests_payment_confirmed_by_id_fkey') THEN
    ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_payment_confirmed_by_id_fkey"
      FOREIGN KEY ("payment_confirmed_by_id") REFERENCES "users"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'escalation_queue_chat_id_fkey') THEN
    ALTER TABLE "escalation_queue" ADD CONSTRAINT "escalation_queue_chat_id_fkey"
      FOREIGN KEY ("chat_id") REFERENCES "chat_logs"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'escalation_queue_assigned_to_fkey') THEN
    ALTER TABLE "escalation_queue" ADD CONSTRAINT "escalation_queue_assigned_to_fkey"
      FOREIGN KEY ("assigned_to") REFERENCES "users"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_sessions_student_id_fkey') THEN
    ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_student_id_fkey"
      FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_sessions_escalation_id_fkey') THEN
    ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_escalation_id_fkey"
      FOREIGN KEY ("escalation_id") REFERENCES "chat_logs"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_sessions_agent_id_fkey') THEN
    ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_agent_id_fkey"
      FOREIGN KEY ("agent_id") REFERENCES "users"("id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_session_id_fkey') THEN
    ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey"
      FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_sender_id_fkey') THEN
    ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey"
      FOREIGN KEY ("sender_id") REFERENCES "users"("id");
  END IF;
END $$;
