-- Persistent per-case Student read state for escalation reply indicators.
-- Existing cases remain unread until the Student opens them.
ALTER TABLE "chat_sessions"
ADD COLUMN "student_last_viewed_at" TIMESTAMP(3);

ALTER TABLE "notifications"
ADD COLUMN "case_id" TEXT,
ADD COLUMN "event_key" TEXT;

CREATE UNIQUE INDEX "notifications_event_key_key" ON "notifications"("event_key");

-- Revoke only the retired support role's escalation grants. Keep the role,
-- accounts, cases, and messages for historical review.
DELETE FROM "role_permissions" rp
USING "roles" r, "permissions" p
WHERE rp."role_id" = r."id"
  AND rp."permission_id" = p."id"
  AND r."name" = 'live_agent'
  AND p."resource" = 'escalation';
