-- CreateEnum
CREATE TYPE "DinoAudience" AS ENUM ('STUDENT', 'PARENT', 'TEACHER');

-- AlterEnum
ALTER TYPE "AiDraftProvider" ADD VALUE 'GEMINI';

-- CreateTable
CREATE TABLE "dino_answers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "audience" "DinoAudience" NOT NULL,
    "question_key" TEXT NOT NULL,
    "subject_student_id" TEXT,
    "provider" "AiDraftProvider" NOT NULL,
    "model_name" TEXT,
    "prompt_version" TEXT NOT NULL,
    "source_hash" TEXT NOT NULL,
    "source_refs" JSONB NOT NULL,
    "answer" JSONB NOT NULL,
    "fallback_reason" TEXT,
    "redaction_count" INTEGER NOT NULL DEFAULT 0,
    "latency_ms" INTEGER NOT NULL,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "estimated_cost_microusd" INTEGER,
    "request_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dino_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dino_answers_request_key_key" ON "dino_answers"("request_key");

-- CreateIndex
CREATE INDEX "dino_answers_user_id_created_at_idx" ON "dino_answers"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "dino_answers_subject_student_id_created_at_idx" ON "dino_answers"("subject_student_id", "created_at");

-- AddForeignKey
ALTER TABLE "dino_answers" ADD CONSTRAINT "dino_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dino_answers" ADD CONSTRAINT "dino_answers_subject_student_id_fkey" FOREIGN KEY ("subject_student_id") REFERENCES "student_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

