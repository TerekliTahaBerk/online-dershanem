-- CreateEnum
CREATE TYPE "EmailOutboxStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'ABANDONED');

-- CreateTable
CREATE TABLE "email_outbox" (
    "id"           TEXT NOT NULL,
    "recipients"   TEXT NOT NULL,
    "subject"      TEXT NOT NULL,
    "html"         TEXT NOT NULL,
    "status"       "EmailOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts"     INTEGER NOT NULL DEFAULT 0,
    "last_error"   TEXT,
    "sent_at"      TIMESTAMP(3),
    "next_retry_at" TIMESTAMP(3),
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_outbox_status_next_retry_at_idx" ON "email_outbox"("status", "next_retry_at");
