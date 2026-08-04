-- Align historical migration output with the current Prisma datamodel.
-- All statements are additive/idempotent or metadata-only index renames.
ALTER TABLE "AuditLog" ALTER COLUMN "actorType" SET DEFAULT 'SYSTEM';

DROP INDEX IF EXISTS "AuditLog_actorUserId_createdAt_idx";
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

ALTER INDEX IF EXISTS "accessibility_preferences_academic_updated_by_id_academic_updat"
  RENAME TO "accessibility_preferences_academic_updated_by_id_academic_u_idx";

ALTER INDEX IF EXISTS "assignment_submissions_assignment_id_student_id_attempt_number_"
  RENAME TO "assignment_submissions_assignment_id_student_id_attempt_num_key";
