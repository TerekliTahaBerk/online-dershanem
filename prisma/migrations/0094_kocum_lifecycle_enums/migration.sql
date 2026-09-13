-- Online Koçum lifecycle — hedefler, zengin plan görevleri, şablonlar,
-- revizyon, koç notları, haftalık özet, öneriler ve zaman çizelgesi.

-- ─── Enum genişletmeleri ───────────────────────────────────────────────────

-- Enum value additions must commit before use (PG 55P04).
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

