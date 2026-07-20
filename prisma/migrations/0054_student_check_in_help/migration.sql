CREATE TYPE "StudentCheckInEnergy" AS ENUM ('LOW', 'STEADY', 'GOOD');
CREATE TYPE "StudentCheckInConfidence" AS ENUM ('NEED_GUIDANCE', 'BUILDING', 'CONFIDENT');
CREATE TYPE "StudentCheckInBarrier" AS ENUM ('NONE', 'NOT_UNDERSTANDING', 'TIME_LOAD', 'ACCESS_TECH', 'NEED_EXAMPLE', 'OTHER');
CREATE TYPE "StudentHelpRequestStatus" AS ENUM ('OPEN', 'RESPONDED', 'CLOSED');
CREATE TYPE "StudentHelpResponseAction" AS ENUM ('NEXT_LESSON', 'EXTRA_EXAMPLE', 'PLAN_ADJUSTED', 'SHORT_CHECKIN', 'RESOURCE_SHARED', 'NO_ACTION_NEEDED');

CREATE TABLE "student_check_ins" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "group_id" TEXT NOT NULL,
  "energy" "StudentCheckInEnergy" NOT NULL,
  "confidence" "StudentCheckInConfidence" NOT NULL,
  "barrier" "StudentCheckInBarrier" NOT NULL,
  "share_with_teacher" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_check_ins_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_help_requests" (
  "id" TEXT NOT NULL,
  "check_in_id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "group_id" TEXT NOT NULL,
  "status" "StudentHelpRequestStatus" NOT NULL DEFAULT 'OPEN',
  "due_at" TIMESTAMP(3) NOT NULL,
  "first_response_at" TIMESTAMP(3),
  "helpful" BOOLEAN,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "student_help_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_help_responses" (
  "id" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "responded_by_id" TEXT NOT NULL,
  "action" "StudentHelpResponseAction" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_help_responses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "student_check_ins_student_id_created_at_idx" ON "student_check_ins"("student_id", "created_at");
CREATE INDEX "student_check_ins_group_id_share_with_teacher_created_at_idx" ON "student_check_ins"("group_id", "share_with_teacher", "created_at");
CREATE UNIQUE INDEX "student_help_requests_check_in_id_key" ON "student_help_requests"("check_in_id");
CREATE INDEX "student_help_requests_group_id_status_due_at_idx" ON "student_help_requests"("group_id", "status", "due_at");
CREATE INDEX "student_help_requests_student_id_status_created_at_idx" ON "student_help_requests"("student_id", "status", "created_at");
CREATE INDEX "student_help_responses_request_id_created_at_idx" ON "student_help_responses"("request_id", "created_at");
CREATE INDEX "student_help_responses_responded_by_id_created_at_idx" ON "student_help_responses"("responded_by_id", "created_at");

ALTER TABLE "student_check_ins" ADD CONSTRAINT "student_check_ins_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_check_ins" ADD CONSTRAINT "student_check_ins_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_help_requests" ADD CONSTRAINT "student_help_requests_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "student_check_ins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_help_requests" ADD CONSTRAINT "student_help_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_help_requests" ADD CONSTRAINT "student_help_requests_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_help_responses" ADD CONSTRAINT "student_help_responses_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "student_help_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_help_responses" ADD CONSTRAINT "student_help_responses_responded_by_id_fkey" FOREIGN KEY ("responded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
