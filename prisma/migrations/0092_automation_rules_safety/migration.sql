-- Part 12: automation rule safety fields + execution visibility
ALTER TABLE "automation_rules" ADD COLUMN "created_by_user_id" TEXT;
ALTER TABLE "automation_rules" ADD COLUMN "last_run_at" TIMESTAMPTZ(3);
ALTER TABLE "automation_rules" ADD COLUMN "run_count" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "automation_executions" ADD COLUMN "event_id" TEXT;
ALTER TABLE "automation_executions" ADD COLUMN "matched" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "automation_executions" ADD COLUMN "dry_run" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "automation_executions_rule_id_event_id_key" ON "automation_executions"("rule_id", "event_id");
CREATE INDEX "automation_executions_event_id_idx" ON "automation_executions"("event_id");

ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
