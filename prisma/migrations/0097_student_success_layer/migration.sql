-- Student Success Layer — cross-product integration foundation

CREATE TYPE "CrossProductEventType" AS ENUM (
  'LESSON_COMPLETED',
  'LESSON_MISSED',
  'ASSIGNMENT_CREATED',
  'ASSIGNMENT_COMPLETED',
  'ASSIGNMENT_EVALUATED',
  'COACHING_PLAN_PUBLISHED',
  'COACHING_TASK_COMPLETED',
  'MOCK_EXAM_ASSIGNED',
  'MOCK_EXAM_COMPLETED',
  'MOCK_EXAM_RESULT_PUBLISHED',
  'OUTCOME_MASTERY_CHANGED',
  'INTERVENTION_CREATED'
);

CREATE TYPE "CrossProductEventStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'PROCESSED',
  'FAILED'
);

CREATE TYPE "ProgressEvidenceSource" AS ENUM (
  'LESSON',
  'ASSIGNMENT',
  'COACHING_TASK',
  'MOCK_EXAM',
  'REVIEW',
  'TEACHER_ASSESSMENT'
);

CREATE TYPE "OutcomeMasteryStatus" AS ENUM (
  'NOT_STARTED',
  'INTRODUCED',
  'PRACTICING',
  'DEVELOPING',
  'MASTERED',
  'NEEDS_REVIEW'
);

CREATE TYPE "CrossProductRecommendationStatus" AS ENUM (
  'SUGGESTED',
  'ACCEPTED',
  'DISMISSED',
  'APPLIED',
  'EXPIRED'
);

CREATE TYPE "CrossProductRecommendationSource" AS ENUM (
  'TEACHER',
  'COACH',
  'ASSIGNMENT',
  'MOCK_EXAM',
  'REVIEW_ENGINE',
  'RECOVERY',
  'MANUAL_ADMIN',
  'LESSON_CLOSE'
);

CREATE TYPE "CrossProductRecommendationKind" AS ENUM (
  'REVIEW_TASK',
  'TOPIC_REPEAT',
  'OUTCOME_REPEAT',
  'QUESTION_SET',
  'SPEED_PRACTICE',
  'MINI_MOCK',
  'RECOVERY_PACKAGE',
  'COACH_REVIEW',
  'LESSON_PREP'
);

CREATE TABLE "cross_product_event_outbox" (
  "id" TEXT NOT NULL,
  "event_type" "CrossProductEventType" NOT NULL,
  "event_version" INTEGER NOT NULL DEFAULT 1,
  "deduplication_key" TEXT NOT NULL,
  "actor_user_id" TEXT,
  "student_id" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "CrossProductEventStatus" NOT NULL DEFAULT 'PENDING',
  "occurred_at" TIMESTAMPTZ(3) NOT NULL,
  "processed_at" TIMESTAMPTZ(3),
  "last_error" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cross_product_event_outbox_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cross_product_event_consumers" (
  "id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "consumer_key" TEXT NOT NULL,
  "processed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cross_product_event_consumers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_progress_evidence" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "outcome_id" TEXT NOT NULL,
  "source_type" "ProgressEvidenceSource" NOT NULL,
  "source_id" TEXT NOT NULL,
  "product_code" "ProductCode" NOT NULL,
  "summary" TEXT NOT NULL,
  "metrics" JSONB NOT NULL,
  "occurred_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_progress_evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_outcome_mastery" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "outcome_id" TEXT NOT NULL,
  "status" "OutcomeMasteryStatus" NOT NULL,
  "explanation" JSONB NOT NULL,
  "evidence_count" INTEGER NOT NULL DEFAULT 0,
  "computed_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "student_outcome_mastery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cross_product_recommendations" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "status" "CrossProductRecommendationStatus" NOT NULL DEFAULT 'SUGGESTED',
  "source_type" "CrossProductRecommendationSource" NOT NULL,
  "source_id" TEXT NOT NULL,
  "kind" "CrossProductRecommendationKind" NOT NULL,
  "title" TEXT NOT NULL,
  "rationale" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "expires_at" TIMESTAMPTZ(3),
  "decided_by_id" TEXT,
  "decided_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "cross_product_recommendations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cross_product_event_outbox_deduplication_key_key" ON "cross_product_event_outbox"("deduplication_key");
CREATE INDEX "cross_product_event_outbox_status_occurred_at_idx" ON "cross_product_event_outbox"("status", "occurred_at");
CREATE INDEX "cross_product_event_outbox_student_id_event_type_occurred_at_idx" ON "cross_product_event_outbox"("student_id", "event_type", "occurred_at");

CREATE UNIQUE INDEX "cross_product_event_consumers_event_id_consumer_key_key" ON "cross_product_event_consumers"("event_id", "consumer_key");
CREATE INDEX "cross_product_event_consumers_consumer_key_processed_at_idx" ON "cross_product_event_consumers"("consumer_key", "processed_at");

CREATE UNIQUE INDEX "student_progress_evidence_student_id_outcome_id_source_type_source_id_key" ON "student_progress_evidence"("student_id", "outcome_id", "source_type", "source_id");
CREATE INDEX "student_progress_evidence_student_id_outcome_id_occurred_at_idx" ON "student_progress_evidence"("student_id", "outcome_id", "occurred_at");
CREATE INDEX "student_progress_evidence_student_id_source_type_occurred_at_idx" ON "student_progress_evidence"("student_id", "source_type", "occurred_at");

CREATE UNIQUE INDEX "student_outcome_mastery_student_id_outcome_id_key" ON "student_outcome_mastery"("student_id", "outcome_id");
CREATE INDEX "student_outcome_mastery_student_id_status_idx" ON "student_outcome_mastery"("student_id", "status");

CREATE INDEX "cross_product_recommendations_student_id_status_created_at_idx" ON "cross_product_recommendations"("student_id", "status", "created_at");
CREATE INDEX "cross_product_recommendations_source_type_source_id_idx" ON "cross_product_recommendations"("source_type", "source_id");

ALTER TABLE "cross_product_event_outbox" ADD CONSTRAINT "cross_product_event_outbox_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cross_product_event_outbox" ADD CONSTRAINT "cross_product_event_outbox_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cross_product_event_consumers" ADD CONSTRAINT "cross_product_event_consumers_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "cross_product_event_outbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_progress_evidence" ADD CONSTRAINT "student_progress_evidence_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_progress_evidence" ADD CONSTRAINT "student_progress_evidence_outcome_id_fkey" FOREIGN KEY ("outcome_id") REFERENCES "learning_outcomes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_outcome_mastery" ADD CONSTRAINT "student_outcome_mastery_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_outcome_mastery" ADD CONSTRAINT "student_outcome_mastery_outcome_id_fkey" FOREIGN KEY ("outcome_id") REFERENCES "learning_outcomes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cross_product_recommendations" ADD CONSTRAINT "cross_product_recommendations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cross_product_recommendations" ADD CONSTRAINT "cross_product_recommendations_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
