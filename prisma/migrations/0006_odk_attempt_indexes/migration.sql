-- Compound indexes for admin stats queries that filter by (examId, status, time).
-- Prevents full table-scans on istatistikler and releaseExamResults.
CREATE INDEX IF NOT EXISTS "OdkExamAttempt_examId_status_submittedAt_idx"
  ON "odk_exam_attempts"("exam_id", "status", "submitted_at");

CREATE INDEX IF NOT EXISTS "OdkExamAttempt_examId_status_startedAt_idx"
  ON "odk_exam_attempts"("exam_id", "status", "started_at");
