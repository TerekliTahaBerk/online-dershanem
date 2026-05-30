-- Phase 2 / Session 4 — Study Session
-- Minimal additive table for student-driven self-study tracking.
-- Powers the Study Room (`/panel/ogrenci/calisma-odasi`) and unlocks
-- future teacher / admin reporting (weekly study minutes, per-subject
-- focus, etc.). Strictly student-owned: every row is FK'd to Student
-- with ON DELETE CASCADE; courseId is optional and SET NULL on course
-- deletion so historical study time is preserved.
--
-- Operational invariant (enforced by application layer, not DB):
--   At most ONE row per studentId may have endedAt IS NULL ("active
--   session"). The composite index on (studentId, endedAt) makes that
--   lookup trivial; we deliberately do not enforce it as a DB unique
--   constraint to avoid blocking idempotent retries from the client.

CREATE TABLE IF NOT EXISTS "StudySession" (
  "id"              TEXT          NOT NULL,
  "studentId"       TEXT          NOT NULL,
  "courseId"        TEXT,
  "subject"         TEXT,
  "startedAt"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt"         TIMESTAMP(3),
  "durationSeconds" INTEGER,
  "note"            TEXT,
  "createdAt"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)  NOT NULL,
  CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StudySession_studentId_fkey'
  ) THEN
    ALTER TABLE "StudySession"
      ADD CONSTRAINT "StudySession_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "Student"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StudySession_courseId_fkey'
  ) THEN
    ALTER TABLE "StudySession"
      ADD CONSTRAINT "StudySession_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "Course"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "StudySession_studentId_startedAt_idx"
  ON "StudySession" ("studentId", "startedAt");

CREATE INDEX IF NOT EXISTS "StudySession_studentId_endedAt_idx"
  ON "StudySession" ("studentId", "endedAt");

CREATE INDEX IF NOT EXISTS "StudySession_courseId_idx"
  ON "StudySession" ("courseId");
