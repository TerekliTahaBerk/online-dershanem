-- Part 1: student↔teacher subject links, parent flags, student exam type, lesson series recurrence, teacher capacity

ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "exam_type" TEXT;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "birth_date" DATE;

ALTER TABLE "teacher_profiles" ADD COLUMN IF NOT EXISTS "internal_notes" TEXT;
ALTER TABLE "teacher_profiles" ADD COLUMN IF NOT EXISTS "max_student_capacity" INTEGER;

ALTER TABLE "parent_students" ADD COLUMN IF NOT EXISTS "primary_contact" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "parent_students" ADD COLUMN IF NOT EXISTS "can_view_academic" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "parent_students" ADD COLUMN IF NOT EXISTS "can_view_payments" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "parent_students" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "parent_students" ADD COLUMN IF NOT EXISTS "ended_at" TIMESTAMPTZ(3);

CREATE INDEX IF NOT EXISTS "parent_students_student_id_active_idx" ON "parent_students"("student_id", "active");
CREATE INDEX IF NOT EXISTS "parent_students_parent_id_active_idx" ON "parent_students"("parent_id", "active");

CREATE TABLE IF NOT EXISTS "student_teacher_assignments" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "student_teacher_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "student_teacher_assignments_student_id_teacher_id_subject_key"
  ON "student_teacher_assignments"("student_id", "teacher_id", "subject");
CREATE INDEX IF NOT EXISTS "student_teacher_assignments_teacher_id_active_idx"
  ON "student_teacher_assignments"("teacher_id", "active");
CREATE INDEX IF NOT EXISTS "student_teacher_assignments_student_id_active_idx"
  ON "student_teacher_assignments"("student_id", "active");
CREATE INDEX IF NOT EXISTS "student_teacher_assignments_assigned_by_id_idx"
  ON "student_teacher_assignments"("assigned_by_id");

DO $$ BEGIN
  ALTER TABLE "student_teacher_assignments"
    ADD CONSTRAINT "student_teacher_assignments_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "student_teacher_assignments"
    ADD CONSTRAINT "student_teacher_assignments_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "student_teacher_assignments"
    ADD CONSTRAINT "student_teacher_assignments_assigned_by_id_fkey"
    FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "lesson_series" ADD COLUMN IF NOT EXISTS "weekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "lesson_series" ADD COLUMN IF NOT EXISTS "starts_at_time" TEXT;
ALTER TABLE "lesson_series" ADD COLUMN IF NOT EXISTS "duration_minutes" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "lesson_series" ADD COLUMN IF NOT EXISTS "series_starts_on" TIMESTAMPTZ(3);
ALTER TABLE "lesson_series" ADD COLUMN IF NOT EXISTS "series_ends_on" TIMESTAMPTZ(3);
ALTER TABLE "lesson_series" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Europe/Istanbul';
ALTER TABLE "lesson_series" ADD COLUMN IF NOT EXISTS "total_occurrences" INTEGER;
