CREATE TYPE "PilotCohortStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ROLLED_BACK');
CREATE TYPE "PilotStopReason" AS ENUM ('GUARDRAIL_BREACH', 'SECURITY_INCIDENT', 'DATA_QUALITY', 'OPERATIONAL', 'MANUAL_COMPLETION');

CREATE TABLE "pilot_cohorts" (
  "id" TEXT NOT NULL,
  "group_id" TEXT,
  "group_name_snapshot" TEXT NOT NULL,
  "status" "PilotCohortStatus" NOT NULL DEFAULT 'DRAFT',
  "created_by_id" TEXT NOT NULL,
  "request_key" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "started_at" TIMESTAMP(3),
  "stopped_at" TIMESTAMP(3),
  "stop_reason" "PilotStopReason",
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pilot_cohorts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pilot_cohort_members" (
  "cohort_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pilot_cohort_members_pkey" PRIMARY KEY ("cohort_id", "user_id")
);

CREATE UNIQUE INDEX "pilot_cohorts_request_key_key" ON "pilot_cohorts"("request_key");
CREATE INDEX "pilot_cohorts_status_created_at_idx" ON "pilot_cohorts"("status", "created_at");
CREATE INDEX "pilot_cohorts_group_id_status_idx" ON "pilot_cohorts"("group_id", "status");
CREATE INDEX "pilot_cohort_members_user_id_role_idx" ON "pilot_cohort_members"("user_id", "role");
ALTER TABLE "pilot_cohorts" ADD CONSTRAINT "pilot_cohorts_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pilot_cohorts" ADD CONSTRAINT "pilot_cohorts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pilot_cohort_members" ADD CONSTRAINT "pilot_cohort_members_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "pilot_cohorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pilot_cohort_members" ADD CONSTRAINT "pilot_cohort_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
