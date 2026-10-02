CREATE TYPE "CoachingRescheduleReason" AS ENUM ('SCHOOL_SCHEDULE', 'FAMILY_SCHEDULE', 'TECH_ACCESS');
ALTER TABLE "coaching_sessions"
  ADD COLUMN "meeting_url" TEXT,
  ADD COLUMN "reschedule_requested_at" TIMESTAMPTZ(3),
  ADD COLUMN "reschedule_reason" "CoachingRescheduleReason",
  ADD COLUMN "proposed_at" TIMESTAMPTZ(3),
  ADD COLUMN "proposed_meeting_url" TEXT,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "student_check_ins" ALTER COLUMN "group_id" DROP NOT NULL, ADD COLUMN "coach_assignment_id" TEXT;
ALTER TABLE "student_help_requests" ALTER COLUMN "group_id" DROP NOT NULL, ADD COLUMN "coach_assignment_id" TEXT;
ALTER TABLE "student_check_ins" ADD CONSTRAINT "student_check_ins_coach_assignment_id_fkey" FOREIGN KEY ("coach_assignment_id") REFERENCES "coach_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_help_requests" ADD CONSTRAINT "student_help_requests_coach_assignment_id_fkey" FOREIGN KEY ("coach_assignment_id") REFERENCES "coach_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_check_ins" ADD CONSTRAINT "student_check_ins_one_target" CHECK (("group_id" IS NULL) <> ("coach_assignment_id" IS NULL));
ALTER TABLE "student_help_requests" ADD CONSTRAINT "student_help_requests_one_target" CHECK (("group_id" IS NULL) <> ("coach_assignment_id" IS NULL));
CREATE INDEX "student_check_ins_coach_assignment_id_idx" ON "student_check_ins"("coach_assignment_id");
CREATE INDEX "student_help_requests_coach_assignment_id_idx" ON "student_help_requests"("coach_assignment_id");
CREATE UNIQUE INDEX "student_help_requests_one_open_coach" ON "student_help_requests"("student_id", "coach_assignment_id") WHERE "coach_assignment_id" IS NOT NULL AND "status" IN ('OPEN', 'RESPONDED');
