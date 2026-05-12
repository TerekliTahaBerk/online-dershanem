-- ─────────────────────────────────────────────────────────────────────────────
-- Faz 5 / 0016_accounting
-- Muhasebe defteri (AccountingEntry) ve öğretmen maaş kayıtları (TeacherPayroll).
-- Tüm para alanları `INTEGER` (kuruş) — mevcut Package.price ile birim tutarlı.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "EntryType" AS ENUM ('INCOME', 'EXPENSE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "EntryCategory" AS ENUM (
    'PACKAGE_SALE', 'CAMP_SALE', 'SERVICE_FEE', 'OTHER_INCOME',
    'TEACHER_PAYROLL', 'MARKETING', 'RENT', 'TAX', 'OPERATIONAL', 'OTHER_EXPENSE'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "PayrollStatus" AS ENUM ('DUE', 'PAID', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "AccountingEntry" (
  "id"          TEXT PRIMARY KEY,
  "type"        "EntryType"     NOT NULL,
  "category"    "EntryCategory" NOT NULL DEFAULT 'OTHER_INCOME',
  "amount"      INTEGER         NOT NULL,
  "occurredAt"  TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "description" TEXT,
  "refType"     TEXT,
  "refId"       TEXT,
  "studentId"   TEXT,
  "packageId"   TEXT,
  "teacherId"   TEXT,
  "createdById" TEXT,
  "createdAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountingEntry_student_fkey"   FOREIGN KEY ("studentId")   REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AccountingEntry_package_fkey"   FOREIGN KEY ("packageId")   REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AccountingEntry_teacher_fkey"   FOREIGN KEY ("teacherId")   REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AccountingEntry_createdBy_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id")    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AccountingEntry_type_occurred_idx"     ON "AccountingEntry"("type", "occurredAt");
CREATE INDEX IF NOT EXISTS "AccountingEntry_category_occurred_idx" ON "AccountingEntry"("category", "occurredAt");
CREATE INDEX IF NOT EXISTS "AccountingEntry_student_idx"           ON "AccountingEntry"("studentId");
CREATE INDEX IF NOT EXISTS "AccountingEntry_teacher_idx"           ON "AccountingEntry"("teacherId");

CREATE TABLE IF NOT EXISTS "TeacherPayroll" (
  "id"          TEXT PRIMARY KEY,
  "teacherId"   TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd"   TIMESTAMP(3) NOT NULL,
  "amount"      INTEGER NOT NULL,
  "status"      "PayrollStatus" NOT NULL DEFAULT 'DUE',
  "paidAt"      TIMESTAMP(3),
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeacherPayroll_teacher_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherPayroll_teacher_period_key" ON "TeacherPayroll"("teacherId", "periodStart", "periodEnd");
CREATE INDEX        IF NOT EXISTS "TeacherPayroll_teacher_status_idx" ON "TeacherPayroll"("teacherId", "status");
CREATE INDEX        IF NOT EXISTS "TeacherPayroll_status_period_idx"  ON "TeacherPayroll"("status", "periodEnd");
