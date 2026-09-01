-- Online Koçum lifecycle — hedefler, zengin plan görevleri, şablonlar,
-- revizyon, koç notları, haftalık özet, öneriler ve zaman çizelgesi.

-- ─── Enum genişletmeleri ───────────────────────────────────────────────────

ALTER TYPE "WeeklyPlanTaskStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE "WeeklyPlanTaskStatus" ADD VALUE IF NOT EXISTS 'PARTIAL';
ALTER TYPE "WeeklyPlanTaskStatus" ADD VALUE IF NOT EXISTS 'COULD_NOT';

ALTER TYPE "WeeklyPlanTaskSource" ADD VALUE IF NOT EXISTS 'MANUAL_COACH';
ALTER TYPE "WeeklyPlanTaskSource" ADD VALUE IF NOT EXISTS 'MOCK_EXAM';
ALTER TYPE "WeeklyPlanTaskSource" ADD VALUE IF NOT EXISTS 'SYSTEM_SUGGESTED';
ALTER TYPE "WeeklyPlanTaskSource" ADD VALUE IF NOT EXISTS 'TEMPLATE';
ALTER TYPE "WeeklyPlanTaskSource" ADD VALUE IF NOT EXISTS 'PERSONAL_GOAL';

ALTER TYPE "StudentGoalKind" ADD VALUE IF NOT EXISTS 'EXAM_TARGET';
ALTER TYPE "StudentGoalKind" ADD VALUE IF NOT EXISTS 'SCORE_TARGET';
ALTER TYPE "StudentGoalKind" ADD VALUE IF NOT EXISTS 'SUBJECT_FOCUS';
ALTER TYPE "StudentGoalKind" ADD VALUE IF NOT EXISTS 'WEEKLY_STUDY_MINUTES';
ALTER TYPE "StudentGoalKind" ADD VALUE IF NOT EXISTS 'WEEKLY_QUESTION_COUNT';

CREATE TYPE "PlanTaskKind" AS ENUM (
  'TOPIC_STUDY',
  'QUESTION_PRACTICE',
  'REVIEW',
  'VIDEO',
  'MATERIAL_READ',
  'CLASSIC_ASSIGNMENT',
  'MOCK_EXAM',
  'ERROR_ANALYSIS',
  'PERSONAL_GOAL',
  'CUSTOM'
);

CREATE TYPE "PlanTaskScheduleMode" AS ENUM ('SCHEDULED', 'FLEXIBLE');

CREATE TYPE "PlanTaskTargetType" AS ENUM (
  'QUESTIONS',
  'MINUTES',
  'PAGES',
  'VIDEOS',
  'NONE'
);

CREATE TYPE "PlanTaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

CREATE TYPE "StudentGoalStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'PAUSED', 'ARCHIVED');

CREATE TYPE "CoachNoteVisibility" AS ENUM ('INTERNAL', 'STUDENT_VISIBLE', 'PARENT_VISIBLE');

CREATE TYPE "WeeklyCoachSummaryStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TYPE "WeeklyPlanSuggestionKind" AS ENUM (
  'ADAPTIVE_NEXT_WEEK',
  'REVIEW_QUEUE',
  'MOCK_EXAM_FOLLOWUP',
  'CARRY_OVER',
  'TEMPLATE'
);

CREATE TYPE "WeeklyPlanSuggestionStatus" AS ENUM (
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED'
);

CREATE TYPE "StudentTimelineVisibility" AS ENUM (
  'INTERNAL',
  'STAFF',
  'STUDENT',
  'PARENT'
);

CREATE TYPE "StudentTimelineKind" AS ENUM (
  'PLAN_PUBLISHED',
  'PLAN_REVISED',
  'PLAN_COMPLETION',
  'TASK_OVERDUE',
  'MOCK_EXAM_RESULT',
  'GOAL_UPDATED',
  'COACH_SUMMARY',
  'CHECK_IN',
  'OTHER'
);

CREATE TYPE "StudentCheckInPlanLoad" AS ENUM ('EASY', 'FIT', 'HARD');

-- ─── StudentGoal genişletmesi ──────────────────────────────────────────────

ALTER TABLE "student_goals"
  ADD COLUMN IF NOT EXISTS "title" TEXT,
  ADD COLUMN IF NOT EXISTS "baseline_value" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "starts_at" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "target_at" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "status" "StudentGoalStatus" NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "student_goals" DROP CONSTRAINT IF EXISTS "student_goals_subject_matches_kind";
ALTER TABLE "student_goals" ADD CONSTRAINT "student_goals_subject_matches_kind"
  CHECK (
    ("kind" = 'SUBJECT_NET' AND "subject_name" IS NOT NULL)
    OR ("kind" = 'SUBJECT_FOCUS' AND "subject_name" IS NOT NULL)
    OR ("kind" IN ('PLAN_COMPLETION', 'EXAM_TARGET', 'SCORE_TARGET', 'WEEKLY_STUDY_MINUTES', 'WEEKLY_QUESTION_COUNT'))
  );

-- ─── WeeklyPlanTask genişletmesi ───────────────────────────────────────────

ALTER TABLE "weekly_plan_tasks"
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "subject" TEXT,
  ADD COLUMN IF NOT EXISTS "topic" TEXT,
  ADD COLUMN IF NOT EXISTS "task_kind" "PlanTaskKind" NOT NULL DEFAULT 'CUSTOM',
  ADD COLUMN IF NOT EXISTS "schedule_mode" "PlanTaskScheduleMode" NOT NULL DEFAULT 'FLEXIBLE',
  ADD COLUMN IF NOT EXISTS "target_type" "PlanTaskTargetType" NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "target_value" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "due_at" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "priority" "PlanTaskPriority" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "actual_questions" INTEGER,
  ADD COLUMN IF NOT EXISTS "actual_correct" INTEGER,
  ADD COLUMN IF NOT EXISTS "actual_incorrect" INTEGER,
  ADD COLUMN IF NOT EXISTS "actual_blank" INTEGER,
  ADD COLUMN IF NOT EXISTS "actual_minutes" INTEGER,
  ADD COLUMN IF NOT EXISTS "student_note" TEXT,
  ADD COLUMN IF NOT EXISTS "difficulty_felt" INTEGER,
  ADD COLUMN IF NOT EXISTS "energy_felt" INTEGER;

ALTER TABLE "weekly_plan_tasks" DROP CONSTRAINT IF EXISTS "weekly_plan_tasks_felt_range";
ALTER TABLE "weekly_plan_tasks" ADD CONSTRAINT "weekly_plan_tasks_felt_range"
  CHECK (
    ("difficulty_felt" IS NULL OR ("difficulty_felt" BETWEEN 1 AND 5))
    AND ("energy_felt" IS NULL OR ("energy_felt" BETWEEN 1 AND 5))
  );

ALTER TABLE "weekly_plan_tasks" DROP CONSTRAINT IF EXISTS "weekly_plan_tasks_actual_non_negative";
ALTER TABLE "weekly_plan_tasks" ADD CONSTRAINT "weekly_plan_tasks_actual_non_negative"
  CHECK (
    ("actual_questions" IS NULL OR "actual_questions" >= 0)
    AND ("actual_correct" IS NULL OR "actual_correct" >= 0)
    AND ("actual_incorrect" IS NULL OR "actual_incorrect" >= 0)
    AND ("actual_blank" IS NULL OR "actual_blank" >= 0)
    AND ("actual_minutes" IS NULL OR "actual_minutes" >= 0)
  );

CREATE INDEX IF NOT EXISTS "weekly_plan_tasks_source_type_source_reference_id_idx"
  ON "weekly_plan_tasks"("source_type", "source_reference_id");

-- ─── Check-in plan yükü ────────────────────────────────────────────────────

ALTER TABLE "student_check_ins"
  ADD COLUMN IF NOT EXISTS "plan_load" "StudentCheckInPlanLoad";

-- ─── Yeni tablolar ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "weekly_plan_templates" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "exam_track" TEXT,
  "task_defs" JSONB NOT NULL,
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "created_by_id" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "weekly_plan_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "weekly_plan_templates_code_key" ON "weekly_plan_templates"("code");
CREATE INDEX IF NOT EXISTS "weekly_plan_templates_exam_track_idx" ON "weekly_plan_templates"("exam_track");

CREATE TABLE IF NOT EXISTS "weekly_plan_revisions" (
  "id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "changed_by_id" TEXT,
  "change_summary" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "weekly_plan_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "weekly_plan_revisions_plan_id_version_key"
  ON "weekly_plan_revisions"("plan_id", "version");
CREATE INDEX IF NOT EXISTS "weekly_plan_revisions_plan_id_created_at_idx"
  ON "weekly_plan_revisions"("plan_id", "created_at");

CREATE TABLE IF NOT EXISTS "coach_notes" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "visibility" "CoachNoteVisibility" NOT NULL DEFAULT 'INTERNAL',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "coach_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "coach_notes_student_id_visibility_created_at_idx"
  ON "coach_notes"("student_id", "visibility", "created_at");
CREATE INDEX IF NOT EXISTS "coach_notes_author_id_created_at_idx"
  ON "coach_notes"("author_id", "created_at");

CREATE TABLE IF NOT EXISTS "weekly_coach_summaries" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "week_start" TIMESTAMPTZ(3) NOT NULL,
  "status" "WeeklyCoachSummaryStatus" NOT NULL DEFAULT 'DRAFT',
  "plan_completion_pct" INTEGER,
  "strengths" TEXT,
  "focus_areas" TEXT,
  "next_week_focus" TEXT,
  "student_visible_text" TEXT,
  "parent_visible_text" TEXT,
  "published_at" TIMESTAMPTZ(3),
  "published_by_id" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "weekly_coach_summaries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "weekly_coach_summaries_student_id_week_start_key"
  ON "weekly_coach_summaries"("student_id", "week_start");
CREATE INDEX IF NOT EXISTS "weekly_coach_summaries_status_week_start_idx"
  ON "weekly_coach_summaries"("status", "week_start");

CREATE TABLE IF NOT EXISTS "weekly_plan_suggestions" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "week_start" TIMESTAMPTZ(3) NOT NULL,
  "kind" "WeeklyPlanSuggestionKind" NOT NULL,
  "status" "WeeklyPlanSuggestionStatus" NOT NULL DEFAULT 'PENDING',
  "title" TEXT NOT NULL,
  "rationale" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "created_by_system" BOOLEAN NOT NULL DEFAULT true,
  "reviewed_by_id" TEXT,
  "reviewed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "weekly_plan_suggestions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "weekly_plan_suggestions_student_id_status_week_start_idx"
  ON "weekly_plan_suggestions"("student_id", "status", "week_start");
CREATE INDEX IF NOT EXISTS "weekly_plan_suggestions_kind_status_idx"
  ON "weekly_plan_suggestions"("kind", "status");

CREATE TABLE IF NOT EXISTS "student_timeline_events" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "occurred_at" TIMESTAMPTZ(3) NOT NULL,
  "kind" "StudentTimelineKind" NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "visibility" "StudentTimelineVisibility" NOT NULL DEFAULT 'STAFF',
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_timeline_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "student_timeline_events_student_id_occurred_at_idx"
  ON "student_timeline_events"("student_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "student_timeline_events_student_id_visibility_occurred_at_idx"
  ON "student_timeline_events"("student_id", "visibility", "occurred_at");

-- Foreign keys

ALTER TABLE "weekly_plan_templates"
  DROP CONSTRAINT IF EXISTS "weekly_plan_templates_created_by_id_fkey";
ALTER TABLE "weekly_plan_templates"
  ADD CONSTRAINT "weekly_plan_templates_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "weekly_plan_revisions"
  DROP CONSTRAINT IF EXISTS "weekly_plan_revisions_plan_id_fkey";
ALTER TABLE "weekly_plan_revisions"
  ADD CONSTRAINT "weekly_plan_revisions_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "weekly_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "weekly_plan_revisions"
  DROP CONSTRAINT IF EXISTS "weekly_plan_revisions_changed_by_id_fkey";
ALTER TABLE "weekly_plan_revisions"
  ADD CONSTRAINT "weekly_plan_revisions_changed_by_id_fkey"
  FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "coach_notes"
  DROP CONSTRAINT IF EXISTS "coach_notes_student_id_fkey";
ALTER TABLE "coach_notes"
  ADD CONSTRAINT "coach_notes_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "coach_notes"
  DROP CONSTRAINT IF EXISTS "coach_notes_author_id_fkey";
ALTER TABLE "coach_notes"
  ADD CONSTRAINT "coach_notes_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "weekly_coach_summaries"
  DROP CONSTRAINT IF EXISTS "weekly_coach_summaries_student_id_fkey";
ALTER TABLE "weekly_coach_summaries"
  ADD CONSTRAINT "weekly_coach_summaries_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "weekly_coach_summaries"
  DROP CONSTRAINT IF EXISTS "weekly_coach_summaries_published_by_id_fkey";
ALTER TABLE "weekly_coach_summaries"
  ADD CONSTRAINT "weekly_coach_summaries_published_by_id_fkey"
  FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "weekly_plan_suggestions"
  DROP CONSTRAINT IF EXISTS "weekly_plan_suggestions_student_id_fkey";
ALTER TABLE "weekly_plan_suggestions"
  ADD CONSTRAINT "weekly_plan_suggestions_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "weekly_plan_suggestions"
  DROP CONSTRAINT IF EXISTS "weekly_plan_suggestions_reviewed_by_id_fkey";
ALTER TABLE "weekly_plan_suggestions"
  ADD CONSTRAINT "weekly_plan_suggestions_reviewed_by_id_fkey"
  FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "student_timeline_events"
  DROP CONSTRAINT IF EXISTS "student_timeline_events_student_id_fkey";
ALTER TABLE "student_timeline_events"
  ADD CONSTRAINT "student_timeline_events_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sistem şablonları (idempotent seed)
INSERT INTO "weekly_plan_templates" ("id", "code", "title", "description", "exam_track", "task_defs", "is_system", "created_at", "updated_at")
VALUES
  (
    'tpl_lgs_standard',
    'LGS_STANDARD',
    'LGS standart hafta',
    'Dengeli LGS haftası: matematik, Türkçe, fen ve sosyal tekrar.',
    'LGS',
    '[
      {"dayOffset":0,"title":"Matematik — problemler","taskKind":"QUESTION_PRACTICE","subject":"Matematik","targetType":"QUESTIONS","targetValue":40,"durationMinutes":45,"priority":"HIGH"},
      {"dayOffset":0,"title":"Türkçe — paragraf","taskKind":"QUESTION_PRACTICE","subject":"Türkçe","targetType":"QUESTIONS","targetValue":30,"durationMinutes":40,"priority":"NORMAL"},
      {"dayOffset":1,"title":"Fen — konu tekrarı","taskKind":"TOPIC_STUDY","subject":"Fen","durationMinutes":35,"priority":"NORMAL"},
      {"dayOffset":2,"title":"Matematik — geometri","taskKind":"QUESTION_PRACTICE","subject":"Matematik","targetType":"QUESTIONS","targetValue":25,"durationMinutes":40,"priority":"NORMAL"},
      {"dayOffset":3,"title":"Sosyal — özet okuma","taskKind":"MATERIAL_READ","subject":"Sosyal","durationMinutes":30,"priority":"LOW"},
      {"dayOffset":4,"title":"Karışık deneme seti","taskKind":"QUESTION_PRACTICE","subject":"Genel","targetType":"QUESTIONS","targetValue":40,"durationMinutes":50,"priority":"HIGH"},
      {"dayOffset":5,"title":"Yanlış analizi","taskKind":"ERROR_ANALYSIS","durationMinutes":40,"priority":"HIGH"}
    ]'::jsonb,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'tpl_tyt_math_heavy',
    'TYT_MATH_HEAVY',
    'TYT yoğun matematik',
    'Matematik ağırlıklı TYT haftası; paragraf ve fen destekli.',
    'TYT',
    '[
      {"dayOffset":0,"title":"TYT Matematik — 40 soru","taskKind":"QUESTION_PRACTICE","subject":"Matematik","targetType":"QUESTIONS","targetValue":40,"durationMinutes":50,"priority":"URGENT"},
      {"dayOffset":0,"title":"Türkçe paragraf","taskKind":"QUESTION_PRACTICE","subject":"Türkçe","targetType":"QUESTIONS","targetValue":20,"durationMinutes":30,"priority":"NORMAL"},
      {"dayOffset":1,"title":"TYT Matematik — problemler","taskKind":"QUESTION_PRACTICE","subject":"Matematik","targetType":"QUESTIONS","targetValue":35,"durationMinutes":45,"priority":"HIGH"},
      {"dayOffset":2,"title":"Fen — formül tekrarı","taskKind":"REVIEW","subject":"Fen","durationMinutes":30,"priority":"NORMAL"},
      {"dayOffset":3,"title":"TYT Matematik — geometri","taskKind":"QUESTION_PRACTICE","subject":"Matematik","targetType":"QUESTIONS","targetValue":30,"durationMinutes":40,"priority":"HIGH"},
      {"dayOffset":4,"title":"TYT genel mini set","taskKind":"QUESTION_PRACTICE","subject":"Genel","targetType":"QUESTIONS","targetValue":40,"durationMinutes":45,"priority":"NORMAL"},
      {"dayOffset":5,"title":"Yanlış kuyruğu tekrarı","taskKind":"REVIEW","durationMinutes":35,"priority":"HIGH"}
    ]'::jsonb,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'tpl_ayt_sayisal',
    'AYT_SAYISAL',
    'AYT sayısal',
    'Matematik ve fen ağırlıklı AYT çalışma haftası.',
    'AYT',
    '[
      {"dayOffset":0,"title":"AYT Matematik","taskKind":"QUESTION_PRACTICE","subject":"Matematik","targetType":"QUESTIONS","targetValue":30,"durationMinutes":50,"priority":"HIGH"},
      {"dayOffset":1,"title":"AYT Fizik","taskKind":"TOPIC_STUDY","subject":"Fizik","durationMinutes":45,"priority":"HIGH"},
      {"dayOffset":2,"title":"AYT Kimya","taskKind":"QUESTION_PRACTICE","subject":"Kimya","targetType":"QUESTIONS","targetValue":20,"durationMinutes":40,"priority":"NORMAL"},
      {"dayOffset":3,"title":"AYT Biyoloji","taskKind":"TOPIC_STUDY","subject":"Biyoloji","durationMinutes":40,"priority":"NORMAL"},
      {"dayOffset":4,"title":"AYT Matematik — zor set","taskKind":"QUESTION_PRACTICE","subject":"Matematik","targetType":"QUESTIONS","targetValue":25,"durationMinutes":50,"priority":"URGENT"},
      {"dayOffset":5,"title":"Yanlış analizi","taskKind":"ERROR_ANALYSIS","durationMinutes":40,"priority":"HIGH"}
    ]'::jsonb,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'tpl_deneme_haftasi',
    'MOCK_EXAM_WEEK',
    'Deneme haftası',
    'Deneme öncesi hazırlık, deneme günü ve sonrası analiz.',
    'GENEL',
    '[
      {"dayOffset":0,"title":"Zayıf konu tekrarı","taskKind":"REVIEW","durationMinutes":40,"priority":"HIGH"},
      {"dayOffset":1,"title":"Hafif soru seti","taskKind":"QUESTION_PRACTICE","targetType":"QUESTIONS","targetValue":20,"durationMinutes":30,"priority":"NORMAL"},
      {"dayOffset":2,"title":"Erken uyku / dinlenme","taskKind":"CUSTOM","durationMinutes":15,"priority":"LOW"},
      {"dayOffset":3,"title":"Genel deneme","taskKind":"MOCK_EXAM","durationMinutes":135,"priority":"URGENT","scheduleMode":"SCHEDULED"},
      {"dayOffset":4,"title":"Deneme yanlış analizi","taskKind":"ERROR_ANALYSIS","durationMinutes":60,"priority":"URGENT"},
      {"dayOffset":5,"title":"Kazanım tekrarı","taskKind":"REVIEW","durationMinutes":45,"priority":"HIGH"}
    ]'::jsonb,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'tpl_tekrar_haftasi',
    'REVIEW_WEEK',
    'Tekrar haftası',
    'Yanlış kuyruğu ve konu tekrarına odaklı hafta.',
    'GENEL',
    '[
      {"dayOffset":0,"title":"Tekrar kuyruğu — matematik","taskKind":"REVIEW","subject":"Matematik","durationMinutes":40,"priority":"HIGH"},
      {"dayOffset":1,"title":"Tekrar kuyruğu — Türkçe","taskKind":"REVIEW","subject":"Türkçe","durationMinutes":35,"priority":"NORMAL"},
      {"dayOffset":2,"title":"Konu özeti okuma","taskKind":"MATERIAL_READ","durationMinutes":30,"priority":"NORMAL"},
      {"dayOffset":3,"title":"Video konu tekrarı","taskKind":"VIDEO","durationMinutes":30,"priority":"LOW"},
      {"dayOffset":4,"title":"Karışık yanlış seti","taskKind":"ERROR_ANALYSIS","durationMinutes":45,"priority":"HIGH"},
      {"dayOffset":5,"title":"Haftalık özet tekrar","taskKind":"REVIEW","durationMinutes":30,"priority":"NORMAL"}
    ]'::jsonb,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("code") DO NOTHING;
