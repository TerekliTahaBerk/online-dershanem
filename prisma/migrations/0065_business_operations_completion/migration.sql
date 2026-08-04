-- Additive operational fields for retention, attribution, CRM linking and prompt tenancy.
ALTER TABLE "business_units"
  ADD COLUMN "retention_days" INTEGER NOT NULL DEFAULT 730,
  ADD COLUMN "settings" JSONB;

ALTER TABLE "business_conversations"
  ADD COLUMN "summary" TEXT,
  ADD COLUMN "source_campaign_external_id" TEXT,
  ADD COLUMN "source_ad_external_id" TEXT,
  ADD COLUMN "anonymized_at" TIMESTAMP(3);

ALTER TABLE "business_leads"
  ADD COLUMN "related_od_user_id" TEXT,
  ADD COLUMN "related_odk_user_id" TEXT,
  ADD COLUMN "related_od_order_id" TEXT,
  ADD COLUMN "related_odk_order_id" TEXT,
  ADD COLUMN "match_suggestion" JSONB,
  ADD COLUMN "anonymized_at" TIMESTAMP(3);

ALTER TABLE "ai_prompt_versions"
  ADD COLUMN "business_unit_id" TEXT;

CREATE INDEX "ai_prompt_versions_business_unit_id_is_active_idx"
  ON "ai_prompt_versions"("business_unit_id", "is_active");

ALTER TABLE "ai_prompt_versions"
  ADD CONSTRAINT "ai_prompt_versions_business_unit_id_fkey"
  FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
