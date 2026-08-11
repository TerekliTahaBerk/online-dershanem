-- PayTR retries represent the same logical finance/security event. The nullable
-- key keeps existing audit semantics while making critical callback rows unique.
ALTER TABLE "AuditLog" ADD COLUMN "idempotency_key" TEXT;
CREATE UNIQUE INDEX "AuditLog_idempotency_key_key" ON "AuditLog"("idempotency_key");
