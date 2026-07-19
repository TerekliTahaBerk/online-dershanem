ALTER TABLE "lessons"
  ADD COLUMN "close_version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "close_idempotency_key" TEXT,
  ADD COLUMN "close_request_hash" TEXT,
  ADD COLUMN "completed_at" TIMESTAMP(3);
