CREATE TYPE "OdkQuestionResult" AS ENUM ('CORRECT', 'WRONG', 'BLANK');

CREATE TABLE "odk_attempt_scores" (
  "attempt_id" TEXT NOT NULL,
  "correct_count" INTEGER NOT NULL,
  "wrong_count" INTEGER NOT NULL,
  "blank_count" INTEGER NOT NULL,
  "total_net" DECIMAL(7,2) NOT NULL,
  "scoring_version" TEXT NOT NULL,
  "answer_key_hash" TEXT NOT NULL,
  "scored_by_id" TEXT NOT NULL,
  "scored_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "odk_attempt_scores_pkey" PRIMARY KEY ("attempt_id"),
  CONSTRAINT "odk_attempt_scores_counts_check" CHECK ("correct_count" >= 0 AND "wrong_count" >= 0 AND "blank_count" >= 0),
  CONSTRAINT "odk_attempt_scores_net_check" CHECK ("total_net" >= 0)
);
CREATE INDEX "odk_attempt_scores_scored_by_id_scored_at_idx" ON "odk_attempt_scores"("scored_by_id", "scored_at");

CREATE TABLE "odk_attempt_question_results" (
  "attempt_id" TEXT NOT NULL,
  "question_id" TEXT NOT NULL,
  "selected_option" "OdkAnswerOption",
  "correct_option" "OdkAnswerOption" NOT NULL,
  "result" "OdkQuestionResult" NOT NULL,
  CONSTRAINT "odk_attempt_question_results_pkey" PRIMARY KEY ("attempt_id", "question_id")
);
CREATE INDEX "odk_attempt_question_results_question_id_result_idx" ON "odk_attempt_question_results"("question_id", "result");

CREATE TABLE "odk_attempt_outcome_scores" (
  "attempt_id" TEXT NOT NULL,
  "outcome_id" TEXT NOT NULL,
  "question_count" INTEGER NOT NULL,
  "correct_count" INTEGER NOT NULL,
  "wrong_count" INTEGER NOT NULL,
  "blank_count" INTEGER NOT NULL,
  "accuracy_rate" DECIMAL(5,2) NOT NULL,
  CONSTRAINT "odk_attempt_outcome_scores_pkey" PRIMARY KEY ("attempt_id", "outcome_id"),
  CONSTRAINT "odk_attempt_outcome_scores_counts_check" CHECK ("question_count" > 0 AND "correct_count" >= 0 AND "wrong_count" >= 0 AND "blank_count" >= 0 AND "correct_count" + "wrong_count" + "blank_count" = "question_count"),
  CONSTRAINT "odk_attempt_outcome_scores_accuracy_check" CHECK ("accuracy_rate" BETWEEN 0 AND 100)
);
CREATE INDEX "odk_attempt_outcome_scores_outcome_id_accuracy_rate_idx" ON "odk_attempt_outcome_scores"("outcome_id", "accuracy_rate");

ALTER TABLE "odk_attempt_scores" ADD CONSTRAINT "odk_attempt_scores_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "odk_exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "odk_attempt_scores" ADD CONSTRAINT "odk_attempt_scores_scored_by_id_fkey" FOREIGN KEY ("scored_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "odk_attempt_question_results" ADD CONSTRAINT "odk_attempt_question_results_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "odk_attempt_scores"("attempt_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "odk_attempt_question_results" ADD CONSTRAINT "odk_attempt_question_results_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "odk_exam_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "odk_attempt_outcome_scores" ADD CONSTRAINT "odk_attempt_outcome_scores_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "odk_attempt_scores"("attempt_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "odk_attempt_outcome_scores" ADD CONSTRAINT "odk_attempt_outcome_scores_outcome_id_fkey" FOREIGN KEY ("outcome_id") REFERENCES "learning_outcomes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
