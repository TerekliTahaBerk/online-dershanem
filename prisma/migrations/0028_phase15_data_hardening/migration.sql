-- Phase 1.5 — data model hardening
-- 1) Attendance: add LEFT_EARLY soft-warning status (additive, safe).
-- 2) Parent: add invite token / expiry / sent-at columns (all nullable).
-- 3) ParentStudent: add structured relationshipType enum (legacy
--    `relationship` free text column is preserved for backward compatibility).
--
-- All changes are additive; no data migration is required.

-- 1) AttendanceStatus.LEFT_EARLY
ALTER TYPE "AttendanceStatus" ADD VALUE IF NOT EXISTS 'LEFT_EARLY';

-- 2) ParentRelationship enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ParentRelationship') THEN
    CREATE TYPE "ParentRelationship" AS ENUM ('MOTHER', 'FATHER', 'GUARDIAN', 'SIBLING', 'OTHER');
  END IF;
END
$$;

-- 3) Parent invite columns
ALTER TABLE "Parent"
  ADD COLUMN IF NOT EXISTS "parentInviteToken" TEXT,
  ADD COLUMN IF NOT EXISTS "parentInviteTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "parentInviteSentAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Parent_parentInviteToken_key" ON "Parent"("parentInviteToken");

-- 4) ParentStudent.relationshipType
ALTER TABLE "ParentStudent"
  ADD COLUMN IF NOT EXISTS "relationshipType" "ParentRelationship";
