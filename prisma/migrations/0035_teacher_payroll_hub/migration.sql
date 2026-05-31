-- Phase 2 / Session 11 — Teacher Payroll / Finance Hub
-- Lesson-level payroll layer. Lives alongside the existing flat-period
-- `TeacherPayroll` model (which remains the manual-entry surface at
-- `/panel/admin/maaslar`) and never touches it.
--
-- Three additive models:
--   TeacherCompensationRule  — per-teacher (× course × classroom) hourly rate
--   TeacherPayrollPeriod     — date-range payroll cycle with status lifecycle
--   TeacherPayrollItem       — per-lesson payroll line, idempotent on
--                              (periodId, lessonId, teacherId)
--
-- All amounts are kuruş (Int) matching `AccountingEntry.amount` and
-- `TeacherPayroll.amount`. Idempotent: `CREATE … IF NOT EXISTS`,
-- `DO $$ … EXCEPTION WHEN duplicate_object`.

DO $$ BEGIN
  CREATE TYPE "TeacherPayrollPeriodStatus" AS ENUM (
    'DRAFT', 'REVIEWED', 'LOCKED', 'PAID', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TeacherPayrollItemStatus" AS ENUM (
    'DRAFT', 'REVIEWED', 'APPROVED', 'PAID', 'EXCLUDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── TeacherCompensationRule ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "TeacherCompensationRule" (
  "id"          TEXT PRIMARY KEY,
  "teacherId"   TEXT NOT NULL,
  "courseId"    TEXT,
  "classroomId" TEXT,
  "hourlyRate"  INTEGER NOT NULL,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "startsAt"    TIMESTAMP(3),
  "endsAt"      TIMESTAMP(3),
  "note"        TEXT,
  "createdById" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "TeacherCompensationRule_teacherId_isActive_idx"
  ON "TeacherCompensationRule"("teacherId", "isActive");
CREATE INDEX IF NOT EXISTS "TeacherCompensationRule_courseId_idx"
  ON "TeacherCompensationRule"("courseId");
CREATE INDEX IF NOT EXISTS "TeacherCompensationRule_classroomId_idx"
  ON "TeacherCompensationRule"("classroomId");

DO $$ BEGIN
  ALTER TABLE "TeacherCompensationRule"
    ADD CONSTRAINT "TeacherCompensationRule_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TeacherCompensationRule"
    ADD CONSTRAINT "TeacherCompensationRule_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "Course"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TeacherCompensationRule"
    ADD CONSTRAINT "TeacherCompensationRule_classroomId_fkey"
    FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TeacherCompensationRule"
    ADD CONSTRAINT "TeacherCompensationRule_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── TeacherPayrollPeriod ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "TeacherPayrollPeriod" (
  "id"          TEXT PRIMARY KEY,
  "title"       TEXT NOT NULL,
  "startsAt"    TIMESTAMP(3) NOT NULL,
  "endsAt"      TIMESTAMP(3) NOT NULL,
  "status"      "TeacherPayrollPeriodStatus" NOT NULL DEFAULT 'DRAFT',
  "lockedAt"    TIMESTAMP(3),
  "paidAt"      TIMESTAMP(3),
  "note"        TEXT,
  "createdById" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "TeacherPayrollPeriod_status_startsAt_idx"
  ON "TeacherPayrollPeriod"("status", "startsAt");
CREATE INDEX IF NOT EXISTS "TeacherPayrollPeriod_startsAt_endsAt_idx"
  ON "TeacherPayrollPeriod"("startsAt", "endsAt");

DO $$ BEGIN
  ALTER TABLE "TeacherPayrollPeriod"
    ADD CONSTRAINT "TeacherPayrollPeriod_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── TeacherPayrollItem ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "TeacherPayrollItem" (
  "id"                  TEXT PRIMARY KEY,
  "periodId"            TEXT NOT NULL,
  "teacherId"           TEXT NOT NULL,
  "lessonId"            TEXT,
  "compensationRuleId"  TEXT,
  "minutes"             INTEGER NOT NULL DEFAULT 0,
  "hourlyRate"          INTEGER NOT NULL DEFAULT 0,
  "grossAmount"         INTEGER NOT NULL DEFAULT 0,
  "adjustmentAmount"    INTEGER NOT NULL DEFAULT 0,
  "finalAmount"         INTEGER NOT NULL DEFAULT 0,
  "status"              "TeacherPayrollItemStatus" NOT NULL DEFAULT 'DRAFT',
  "rateMissing"         BOOLEAN NOT NULL DEFAULT false,
  "attendanceMissing"   BOOLEAN NOT NULL DEFAULT false,
  "note"                TEXT,
  "accountingEntryId"   TEXT,
  "createdById"         TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Idempotency: at most one row per (period, teacher, lesson). Lessons may
-- be NULL for manual adjustment lines, so we use a partial unique index.
CREATE UNIQUE INDEX IF NOT EXISTS
  "TeacherPayrollItem_periodId_teacherId_lessonId_uniq"
  ON "TeacherPayrollItem"("periodId", "teacherId", "lessonId")
  WHERE "lessonId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "TeacherPayrollItem_teacherId_status_idx"
  ON "TeacherPayrollItem"("teacherId", "status");
CREATE INDEX IF NOT EXISTS "TeacherPayrollItem_periodId_teacherId_idx"
  ON "TeacherPayrollItem"("periodId", "teacherId");
CREATE INDEX IF NOT EXISTS "TeacherPayrollItem_lessonId_idx"
  ON "TeacherPayrollItem"("lessonId");
CREATE INDEX IF NOT EXISTS "TeacherPayrollItem_status_idx"
  ON "TeacherPayrollItem"("status");

DO $$ BEGIN
  ALTER TABLE "TeacherPayrollItem"
    ADD CONSTRAINT "TeacherPayrollItem_periodId_fkey"
    FOREIGN KEY ("periodId") REFERENCES "TeacherPayrollPeriod"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TeacherPayrollItem"
    ADD CONSTRAINT "TeacherPayrollItem_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TeacherPayrollItem"
    ADD CONSTRAINT "TeacherPayrollItem_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TeacherPayrollItem"
    ADD CONSTRAINT "TeacherPayrollItem_compensationRuleId_fkey"
    FOREIGN KEY ("compensationRuleId") REFERENCES "TeacherCompensationRule"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TeacherPayrollItem"
    ADD CONSTRAINT "TeacherPayrollItem_accountingEntryId_fkey"
    FOREIGN KEY ("accountingEntryId") REFERENCES "AccountingEntry"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TeacherPayrollItem"
    ADD CONSTRAINT "TeacherPayrollItem_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
