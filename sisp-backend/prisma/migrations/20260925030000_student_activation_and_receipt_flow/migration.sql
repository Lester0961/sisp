-- Store purpose and a confirmed replacement email on one-time setup tokens.
-- Existing password-reset rows retain the password_reset purpose by default.
ALTER TABLE "password_reset_tokens"
  ADD COLUMN IF NOT EXISTS "purpose" TEXT NOT NULL DEFAULT 'password_reset';

ALTER TABLE "password_reset_tokens"
  ADD COLUMN IF NOT EXISTS "target_email" TEXT;

-- Replace the new-applicant checklist with the receipt requested by the
-- institution. Legacy definitions and submissions remain stored for history.
UPDATE "admission_requirement_definitions"
SET "is_active" = false,
    "is_required" = false,
    "updated_at" = now()
WHERE "code" IN ('FORM_137', 'GOOD_MORAL', 'PSA_BIRTH', 'ID_PHOTO', 'HONORABLE_DISMISSAL');

INSERT INTO "admission_requirement_definitions"
  ("id", "code", "title", "applicant_type", "is_required", "sort_order", "is_active", "created_at", "updated_at")
VALUES
  ('20000000-0000-4000-8000-000000000006', 'ENROLLMENT_RECEIPT', 'Enrollment or Down-payment Receipt', NULL, true, 10, true, now(), now())
ON CONFLICT ("code") DO UPDATE
SET "title" = EXCLUDED."title",
    "applicant_type" = EXCLUDED."applicant_type",
    "is_required" = EXCLUDED."is_required",
    "sort_order" = EXCLUDED."sort_order",
    "is_active" = EXCLUDED."is_active",
    "updated_at" = now();

-- Keep DeepSeek's provider-wide spend ceiling across service restarts and
-- instances. The starting counters carry forward the prior local QA ledger;
-- reserved cost is conservatively capped at the model's peak output rate.
CREATE TABLE IF NOT EXISTS "deepseek_usage_budgets" (
  "provider" TEXT PRIMARY KEY,
  "model" TEXT NOT NULL,
  "reserved_tokens" BIGINT NOT NULL DEFAULT 0,
  "actual_input_tokens" BIGINT NOT NULL DEFAULT 0,
  "actual_output_tokens" BIGINT NOT NULL DEFAULT 0,
  "actual_total_tokens" BIGINT NOT NULL DEFAULT 0,
  "estimated_cost_upper_usd" DECIMAL(12, 8) NOT NULL DEFAULT 0,
  "usage_unavailable_calls" INTEGER NOT NULL DEFAULT 0,
  "provider_attempts" INTEGER NOT NULL DEFAULT 0,
  "successful_responses" INTEGER NOT NULL DEFAULT 0,
  "unobserved_prior_requests" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE "deepseek_usage_budgets" FROM PUBLIC, anon, authenticated;

INSERT INTO "deepseek_usage_budgets" (
  "provider", "model", "reserved_tokens", "actual_input_tokens",
  "actual_output_tokens", "actual_total_tokens", "estimated_cost_upper_usd",
  "usage_unavailable_calls", "provider_attempts", "successful_responses",
  "unobserved_prior_requests"
)
VALUES ('deepseek', 'deepseek-flash', 606625, 103935, 16584, 120519, 0.05108130, 0, 302, 301, 1)
ON CONFLICT ("provider") DO NOTHING;
