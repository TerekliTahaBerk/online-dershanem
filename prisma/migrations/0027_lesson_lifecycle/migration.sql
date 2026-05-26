-- ─────────────────────────────────────────────────────────────────────────────
-- FAZ 2 / S2 — Sprint 6 — 0027_lesson_lifecycle
--
-- Canlı ders yaşam döngüsü için additive, non-destructive migration:
--   1. LessonStatus enum'una LIVE, ENDED, MISSED ekle (COMPLETED korunur).
--   2. Lesson'a yaşam döngüsü ek alanları: startedAt, endedAt, meeting*.
--   3. Yeni model LessonJoinEvent + JoinEventKind enum.
--   4. Attendance'a source (MANUAL/AUTO), firstJoinedAt, durationSec.
--
-- KURAL: ALTER TYPE ADD VALUE, EKLENEN değer aynı transaction içinde
-- KULLANILAMAZ. Bu migration eklenen değerleri yalnızca enum'a yazar; default
-- veya CHECK constraint olarak HEMEN kullanmaz → tek migration güvenli.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. LessonStatus enum genişletme ─────────────────────────────────────────
ALTER TYPE "LessonStatus" ADD VALUE IF NOT EXISTS 'LIVE';
ALTER TYPE "LessonStatus" ADD VALUE IF NOT EXISTS 'ENDED';
ALTER TYPE "LessonStatus" ADD VALUE IF NOT EXISTS 'MISSED';

-- ── 2. Lesson ek alanları ───────────────────────────────────────────────────
ALTER TABLE "Lesson"
  ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "meetingProvider" TEXT,
  ADD COLUMN IF NOT EXISTS "meetingRoomId" TEXT,
  ADD COLUMN IF NOT EXISTS "meetingJoinUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "meetingHostUrl" TEXT;

CREATE INDEX IF NOT EXISTS "Lesson_status_startedAt_idx" ON "Lesson"("status", "startedAt");

-- ── 3. AttendanceSource enum ────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "AttendanceSource" AS ENUM ('MANUAL', 'AUTO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── 4. Attendance ek alanları ───────────────────────────────────────────────
ALTER TABLE "Attendance"
  ADD COLUMN IF NOT EXISTS "source" "AttendanceSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "firstJoinedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "durationSec" INTEGER;

CREATE INDEX IF NOT EXISTS "Attendance_source_idx" ON "Attendance"("source");

-- ── 5. JoinEventKind enum + LessonJoinEvent tablosu ─────────────────────────
DO $$ BEGIN
  CREATE TYPE "JoinEventKind" AS ENUM ('JOIN', 'LEAVE', 'HEARTBEAT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "LessonJoinEvent" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "sessionGroupId" TEXT,
  "studentId" TEXT,
  "userId" TEXT NOT NULL,
  "kind" "JoinEventKind" NOT NULL,
  "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip" TEXT,
  "ua" TEXT,
  CONSTRAINT "LessonJoinEvent_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "LessonJoinEvent"
    ADD CONSTRAINT "LessonJoinEvent_lesson_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "LessonJoinEvent"
    ADD CONSTRAINT "LessonJoinEvent_student_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "LessonJoinEvent"
    ADD CONSTRAINT "LessonJoinEvent_user_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "LessonJoinEvent_lesson_ts_idx" ON "LessonJoinEvent"("lessonId", "ts");
CREATE INDEX IF NOT EXISTS "LessonJoinEvent_sessionGroup_ts_idx" ON "LessonJoinEvent"("sessionGroupId", "ts");
CREATE INDEX IF NOT EXISTS "LessonJoinEvent_user_ts_idx" ON "LessonJoinEvent"("userId", "ts");
CREATE INDEX IF NOT EXISTS "LessonJoinEvent_kind_ts_idx" ON "LessonJoinEvent"("kind", "ts");
