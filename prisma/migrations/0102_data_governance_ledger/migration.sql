-- CreateEnum
CREATE TYPE "DataSubjectRequestAction" AS ENUM ('ANONYMIZE', 'DELETE');

-- CreateEnum
CREATE TYPE "DataSubjectRequestStatus" AS ENUM ('PENDING_GRACE', 'APPLIED', 'CANCELLED', 'BLOCKED');

-- CreateTable
CREATE TABLE "data_subject_tombstones" (
    "id" TEXT NOT NULL,
    "subject_user_id" TEXT NOT NULL,
    "action" "DataSubjectRequestAction" NOT NULL,
    "status" "DataSubjectRequestStatus" NOT NULL DEFAULT 'PENDING_GRACE',
    "ticket_ref" TEXT NOT NULL,
    "approved_by_user_id" TEXT NOT NULL,
    "applied_by_user_id" TEXT,
    "cancelled_by_user_id" TEXT,
    "previous_status" "UserStatus" NOT NULL,
    "previous_archived_at" TIMESTAMPTZ(3),
    "grace_until" TIMESTAMPTZ(3) NOT NULL,
    "applied_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "blockers" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "data_subject_tombstones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retention_marks" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "marked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purge_after" TIMESTAMPTZ(3) NOT NULL,
    "purged_at" TIMESTAMPTZ(3),
    "released_at" TIMESTAMPTZ(3),

    CONSTRAINT "retention_marks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_subject_tombstones_subject_user_id_idx" ON "data_subject_tombstones"("subject_user_id");

-- CreateIndex
CREATE INDEX "data_subject_tombstones_status_grace_until_idx" ON "data_subject_tombstones"("status", "grace_until");

-- CreateIndex
CREATE INDEX "retention_marks_category_purge_after_idx" ON "retention_marks"("category", "purge_after");

-- CreateIndex
CREATE UNIQUE INDEX "retention_marks_model_record_id_key" ON "retention_marks"("model", "record_id");

