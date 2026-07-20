CREATE TYPE "AiDraftTaskType" AS ENUM ('ASSIGNMENT', 'MINI_CHECK');
CREATE TYPE "AiDraftStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED', 'FLAGGED');
CREATE TYPE "AiDraftProvider" AS ENUM ('OPENAI', 'FALLBACK', 'STUB');
CREATE TYPE "AiDraftFlagReason" AS ENUM ('FACTUAL_ERROR', 'UNSUPPORTED_CITATION', 'UNSAFE_TONE', 'PRIVACY', 'OTHER');

CREATE TABLE "teacher_ai_drafts" (
  "id" TEXT NOT NULL,
  "teacher_id" TEXT NOT NULL,
  "lesson_id" TEXT NOT NULL,
  "task_type" "AiDraftTaskType" NOT NULL,
  "status" "AiDraftStatus" NOT NULL DEFAULT 'DRAFT',
  "provider" "AiDraftProvider" NOT NULL,
  "prompt_version" TEXT NOT NULL,
  "model_name" TEXT,
  "source_hash" TEXT NOT NULL,
  "source_refs" JSONB NOT NULL,
  "original_content" JSONB NOT NULL,
  "reviewed_content" JSONB,
  "flag_reason" "AiDraftFlagReason",
  "fallback_reason" TEXT,
  "redaction_count" INTEGER NOT NULL DEFAULT 0,
  "latency_ms" INTEGER,
  "input_tokens" INTEGER,
  "output_tokens" INTEGER,
  "estimated_cost_microusd" INTEGER,
  "request_key" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "teacher_ai_drafts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "teacher_ai_drafts_request_key_key" ON "teacher_ai_drafts"("request_key");
CREATE INDEX "teacher_ai_drafts_teacher_id_created_at_idx" ON "teacher_ai_drafts"("teacher_id", "created_at");
CREATE INDEX "teacher_ai_drafts_teacher_id_status_created_at_idx" ON "teacher_ai_drafts"("teacher_id", "status", "created_at");
ALTER TABLE "teacher_ai_drafts" ADD CONSTRAINT "teacher_ai_drafts_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_ai_drafts" ADD CONSTRAINT "teacher_ai_drafts_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
