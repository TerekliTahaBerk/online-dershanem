-- Phase 2 / Session 6 — Persistent Parent Absence-Excuse Workflow
-- Additive only. Two new enums, one new table, four FKs, four indexes.
-- Idempotent on re-deploy.

-- 1) Enums ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "AbsenceExcuseReason" AS ENUM ('ILLNESS', 'FAMILY', 'TECHNICAL', 'TRAVEL', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "AbsenceExcuseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2) Table ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AbsenceExcuse" (
  "id"            TEXT NOT NULL,
  "parentId"      TEXT NOT NULL,
  "studentId"     TEXT NOT NULL,
  "lessonId"      TEXT,
  "startsAt"      TIMESTAMP(3) NOT NULL,
  "endsAt"        TIMESTAMP(3) NOT NULL,
  "reason"        "AbsenceExcuseReason" NOT NULL,
  "note"          TEXT,
  "attachmentUrl" TEXT,
  "status"        "AbsenceExcuseStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedById"  TEXT,
  "reviewedAt"    TIMESTAMP(3),
  "reviewNote"    TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AbsenceExcuse_pkey" PRIMARY KEY ("id")
);

-- 3) FKs ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "AbsenceExcuse"
    ADD CONSTRAINT "AbsenceExcuse_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "Parent"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "AbsenceExcuse"
    ADD CONSTRAINT "AbsenceExcuse_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "AbsenceExcuse"
    ADD CONSTRAINT "AbsenceExcuse_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "AbsenceExcuse"
    ADD CONSTRAINT "AbsenceExcuse_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4) Indexes ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "AbsenceExcuse_studentId_status_startsAt_idx"
  ON "AbsenceExcuse" ("studentId", "status", "startsAt");
CREATE INDEX IF NOT EXISTS "AbsenceExcuse_parentId_createdAt_idx"
  ON "AbsenceExcuse" ("parentId", "createdAt");
CREATE INDEX IF NOT EXISTS "AbsenceExcuse_lessonId_idx"
  ON "AbsenceExcuse" ("lessonId");
CREATE INDEX IF NOT EXISTS "AbsenceExcuse_status_createdAt_idx"
  ON "AbsenceExcuse" ("status", "createdAt");
