-- ─────────────────────────────────────────────────────────────────────────────
-- Faz 1 / 0012_inbox_message
-- Birleşik Inbox/Bildirim modeli. Mevcut `Notification` tablosu read-only kalır;
-- yeni event'ler bu tabloya yazılır.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "InboxCategory" AS ENUM ('SYSTEM', 'FINANCE', 'EDUCATION', 'ANNOUNCEMENT', 'TEACHER_MESSAGE', 'ATTENDANCE', 'ASSIGNMENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "InboxPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "InboxMessage" (
  "id"                TEXT PRIMARY KEY,
  "recipientUserId"   TEXT NOT NULL,
  "category"          "InboxCategory" NOT NULL DEFAULT 'SYSTEM',
  "priority"          "InboxPriority" NOT NULL DEFAULT 'NORMAL',
  "title"             TEXT NOT NULL,
  "body"              TEXT NOT NULL,
  "href"              TEXT,
  "relatedEntityType" TEXT,
  "relatedEntityId"   TEXT,
  "createdById"       TEXT,
  "readAt"            TIMESTAMP(3),
  "archivedAt"        TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InboxMessage_recipient_fkey"  FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT "InboxMessage_createdBy_fkey"  FOREIGN KEY ("createdById")     REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "InboxMessage_recipient_unread_idx"   ON "InboxMessage"("recipientUserId", "readAt", "createdAt");
CREATE INDEX IF NOT EXISTS "InboxMessage_recipient_archived_idx" ON "InboxMessage"("recipientUserId", "archivedAt");
CREATE INDEX IF NOT EXISTS "InboxMessage_category_priority_idx"  ON "InboxMessage"("category", "priority");
