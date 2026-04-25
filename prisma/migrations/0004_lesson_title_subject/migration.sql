-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 0004: lesson_title_subject
--
-- Adds:
--   1. Lesson.title  — short label shown to student (e.g. "Türev Soruları")
--   2. Lesson.subject — subject area (e.g. "Matematik")
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE "Lesson"
  ADD COLUMN "title"   TEXT,
  ADD COLUMN "subject" TEXT;
