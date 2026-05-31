-- 0034_payment_schedule_item
-- Phase 2 / Session 10 — Parent Finance Due Tracking.
-- Additive only. Idempotent. Stores base statuses (PENDING/PAID/CANCELLED/
-- PARTIAL) plus paidAmount (kuruş, like AccountingEntry/TeacherPayroll).
-- OVERDUE is **derived in the helper layer** (PENDING + dueDate < today)
-- so we never depend on a cron job to keep status fresh.

DO $$ BEGIN
  CREATE TYPE "PaymentScheduleStatus" AS ENUM ('PENDING','PAID','CANCELLED','PARTIAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PaymentScheduleItem" (
  "id"                 TEXT NOT NULL,
  "studentId"          TEXT,
  "parentId"           TEXT,
  "purchaseIntentId"   TEXT,
  "packageId"          TEXT,
  "title"              TEXT NOT NULL,
  "amount"             INTEGER NOT NULL,                       -- kuruş
  "paidAmount"         INTEGER NOT NULL DEFAULT 0,             -- kuruş, for PARTIAL
  "dueDate"            TIMESTAMP(3) NOT NULL,
  "status"             "PaymentScheduleStatus" NOT NULL DEFAULT 'PENDING',
  "paidAt"             TIMESTAMP(3),
  "accountingEntryId"  TEXT,
  "paymentLink"        TEXT,
  "note"               TEXT,
  "createdById"        TEXT,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentScheduleItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PaymentScheduleItem_studentId_dueDate_idx"
  ON "PaymentScheduleItem" ("studentId", "dueDate");
CREATE INDEX IF NOT EXISTS "PaymentScheduleItem_parentId_dueDate_idx"
  ON "PaymentScheduleItem" ("parentId", "dueDate");
CREATE INDEX IF NOT EXISTS "PaymentScheduleItem_status_dueDate_idx"
  ON "PaymentScheduleItem" ("status", "dueDate");
CREATE INDEX IF NOT EXISTS "PaymentScheduleItem_purchaseIntentId_idx"
  ON "PaymentScheduleItem" ("purchaseIntentId");
CREATE INDEX IF NOT EXISTS "PaymentScheduleItem_packageId_idx"
  ON "PaymentScheduleItem" ("packageId");
CREATE INDEX IF NOT EXISTS "PaymentScheduleItem_accountingEntryId_idx"
  ON "PaymentScheduleItem" ("accountingEntryId");

DO $$ BEGIN
  ALTER TABLE "PaymentScheduleItem"
    ADD CONSTRAINT "PaymentScheduleItem_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PaymentScheduleItem"
    ADD CONSTRAINT "PaymentScheduleItem_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PaymentScheduleItem"
    ADD CONSTRAINT "PaymentScheduleItem_purchaseIntentId_fkey"
    FOREIGN KEY ("purchaseIntentId") REFERENCES "PurchaseIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PaymentScheduleItem"
    ADD CONSTRAINT "PaymentScheduleItem_packageId_fkey"
    FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PaymentScheduleItem"
    ADD CONSTRAINT "PaymentScheduleItem_accountingEntryId_fkey"
    FOREIGN KEY ("accountingEntryId") REFERENCES "AccountingEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PaymentScheduleItem"
    ADD CONSTRAINT "PaymentScheduleItem_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
