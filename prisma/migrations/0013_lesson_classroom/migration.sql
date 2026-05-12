-- ─────────────────────────────────────────────────────────────────────────────
-- Faz 2 / 0013_lesson_classroom
-- Lesson modeline opsiyonel `classroomId` FK ekler. Mevcut tüm Lesson'lar NULL
-- olarak kalır (1-1 bireysel ders). UI bu durumu handle eder.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "Lesson"
  ADD COLUMN IF NOT EXISTS "classroomId" TEXT;

DO $$ BEGIN
  ALTER TABLE "Lesson"
    ADD CONSTRAINT "Lesson_classroom_fkey"
    FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "Lesson_classroom_scheduled_idx" ON "Lesson"("classroomId", "scheduledAt");
