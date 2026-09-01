-- Additive CRM sales-ops fields for follow-up, priority, win/loss timestamps, and campaign link.
CREATE TYPE "LeadPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "LeadLostReasonCode" AS ENUM (
  'PRICE',
  'UNREACHABLE',
  'COMPETITOR',
  'DECISION_POSTPONED',
  'PRODUCT_MISMATCH',
  'WRONG_LEAD',
  'OTHER'
);

ALTER TABLE "business_leads"
  ADD COLUMN IF NOT EXISTS "campaign_id" TEXT,
  ADD COLUMN IF NOT EXISTS "priority" "LeadPriority" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS "lost_reason_code" "LeadLostReasonCode",
  ADD COLUMN IF NOT EXISTS "next_follow_up_at" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "won_at" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "lost_at" TIMESTAMPTZ(3);

ALTER TABLE "lead_tasks"
  ADD COLUMN IF NOT EXISTS "note" TEXT;

CREATE INDEX IF NOT EXISTS "business_leads_business_unit_id_next_follow_up_at_idx"
  ON "business_leads"("business_unit_id", "next_follow_up_at");

CREATE INDEX IF NOT EXISTS "business_leads_business_unit_id_assigned_user_id_stage_idx"
  ON "business_leads"("business_unit_id", "assigned_user_id", "stage");

CREATE INDEX IF NOT EXISTS "business_leads_campaign_id_idx"
  ON "business_leads"("campaign_id");

CREATE INDEX IF NOT EXISTS "lead_tasks_lead_id_due_at_idx"
  ON "lead_tasks"("lead_id", "due_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_leads_campaign_id_fkey'
  ) THEN
    ALTER TABLE "business_leads"
      ADD CONSTRAINT "business_leads_campaign_id_fkey"
      FOREIGN KEY ("campaign_id") REFERENCES "business_campaigns"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
