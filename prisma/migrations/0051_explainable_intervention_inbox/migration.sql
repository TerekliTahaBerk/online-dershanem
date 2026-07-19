CREATE TYPE "InterventionCaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'SNOOZED', 'RESOLVED', 'FALSE_POSITIVE');
CREATE TYPE "InterventionReason" AS ENUM ('ATTENDANCE_PATTERN', 'OVERDUE_WORK', 'REPEATED_REVIEW_DIFFICULTY', 'PLAN_STALLED');
CREATE TYPE "InterventionActivityType" AS ENUM ('GENERATED', 'ASSIGNED', 'STARTED', 'ACTION_LOGGED', 'SNOOZED', 'RESOLVED', 'FALSE_POSITIVE', 'REOPENED');
CREATE TYPE "InterventionOutcome" AS ENUM ('CHECK_IN_COMPLETED', 'SUPPORT_PLANNED', 'PRACTICE_ADJUSTED', 'FAMILY_CONTACTED', 'NO_ACTION_NEEDED', 'OTHER');
CREATE TYPE "InterventionFalsePositiveReason" AS ENUM ('CONTEXT_MISSING', 'DATA_OUTDATED', 'THRESHOLD_TOO_SENSITIVE', 'DUPLICATE', 'OTHER');

CREATE TABLE "intervention_cases" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "rule_version" TEXT NOT NULL DEFAULT 'intervention-v1',
  "reason_code" "InterventionReason" NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "explanation" TEXT NOT NULL,
  "suggested_action" TEXT NOT NULL,
  "evidence_count" INTEGER NOT NULL,
  "window_start" TIMESTAMP(3) NOT NULL,
  "window_end" TIMESTAMP(3) NOT NULL,
  "due_at" TIMESTAMP(3) NOT NULL,
  "status" "InterventionCaseStatus" NOT NULL DEFAULT 'OPEN',
  "owner_id" TEXT,
  "first_action_at" TIMESTAMP(3),
  "snoozed_until" TIMESTAMP(3),
  "resolved_at" TIMESTAMP(3),
  "outcome_code" "InterventionOutcome",
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "intervention_cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "intervention_case_activities" (
  "id" TEXT NOT NULL,
  "case_id" TEXT NOT NULL,
  "actor_id" TEXT,
  "type" "InterventionActivityType" NOT NULL,
  "outcome_code" "InterventionOutcome",
  "false_positive_reason" "InterventionFalsePositiveReason",
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "intervention_case_activities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "intervention_cases_fingerprint_key" ON "intervention_cases"("fingerprint");
CREATE INDEX "intervention_cases_status_due_at_idx" ON "intervention_cases"("status", "due_at");
CREATE INDEX "intervention_cases_student_id_status_created_at_idx" ON "intervention_cases"("student_id", "status", "created_at");
CREATE INDEX "intervention_cases_owner_id_status_due_at_idx" ON "intervention_cases"("owner_id", "status", "due_at");
CREATE INDEX "intervention_case_activities_case_id_created_at_idx" ON "intervention_case_activities"("case_id", "created_at");
CREATE INDEX "intervention_case_activities_actor_id_created_at_idx" ON "intervention_case_activities"("actor_id", "created_at");

ALTER TABLE "intervention_cases" ADD CONSTRAINT "intervention_cases_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "intervention_cases" ADD CONSTRAINT "intervention_cases_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "intervention_case_activities" ADD CONSTRAINT "intervention_case_activities_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "intervention_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "intervention_case_activities" ADD CONSTRAINT "intervention_case_activities_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
