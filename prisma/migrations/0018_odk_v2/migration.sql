-- Migration 0018 — ODK V2 (Faz 2): Wizard, kazanım zenginleştirme, cheat events
-- ADDITIVE — mevcut hiçbir veri silinmez, mevcut kolonlar dokunulmaz.

-- ─── odk_exams: yeni alanlar ───────────────────────────────────────────
ALTER TABLE "odk_exams"
    ADD COLUMN IF NOT EXISTS "class_level"   TEXT,
    ADD COLUMN IF NOT EXISTS "published_at"  TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "settings"      JSONB;

-- ─── odk_exam_official_answers: zenginleştirilmiş kazanım alanları ─────
ALTER TABLE "odk_exam_official_answers"
    ADD COLUMN IF NOT EXISTS "lesson"                TEXT,
    ADD COLUMN IF NOT EXISTS "unit"                  TEXT,
    ADD COLUMN IF NOT EXISTS "topic"                 TEXT,
    ADD COLUMN IF NOT EXISTS "learning_outcome_code" TEXT,
    ADD COLUMN IF NOT EXISTS "learning_outcome"      TEXT,
    ADD COLUMN IF NOT EXISTS "difficulty"            TEXT;

CREATE INDEX IF NOT EXISTS "odk_exam_official_answers_exam_id_loc_idx"
    ON "odk_exam_official_answers"("exam_id", "learning_outcome_code");

-- ─── odk_exam_attempts: cheat / autosubmit alanları ────────────────────
ALTER TABLE "odk_exam_attempts"
    ADD COLUMN IF NOT EXISTS "cheat_violation_count" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "last_event_at"         TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "auto_submitted"        BOOLEAN NOT NULL DEFAULT false;

-- ─── OdkAttemptEventType enum ──────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE "OdkAttemptEventType" AS ENUM (
        'TAB_BLUR','TAB_FOCUS','VISIBILITY_HIDDEN','VISIBILITY_VISIBLE',
        'FULLSCREEN_ENTER','FULLSCREEN_EXIT',
        'RIGHT_CLICK','COPY','PASTE','CUT','PRINT','KEY_DEVTOOLS',
        'ANSWER_CHANGE','NAVIGATE','AUTOSAVE',
        'NETWORK_DROP','NETWORK_RESUME','WARNING_SHOWN'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── odk_exam_attempt_events ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "odk_exam_attempt_events" (
    "id"              TEXT NOT NULL,
    "attempt_id"      TEXT NOT NULL,
    "type"            "OdkAttemptEventType" NOT NULL,
    "question_number" INTEGER,
    "payload"         JSONB,
    "occurred_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "odk_exam_attempt_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "odk_exam_attempt_events_attempt_id_occurred_at_idx"
    ON "odk_exam_attempt_events"("attempt_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "odk_exam_attempt_events_attempt_id_type_idx"
    ON "odk_exam_attempt_events"("attempt_id", "type");

ALTER TABLE "odk_exam_attempt_events"
    ADD CONSTRAINT "odk_exam_attempt_events_attempt_id_fkey"
    FOREIGN KEY ("attempt_id") REFERENCES "odk_exam_attempts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
