CREATE TABLE "cron_heartbeats" (
  "name" TEXT NOT NULL,
  "last_run_id" TEXT,
  "last_started_at" TIMESTAMP(3),
  "last_succeeded_at" TIMESTAMP(3),
  "last_failed_at" TIMESTAMP(3),
  "last_duration_ms" INTEGER,
  "processed_count" INTEGER NOT NULL DEFAULT 0,
  "failed_count" INTEGER NOT NULL DEFAULT 0,
  "last_error_code" TEXT,
  "last_alerted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cron_heartbeats_pkey" PRIMARY KEY ("name"),
  CONSTRAINT "cron_heartbeats_duration_check" CHECK ("last_duration_ms" IS NULL OR "last_duration_ms" >= 0),
  CONSTRAINT "cron_heartbeats_counts_check" CHECK ("processed_count" >= 0 AND "failed_count" >= 0)
);

CREATE INDEX "cron_heartbeats_last_succeeded_at_idx" ON "cron_heartbeats"("last_succeeded_at");

INSERT INTO "cron_heartbeats" ("name", "updated_at") VALUES
  ('odk-exam-lifecycle', CURRENT_TIMESTAMP),
  ('business-jobs', CURRENT_TIMESTAMP),
  ('email-retry', CURRENT_TIMESTAMP),
  ('panel-reminders', CURRENT_TIMESTAMP),
  ('panel-session-retention', CURRENT_TIMESTAMP),
  ('rate-limit-prune', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
