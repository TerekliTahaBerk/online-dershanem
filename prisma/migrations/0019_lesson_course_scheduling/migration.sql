-- ─────────────────────────────────────────────────────────────────────────────
-- FAZ 3 / 0019_lesson_course_scheduling
--
-- Additive, non-destructive migration:
--   1. Course modeline opsiyonel default öğretmen + default sınıf eklenir
--      (ders tanımlarına teacher/classroom kalıcı bağlanabilsin).
--   2. Lesson modeline opsiyonel:
--        - courseId   → Lesson'ı bir Course tanımına bağlar
--        - seriesId   → tekrarlı (recurring) bir planlamanın tüm üyeleri
--        - sessionGroupId → bir classroom session'ın N öğrenci satırını gruplar
--        - location   → "Online" / fiziksel mekan etiketi
--
-- Mevcut Lesson satırlarının hiçbir alanı yeniden yazılmaz; tüm yeni kolonlar
-- nullable + default yok. FK'lar SET NULL ile güvenli.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Course ──────────────────────────────────────────────────────────────────

ALTER TABLE "Course"
  ADD COLUMN IF NOT EXISTS "defaultTeacherId" TEXT,
  ADD COLUMN IF NOT EXISTS "defaultClassroomId" TEXT,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

DO $$ BEGIN
  ALTER TABLE "Course"
    ADD CONSTRAINT "Course_defaultTeacher_fkey"
    FOREIGN KEY ("defaultTeacherId") REFERENCES "Teacher"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "Course"
    ADD CONSTRAINT "Course_defaultClassroom_fkey"
    FOREIGN KEY ("defaultClassroomId") REFERENCES "Classroom"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "Course_defaultTeacher_idx" ON "Course"("defaultTeacherId");
CREATE INDEX IF NOT EXISTS "Course_defaultClassroom_idx" ON "Course"("defaultClassroomId");
CREATE INDEX IF NOT EXISTS "Course_isActive_idx" ON "Course"("isActive");

-- ── Lesson ──────────────────────────────────────────────────────────────────

ALTER TABLE "Lesson"
  ADD COLUMN IF NOT EXISTS "courseId" TEXT,
  ADD COLUMN IF NOT EXISTS "seriesId" TEXT,
  ADD COLUMN IF NOT EXISTS "sessionGroupId" TEXT,
  ADD COLUMN IF NOT EXISTS "location" TEXT;

DO $$ BEGIN
  ALTER TABLE "Lesson"
    ADD CONSTRAINT "Lesson_course_fkey"
    FOREIGN KEY ("courseId") REFERENCES "Course"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "Lesson_course_scheduled_idx" ON "Lesson"("courseId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "Lesson_seriesId_idx" ON "Lesson"("seriesId");
CREATE INDEX IF NOT EXISTS "Lesson_sessionGroupId_idx" ON "Lesson"("sessionGroupId");
