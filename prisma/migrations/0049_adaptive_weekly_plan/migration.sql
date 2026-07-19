CREATE TYPE "WeeklyPlanStatus" AS ENUM ('DRAFT', 'APPROVED', 'CHANGE_REQUESTED', 'ARCHIVED');
CREATE TYPE "WeeklyPlanTaskStatus" AS ENUM ('PLANNED', 'DONE', 'SKIPPED');
CREATE TYPE "WeeklyPlanTaskSource" AS ENUM ('ASSIGNMENT', 'REVIEW', 'WEAK_OUTCOME', 'EXAM_PREP');
CREATE TYPE "WeeklyPlanReason" AS ENUM ('DUE_SOON', 'REVIEW_DUE', 'NEEDS_REVIEW', 'EXAM_APPROACHING', 'CAPACITY_BALANCE');

CREATE TABLE "student_plan_preferences" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "available_days" JSONB NOT NULL,
  "minutes_per_day" INTEGER NOT NULL DEFAULT 45,
  "max_tasks_per_day" INTEGER NOT NULL DEFAULT 3,
  "next_exam_at" TIMESTAMP(3),
  "exam_label" TEXT,
  "planning_enabled" BOOLEAN NOT NULL DEFAULT true,
  "overwhelm_pulse" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "student_plan_preferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "weekly_plans" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "week_start" TIMESTAMP(3) NOT NULL,
  "status" "WeeklyPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "rule_version" TEXT NOT NULL DEFAULT 'adaptive-v1',
  "capacity_minutes" INTEGER NOT NULL,
  "created_by_id" TEXT NOT NULL,
  "approved_by_id" TEXT,
  "approved_at" TIMESTAMP(3),
  "change_request_category" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "weekly_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "weekly_plan_tasks" (
  "id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "scheduled_for" TIMESTAMP(3) NOT NULL,
  "position" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "duration_minutes" INTEGER NOT NULL,
  "source_type" "WeeklyPlanTaskSource" NOT NULL,
  "source_reference_id" TEXT,
  "reason_code" "WeeklyPlanReason" NOT NULL,
  "status" "WeeklyPlanTaskStatus" NOT NULL DEFAULT 'PLANNED',
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "weekly_plan_tasks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_plan_preferences_student_id_key" ON "student_plan_preferences"("student_id");
CREATE UNIQUE INDEX "weekly_plans_student_id_week_start_key" ON "weekly_plans"("student_id", "week_start");
CREATE INDEX "weekly_plans_status_week_start_idx" ON "weekly_plans"("status", "week_start");
CREATE INDEX "weekly_plan_tasks_plan_id_scheduled_for_position_idx" ON "weekly_plan_tasks"("plan_id", "scheduled_for", "position");
CREATE INDEX "weekly_plan_tasks_plan_id_status_scheduled_for_idx" ON "weekly_plan_tasks"("plan_id", "status", "scheduled_for");

ALTER TABLE "student_plan_preferences" ADD CONSTRAINT "student_plan_preferences_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "weekly_plans" ADD CONSTRAINT "weekly_plans_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "weekly_plan_tasks" ADD CONSTRAINT "weekly_plan_tasks_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "weekly_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
