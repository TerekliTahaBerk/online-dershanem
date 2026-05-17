-- 0020_accounting_service
-- Non-destructive: AccountingEntry'ye service kolonu ekler.
-- Mevcut kayıtların hepsi OD olarak kabul edilir.

ALTER TABLE "AccountingEntry"
  ADD COLUMN IF NOT EXISTS "service" "AccessService" NOT NULL DEFAULT 'OD';

CREATE INDEX IF NOT EXISTS "AccountingEntry_service_occurredAt_idx"
  ON "AccountingEntry" ("service", "occurredAt");

CREATE INDEX IF NOT EXISTS "AccountingEntry_service_type_idx"
  ON "AccountingEntry" ("service", "type");
