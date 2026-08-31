-- Part 24–25 — group lifecycle + lesson series

CREATE TABLE IF NOT EXISTS "lesson_series" (
  "id" TEXT NOT NULL,
  "group_id" TEXT NOT NULL,
  "teacher_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "meeting_url" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lesson_series_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "lesson_series_group_id_is_active_idx"
  ON "lesson_series" ("group_id", "is_active");

CREATE INDEX IF NOT EXISTS "lesson_series_teacher_id_is_active_idx"
  ON "lesson_series" ("teacher_id", "is_active");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lesson_series_group_id_fkey'
  ) THEN
    ALTER TABLE "lesson_series"
      ADD CONSTRAINT "lesson_series_group_id_fkey"
      FOREIGN KEY ("group_id") REFERENCES "groups"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lesson_series_teacher_id_fkey'
  ) THEN
    ALTER TABLE "lesson_series"
      ADD CONSTRAINT "lesson_series_teacher_id_fkey"
      FOREIGN KEY ("teacher_id") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

ALTER TABLE "lessons"
  ADD COLUMN IF NOT EXISTS "series_id" TEXT;

CREATE INDEX IF NOT EXISTS "lessons_series_id_starts_at_idx"
  ON "lessons" ("series_id", "starts_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lessons_series_id_fkey'
  ) THEN
    ALTER TABLE "lessons"
      ADD CONSTRAINT "lessons_series_id_fkey"
      FOREIGN KEY ("series_id") REFERENCES "lesson_series"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
