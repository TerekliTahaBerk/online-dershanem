-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 0003: package_system
--
-- Adds:
--   1. PackageType enum (COURSE | EXAM)
--   2. Package.type column with default COURSE
--   3. Composite index on Package(type, isActive)
--   4. StudentPackage missing columns: expiresAt, revokedAt, assignedById, notes
--   5. FK from StudentPackage.assignedById → User(id)
--   6. Composite index on StudentPackage(studentId, revokedAt, expiresAt)
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Create PackageType enum
CREATE TYPE "PackageType" AS ENUM ('COURSE', 'EXAM');

-- 2. Add Package.type column (backfill all existing rows as COURSE)
ALTER TABLE "Package" ADD COLUMN "type" "PackageType" NOT NULL DEFAULT 'COURSE';

-- 3. Composite index on Package(type, isActive)
CREATE INDEX "Package_type_isActive_idx" ON "Package"("type", "isActive");

-- 4. Add missing columns to StudentPackage
ALTER TABLE "StudentPackage"
  ADD COLUMN "expiresAt"    TIMESTAMP(3),
  ADD COLUMN "revokedAt"    TIMESTAMP(3),
  ADD COLUMN "assignedById" TEXT,
  ADD COLUMN "notes"        TEXT;

-- 5. FK: StudentPackage.assignedById → User(id)  (SET NULL on delete)
ALTER TABLE "StudentPackage"
  ADD CONSTRAINT "StudentPackage_assignedById_fkey"
  FOREIGN KEY ("assignedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Composite index on StudentPackage(studentId, revokedAt, expiresAt)
CREATE INDEX "StudentPackage_studentId_revokedAt_expiresAt_idx"
  ON "StudentPackage"("studentId", "revokedAt", "expiresAt");
