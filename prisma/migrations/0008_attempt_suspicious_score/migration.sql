-- Add denormalized suspicious_score column to odk_exam_attempts.
-- Nullable Float — written at submit time from integrityFlags; null for
-- auto-submitted attempts with no answer-timing data.
ALTER TABLE "odk_exam_attempts" ADD COLUMN "suspicious_score" DOUBLE PRECISION;

-- Index to allow ORDER BY / WHERE suspicious_score DESC efficiently.
CREATE INDEX "odk_exam_attempts_suspicious_score_idx" ON "odk_exam_attempts"("suspicious_score" DESC NULLS LAST);
