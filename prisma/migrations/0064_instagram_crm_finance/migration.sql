-- CreateEnum
CREATE TYPE "BusinessRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SALES', 'SUPPORT', 'ACCOUNTING', 'VIEWER');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('INSTAGRAM', 'META_ADS', 'OPENAI', 'ACCOUNTING', 'EMAIL');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('DISCONNECTED', 'CONNECTED', 'DEGRADED', 'ERROR');

-- CreateEnum
CREATE TYPE "AiMode" AS ENUM ('OFF', 'SUGGESTION', 'AUTO_SAFE', 'AUTO');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'WAITING_HUMAN', 'CLOSED', 'SPAM');

-- CreateEnum
CREATE TYPE "LeadTemperature" AS ENUM ('COLD', 'WARM', 'HOT');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageSenderType" AS ENUM ('CUSTOMER', 'AI', 'HUMAN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('RECEIVED', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'MEETING_PLANNED', 'TRIAL_PLANNED', 'OFFER_SENT', 'PAYMENT_PENDING', 'WON', 'LOST', 'SPAM');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('INSTAGRAM_ORGANIC', 'INSTAGRAM_AD', 'OD_WEB_FORM', 'ODK_WEB_FORM', 'PURCHASE_STARTED', 'PURCHASE_COMPLETED', 'MANUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductInterest" AS ENUM ('ONLINE_DERSHANEM', 'ONLINE_DENEME_KULUBU', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FinancialSource" AS ENUM ('ONLINE_DERSHANEM', 'ONLINE_DENEME_KULUBU', 'MANUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "FinancialKind" AS ENUM ('SALE', 'RENEWAL', 'ADDITIONAL_PAYMENT', 'MANUAL_INCOME', 'ADJUSTMENT', 'REFUND_REVERSAL', 'EXPENSE', 'REVERSAL');

-- CreateEnum
CREATE TYPE "FinancialStatus" AS ENUM ('DRAFT', 'PENDING', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "AccountingPeriodStatus" AS ENUM ('OPEN', 'LOCKED');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('MATCHED', 'UNMATCHED', 'MANUALLY_MATCHED', 'REVIEW_REQUIRED', 'CORRECTED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'DEAD');

-- CreateTable
CREATE TABLE "business_units" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "product" "ProductCode" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_role_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "business_unit_id" TEXT NOT NULL,
    "role" "BusinessRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_connections" (
    "id" TEXT NOT NULL,
    "business_unit_id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "display_name" TEXT NOT NULL,
    "config" JSONB,
    "encrypted_credentials" TEXT,
    "last_health_at" TIMESTAMP(3),
    "last_error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instagram_accounts" (
    "id" TEXT NOT NULL,
    "business_unit_id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "username" TEXT,
    "ai_mode" "AiMode" NOT NULL DEFAULT 'SUGGESTION',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "token_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instagram_webhook_events" (
    "id" TEXT NOT NULL,
    "instagram_account_id" TEXT,
    "provider_event_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3),
    "error_code" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instagram_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_conversations" (
    "id" TEXT NOT NULL,
    "business_unit_id" TEXT NOT NULL,
    "instagram_account_id" TEXT NOT NULL,
    "instagram_scoped_user_id" TEXT NOT NULL,
    "username" TEXT,
    "display_name" TEXT,
    "profile_picture_url" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "temperature" "LeadTemperature" NOT NULL DEFAULT 'COLD',
    "ai_mode" "AiMode" NOT NULL DEFAULT 'SUGGESTION',
    "assigned_user_id" TEXT,
    "tags" TEXT[],
    "product_interest" "ProductInterest" NOT NULL DEFAULT 'UNKNOWN',
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_reply_by" "MessageSenderType",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "external_id" TEXT,
    "direction" "MessageDirection" NOT NULL,
    "sender_type" "MessageSenderType" NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "body" TEXT,
    "media_metadata" JSONB,
    "provider_metadata" JSONB,
    "status" "MessageStatus" NOT NULL,
    "failure_code" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_deliveries" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL,
    "provider_response" JSONB,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_leads" (
    "id" TEXT NOT NULL,
    "business_unit_id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "instagram_scoped_id" TEXT,
    "phone" TEXT,
    "normalized_phone" TEXT,
    "email" TEXT,
    "normalized_email" TEXT,
    "student_name" TEXT,
    "parent_name" TEXT,
    "grade" TEXT,
    "exam_type" TEXT,
    "city" TEXT,
    "product_interest" "ProductInterest" NOT NULL DEFAULT 'UNKNOWN',
    "source" "LeadSource" NOT NULL,
    "stage" "LeadStage" NOT NULL DEFAULT 'NEW',
    "temperature" "LeadTemperature" NOT NULL DEFAULT 'COLD',
    "assigned_user_id" TEXT,
    "estimated_value_cents" INTEGER,
    "tags" TEXT[],
    "consent_metadata" JSONB,
    "lost_reason" TEXT,
    "first_contact_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_contact_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_activities" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "from_value" TEXT,
    "to_value" TEXT,
    "actor_user_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_tasks" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "due_at" TIMESTAMP(3),
    "assigned_user_id" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_campaigns" (
    "id" TEXT NOT NULL,
    "business_unit_id" TEXT NOT NULL,
    "external_id" TEXT,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'INSTAGRAM',
    "objective" TEXT,
    "product_interest" "ProductInterest" NOT NULL DEFAULT 'UNKNOWN',
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "budget_cents" INTEGER NOT NULL DEFAULT 0,
    "spent_cents" INTEGER NOT NULL DEFAULT 0,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "utm" JSONB,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_ad_sets" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "external_id" TEXT,
    "name" TEXT NOT NULL,
    "audience_description" TEXT,
    "budget_cents" INTEGER NOT NULL DEFAULT 0,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "business_ad_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_advertisements" (
    "id" TEXT NOT NULL,
    "ad_set_id" TEXT NOT NULL,
    "external_id" TEXT,
    "name" TEXT NOT NULL,
    "creative_name" TEXT,
    "opening_message" TEXT,
    "spent_cents" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "message_starts" INTEGER NOT NULL DEFAULT 0,
    "lead_count" INTEGER NOT NULL DEFAULT 0,
    "sale_count" INTEGER NOT NULL DEFAULT 0,
    "revenue_cents" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "business_advertisements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attributions" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "advertisement_id" TEXT,
    "model" TEXT NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "is_manual" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_base_entries" (
    "id" TEXT NOT NULL,
    "business_unit_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "product_interest" "ProductInterest" NOT NULL DEFAULT 'UNKNOWN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_base_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_prompt_versions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_prompt_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_executions" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "input_message_id" TEXT,
    "prompt_version_id" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "decision" JSONB,
    "confidence" DECIMAL(5,4),
    "status" TEXT NOT NULL,
    "latency_ms" INTEGER,
    "error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" TEXT NOT NULL,
    "business_unit_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger_type" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_executions" (
    "id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "error_code" TEXT,
    "duration_ms" INTEGER NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_transactions" (
    "id" TEXT NOT NULL,
    "business_unit_id" TEXT NOT NULL,
    "source" "FinancialSource" NOT NULL,
    "external_source_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "kind" "FinancialKind" NOT NULL,
    "status" "FinancialStatus" NOT NULL DEFAULT 'DRAFT',
    "transaction_at" TIMESTAMP(3) NOT NULL,
    "accrual_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "gross_cents" INTEGER NOT NULL,
    "discount_cents" INTEGER NOT NULL DEFAULT 0,
    "net_cents" INTEGER NOT NULL,
    "vat_rate" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "vat_cents" INTEGER NOT NULL DEFAULT 0,
    "withholding_rate" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "withholding_cents" INTEGER NOT NULL DEFAULT 0,
    "other_tax_cents" INTEGER NOT NULL DEFAULT 0,
    "commission_cents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "payment_method" TEXT,
    "document_number" TEXT,
    "invoice_number" TEXT,
    "attachment_metadata" JSONB,
    "notes" TEXT,
    "od_order_id" TEXT,
    "odk_order_id" TEXT,
    "lead_id" TEXT,
    "campaign_id" TEXT,
    "reversal_of_id" TEXT,
    "created_by_id" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_transaction_lines" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "account_code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "debit_cents" INTEGER NOT NULL DEFAULT 0,
    "credit_cents" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "financial_transaction_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "business_unit_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_profiles" (
    "id" TEXT NOT NULL,
    "business_unit_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vat_rate" DECIMAL(7,4) NOT NULL,
    "withholding_rate" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_periods" (
    "id" TEXT NOT NULL,
    "business_unit_id" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "status" "AccountingPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "locked_at" TIMESTAMP(3),
    "locked_by_id" TEXT,

    CONSTRAINT "accounting_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_records" (
    "id" TEXT NOT NULL,
    "business_unit_id" TEXT NOT NULL,
    "financial_transaction_id" TEXT,
    "provider" TEXT NOT NULL,
    "external_id" TEXT,
    "expected_cents" INTEGER,
    "actual_cents" INTEGER,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "details" JSONB,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "background_jobs" (
    "id" TEXT NOT NULL,
    "business_unit_id" TEXT,
    "type" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "run_after" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "locked_by" TEXT,
    "last_error_code" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "background_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_units_code_key" ON "business_units"("code");

-- CreateIndex
CREATE UNIQUE INDEX "business_units_product_key" ON "business_units"("product");

-- CreateIndex
CREATE INDEX "business_role_assignments_business_unit_id_role_idx" ON "business_role_assignments"("business_unit_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "business_role_assignments_user_id_business_unit_id_role_key" ON "business_role_assignments"("user_id", "business_unit_id", "role");

-- CreateIndex
CREATE INDEX "integration_connections_provider_status_idx" ON "integration_connections"("provider", "status");

-- CreateIndex
CREATE UNIQUE INDEX "integration_connections_business_unit_id_provider_display_n_key" ON "integration_connections"("business_unit_id", "provider", "display_name");

-- CreateIndex
CREATE UNIQUE INDEX "instagram_accounts_external_id_key" ON "instagram_accounts"("external_id");

-- CreateIndex
CREATE INDEX "instagram_accounts_business_unit_id_is_active_idx" ON "instagram_accounts"("business_unit_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "instagram_webhook_events_provider_event_id_key" ON "instagram_webhook_events"("provider_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "instagram_webhook_events_idempotency_key_key" ON "instagram_webhook_events"("idempotency_key");

-- CreateIndex
CREATE INDEX "instagram_webhook_events_processed_at_created_at_idx" ON "instagram_webhook_events"("processed_at", "created_at");

-- CreateIndex
CREATE INDEX "business_conversations_business_unit_id_status_last_message_idx" ON "business_conversations"("business_unit_id", "status", "last_message_at");

-- CreateIndex
CREATE INDEX "business_conversations_assigned_user_id_status_idx" ON "business_conversations"("assigned_user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "business_conversations_instagram_account_id_instagram_scope_key" ON "business_conversations"("instagram_account_id", "instagram_scoped_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_messages_external_id_key" ON "business_messages"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_messages_idempotency_key_key" ON "business_messages"("idempotency_key");

-- CreateIndex
CREATE INDEX "business_messages_conversation_id_occurred_at_idx" ON "business_messages"("conversation_id", "occurred_at");

-- CreateIndex
CREATE INDEX "business_messages_status_created_at_idx" ON "business_messages"("status", "created_at");

-- CreateIndex
CREATE INDEX "message_deliveries_message_id_attempted_at_idx" ON "message_deliveries"("message_id", "attempted_at");

-- CreateIndex
CREATE UNIQUE INDEX "business_leads_conversation_id_key" ON "business_leads"("conversation_id");

-- CreateIndex
CREATE INDEX "business_leads_business_unit_id_stage_updated_at_idx" ON "business_leads"("business_unit_id", "stage", "updated_at");

-- CreateIndex
CREATE INDEX "business_leads_normalized_phone_idx" ON "business_leads"("normalized_phone");

-- CreateIndex
CREATE INDEX "business_leads_normalized_email_idx" ON "business_leads"("normalized_email");

-- CreateIndex
CREATE INDEX "business_leads_instagram_scoped_id_idx" ON "business_leads"("instagram_scoped_id");

-- CreateIndex
CREATE INDEX "lead_activities_lead_id_created_at_idx" ON "lead_activities"("lead_id", "created_at");

-- CreateIndex
CREATE INDEX "lead_tasks_assigned_user_id_completed_at_due_at_idx" ON "lead_tasks"("assigned_user_id", "completed_at", "due_at");

-- CreateIndex
CREATE INDEX "business_campaigns_business_unit_id_status_starts_at_idx" ON "business_campaigns"("business_unit_id", "status", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "business_campaigns_business_unit_id_platform_external_id_key" ON "business_campaigns"("business_unit_id", "platform", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_ad_sets_campaign_id_external_id_key" ON "business_ad_sets"("campaign_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_advertisements_ad_set_id_external_id_key" ON "business_advertisements"("ad_set_id", "external_id");

-- CreateIndex
CREATE INDEX "attributions_lead_id_created_at_idx" ON "attributions"("lead_id", "created_at");

-- CreateIndex
CREATE INDEX "knowledge_base_entries_business_unit_id_is_active_category_idx" ON "knowledge_base_entries"("business_unit_id", "is_active", "category");

-- CreateIndex
CREATE UNIQUE INDEX "ai_prompt_versions_name_version_key" ON "ai_prompt_versions"("name", "version");

-- CreateIndex
CREATE INDEX "ai_executions_conversation_id_created_at_idx" ON "ai_executions"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "automation_rules_business_unit_id_trigger_type_is_active_idx" ON "automation_rules"("business_unit_id", "trigger_type", "is_active");

-- CreateIndex
CREATE INDEX "automation_executions_rule_id_created_at_idx" ON "automation_executions"("rule_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transactions_idempotency_key_key" ON "financial_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "financial_transactions_business_unit_id_transaction_at_stat_idx" ON "financial_transactions"("business_unit_id", "transaction_at", "status");

-- CreateIndex
CREATE INDEX "financial_transactions_od_order_id_idx" ON "financial_transactions"("od_order_id");

-- CreateIndex
CREATE INDEX "financial_transactions_odk_order_id_idx" ON "financial_transactions"("odk_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transactions_source_external_source_id_kind_key" ON "financial_transactions"("source", "external_source_id", "kind");

-- CreateIndex
CREATE INDEX "financial_transaction_lines_transaction_id_idx" ON "financial_transaction_lines"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_business_unit_id_code_key" ON "expense_categories"("business_unit_id", "code");

-- CreateIndex
CREATE INDEX "tax_profiles_business_unit_id_is_default_is_active_idx" ON "tax_profiles"("business_unit_id", "is_default", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "tax_profiles_business_unit_id_name_key" ON "tax_profiles"("business_unit_id", "name");

-- CreateIndex
CREATE INDEX "accounting_periods_business_unit_id_status_starts_at_idx" ON "accounting_periods"("business_unit_id", "status", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_periods_business_unit_id_starts_at_ends_at_key" ON "accounting_periods"("business_unit_id", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "reconciliation_records_business_unit_id_status_created_at_idx" ON "reconciliation_records"("business_unit_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "reconciliation_records_provider_external_id_key" ON "reconciliation_records"("provider", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "background_jobs_idempotency_key_key" ON "background_jobs"("idempotency_key");

-- CreateIndex
CREATE INDEX "background_jobs_status_run_after_priority_idx" ON "background_jobs"("status", "run_after", "priority");

-- AddForeignKey
ALTER TABLE "business_role_assignments" ADD CONSTRAINT "business_role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_role_assignments" ADD CONSTRAINT "business_role_assignments_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_accounts" ADD CONSTRAINT "instagram_accounts_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_accounts" ADD CONSTRAINT "instagram_accounts_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "integration_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_webhook_events" ADD CONSTRAINT "instagram_webhook_events_instagram_account_id_fkey" FOREIGN KEY ("instagram_account_id") REFERENCES "instagram_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_conversations" ADD CONSTRAINT "business_conversations_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_conversations" ADD CONSTRAINT "business_conversations_instagram_account_id_fkey" FOREIGN KEY ("instagram_account_id") REFERENCES "instagram_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_messages" ADD CONSTRAINT "business_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "business_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_deliveries" ADD CONSTRAINT "message_deliveries_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "business_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_leads" ADD CONSTRAINT "business_leads_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_leads" ADD CONSTRAINT "business_leads_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "business_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "business_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_tasks" ADD CONSTRAINT "lead_tasks_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "business_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_campaigns" ADD CONSTRAINT "business_campaigns_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_ad_sets" ADD CONSTRAINT "business_ad_sets_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "business_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_advertisements" ADD CONSTRAINT "business_advertisements_ad_set_id_fkey" FOREIGN KEY ("ad_set_id") REFERENCES "business_ad_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attributions" ADD CONSTRAINT "attributions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "business_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attributions" ADD CONSTRAINT "attributions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "business_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attributions" ADD CONSTRAINT "attributions_advertisement_id_fkey" FOREIGN KEY ("advertisement_id") REFERENCES "business_advertisements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_base_entries" ADD CONSTRAINT "knowledge_base_entries_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_executions" ADD CONSTRAINT "ai_executions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "business_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "automation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "business_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "business_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transaction_lines" ADD CONSTRAINT "financial_transaction_lines_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "financial_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_profiles" ADD CONSTRAINT "tax_profiles_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_records" ADD CONSTRAINT "reconciliation_records_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_records" ADD CONSTRAINT "reconciliation_records_financial_transaction_id_fkey" FOREIGN KEY ("financial_transaction_id") REFERENCES "financial_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
