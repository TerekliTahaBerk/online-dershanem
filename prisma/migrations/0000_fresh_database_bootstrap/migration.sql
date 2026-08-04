-- Bootstrap only genuinely empty databases (for example Prisma Compute PR environments).
-- Existing databases were historically created with prisma db push; the modern users table
-- makes this migration a no-op there, preserving production data and migration history.
DO $fresh_database_bootstrap$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    -- CreateSchema
    CREATE SCHEMA IF NOT EXISTS "public";

    -- CreateEnum
    CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STUDENT', 'TEACHER');

    -- CreateEnum
    CREATE TYPE "VerificationCodeType" AS ENUM ('REGISTER', 'PASSWORD_RESET');

    -- CreateEnum
    CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

    -- CreateEnum
    CREATE TYPE "IntakeStatus" AS ENUM ('NEW', 'REVIEWING', 'CONTACTED', 'ENROLLED', 'ARCHIVED');

    -- CreateEnum
    CREATE TYPE "PurchaseEventType" AS ENUM ('FORM_SUBMITTED', 'PAYMENT_LINK_OPENED', 'CALLBACK_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_FAILED');

    -- CreateEnum
    CREATE TYPE "StudentStatus" AS ENUM ('NEW', 'FOLLOW_UP', 'ACTIVE', 'AT_RISK', 'COMPLETED', 'INACTIVE');

    -- CreateEnum
    CREATE TYPE "TeacherStatus" AS ENUM ('ACTIVE', 'INACTIVE');

    -- CreateEnum
    CREATE TYPE "LessonStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

    -- CreateEnum
    CREATE TYPE "CampCategory" AS ENUM ('AYT', 'TYT', 'LGS');

    -- CreateEnum
    CREATE TYPE "OdkExamStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

    -- CreateEnum
    CREATE TYPE "OdkExamCadenceFamily" AS ENUM ('TYT', 'AYT', 'LGS', 'KPSS', 'ALES');

    -- CreateEnum
    CREATE TYPE "OdkExamFileType" AS ENUM ('BOOKLET_PDF', 'ANSWER_KEY_PDF');

    -- CreateEnum
    CREATE TYPE "OdkAccessTagGrantSource" AS ENUM ('PURCHASE', 'MANUAL');

    -- CreateEnum
    CREATE TYPE "OdkOrderStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED');

    -- CreateEnum
    CREATE TYPE "OdkPaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

    -- CreateEnum
    CREATE TYPE "OdkPaymentProvider" AS ENUM ('MANUAL', 'IYZICO', 'BANK_TRANSFER');

    -- CreateEnum
    CREATE TYPE "OdkEntitlementStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

    -- CreateEnum
    CREATE TYPE "OdkAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'ABANDONED');

    -- CreateTable
    CREATE TABLE "VerificationCode" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "type" "VerificationCodeType" NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "usedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "User" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "name" TEXT,
        "passwordHash" TEXT,
        "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "LeadSubmission" (
        "id" TEXT NOT NULL,
        "fullName" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "classLevel" TEXT NOT NULL,
        "examType" TEXT NOT NULL,
        "targetGoal" TEXT NOT NULL,
        "currentNet" TEXT NOT NULL,
        "parentPhone" TEXT,
        "kvkkConsent" BOOLEAN NOT NULL,
        "source" TEXT NOT NULL,
        "intakeStatus" "IntakeStatus" NOT NULL DEFAULT 'NEW',
        "adminNotes" TEXT,
        "taskLabel" TEXT,
        "nextActionAt" TIMESTAMP(3),
        "studentId" TEXT,
        "submittedAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "LeadSubmission_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "PurchaseIntent" (
        "id" TEXT NOT NULL,
        "source" TEXT NOT NULL,
        "packageName" TEXT NOT NULL,
        "paymentLink" TEXT,
        "studentFullName" TEXT NOT NULL,
        "studentPhone" TEXT NOT NULL,
        "studentEmail" TEXT NOT NULL,
        "schoolName" TEXT NOT NULL,
        "city" TEXT NOT NULL,
        "district" TEXT NOT NULL,
        "classLevel" TEXT NOT NULL,
        "department" TEXT,
        "examType" TEXT NOT NULL,
        "targetSchool" TEXT,
        "targetRanking" TEXT NOT NULL,
        "currentLevel" TEXT NOT NULL,
        "currentNet" TEXT NOT NULL,
        "weakLessons" TEXT NOT NULL,
        "strongLessons" TEXT,
        "needType" TEXT NOT NULL,
        "studyStatus" TEXT NOT NULL,
        "weeklyStudyHours" TEXT NOT NULL,
        "parentFullName" TEXT,
        "parentPhone" TEXT,
        "parentEmail" TEXT,
        "notes" TEXT,
        "kvkkConsent" BOOLEAN NOT NULL,
        "paymentConsent" BOOLEAN NOT NULL,
        "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
        "intakeStatus" "IntakeStatus" NOT NULL DEFAULT 'NEW',
        "adminNotes" TEXT,
        "taskLabel" TEXT,
        "nextActionAt" TIMESTAMP(3),
        "studentId" TEXT,
        "submittedAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "PurchaseIntent_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "Student" (
        "id" TEXT NOT NULL,
        "fullName" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "phoneKey" TEXT NOT NULL,
        "email" TEXT,
        "city" TEXT,
        "district" TEXT,
        "schoolName" TEXT,
        "classLevel" TEXT,
        "department" TEXT,
        "examType" TEXT,
        "currentLevel" TEXT,
        "currentNet" TEXT,
        "targetGoal" TEXT,
        "targetSchool" TEXT,
        "targetRanking" TEXT,
        "strongLessons" TEXT,
        "weakLessons" TEXT,
        "needType" TEXT,
        "studyStatus" TEXT,
        "weeklyStudyHours" TEXT,
        "parentFullName" TEXT,
        "parentPhone" TEXT,
        "parentEmail" TEXT,
        "source" TEXT,
        "activePackage" TEXT,
        "status" "StudentStatus" NOT NULL DEFAULT 'NEW',
        "notes" TEXT,
        "taskLabel" TEXT,
        "nextActionAt" TIMESTAMP(3),
        "submittedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "userId" TEXT,

        CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "PurchaseEvent" (
        "id" TEXT NOT NULL,
        "purchaseIntentId" TEXT NOT NULL,
        "eventType" "PurchaseEventType" NOT NULL,
        "status" "PurchaseStatus" NOT NULL,
        "source" TEXT NOT NULL,
        "packageName" TEXT NOT NULL,
        "paymentLink" TEXT,
        "provider" TEXT,
        "providerReference" TEXT,
        "payload" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "PurchaseEvent_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "Teacher" (
        "id" TEXT NOT NULL,
        "fullName" TEXT NOT NULL,
        "email" TEXT,
        "phone" TEXT,
        "subjects" TEXT NOT NULL,
        "bio" TEXT,
        "status" "TeacherStatus" NOT NULL DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "userId" TEXT,

        CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "Package" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "price" INTEGER NOT NULL,
        "paytrLink" TEXT,
        "lessonCount" INTEGER NOT NULL,
        "subjects" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "Camp" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "detail" TEXT NOT NULL,
        "category" "CampCategory" NOT NULL,
        "quota" INTEGER NOT NULL DEFAULT 8,
        "price" INTEGER NOT NULL DEFAULT 200000,
        "originalPrice" INTEGER NOT NULL DEFAULT 500000,
        "paytrLink" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "startDate" TIMESTAMP(3),
        "endDate" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "Camp_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "Lesson" (
        "id" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "teacherId" TEXT NOT NULL,
        "packageId" TEXT,
        "scheduledAt" TIMESTAMP(3) NOT NULL,
        "duration" INTEGER NOT NULL DEFAULT 60,
        "googleMeetLink" TEXT,
        "status" "LessonStatus" NOT NULL DEFAULT 'SCHEDULED',
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "odk_exam_series" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "cadence_family" "OdkExamCadenceFamily" NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "odk_exam_series_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "odk_exams" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "description" TEXT,
        "cadence_family" "OdkExamCadenceFamily" NOT NULL,
        "exam_series_id" TEXT,
        "status" "OdkExamStatus" NOT NULL DEFAULT 'DRAFT',
        "duration_minutes" INTEGER NOT NULL DEFAULT 120,
        "starts_at" TIMESTAMP(3),
        "ends_at" TIMESTAMP(3),
        "answer_key_released_at" TIMESTAMP(3),
        "results_released_at" TIMESTAMP(3),
        "google_meet_link" TEXT,
        "created_by_id" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "odk_exams_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "odk_exam_sections" (
        "id" TEXT NOT NULL,
        "exam_id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "question_count" INTEGER NOT NULL,
        "order_index" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "odk_exam_sections_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "odk_exam_official_answers" (
        "id" TEXT NOT NULL,
        "exam_id" TEXT NOT NULL,
        "section_id" TEXT NOT NULL,
        "question_number" INTEGER NOT NULL,
        "correct_option" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "odk_exam_official_answers_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "odk_exam_files" (
        "id" TEXT NOT NULL,
        "exam_id" TEXT NOT NULL,
        "file_type" "OdkExamFileType" NOT NULL,
        "original_file_name" TEXT NOT NULL,
        "public_url" TEXT NOT NULL,
        "byte_size" INTEGER NOT NULL DEFAULT 0,
        "uploaded_by_id" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "odk_exam_files_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "odk_access_tags" (
        "id" TEXT NOT NULL,
        "key" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "odk_access_tags_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "odk_user_access_tags" (
        "id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "access_tag_id" TEXT NOT NULL,
        "source" "OdkAccessTagGrantSource" NOT NULL DEFAULT 'MANUAL',
        "granted_by_id" TEXT,
        "entitlement_id" TEXT,
        "expires_at" TIMESTAMP(3),
        "revoked_at" TIMESTAMP(3),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "odk_user_access_tags_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "odk_exam_access_tags" (
        "exam_id" TEXT NOT NULL,
        "access_tag_id" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "odk_exam_access_tags_pkey" PRIMARY KEY ("exam_id","access_tag_id")
    );

    -- CreateTable
    CREATE TABLE "odk_packages" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "description" TEXT,
        "price_cents" INTEGER NOT NULL,
        "duration_days" INTEGER,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "odk_packages_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "odk_package_exams" (
        "package_id" TEXT NOT NULL,
        "exam_id" TEXT NOT NULL,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "odk_package_exams_pkey" PRIMARY KEY ("package_id","exam_id")
    );

    -- CreateTable
    CREATE TABLE "odk_package_access_tags" (
        "package_id" TEXT NOT NULL,
        "access_tag_id" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "odk_package_access_tags_pkey" PRIMARY KEY ("package_id","access_tag_id")
    );

    -- CreateTable
    CREATE TABLE "odk_orders" (
        "id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "package_id" TEXT NOT NULL,
        "status" "OdkOrderStatus" NOT NULL DEFAULT 'PENDING',
        "subtotal_cents" INTEGER NOT NULL,
        "discount_cents" INTEGER NOT NULL DEFAULT 0,
        "total_cents" INTEGER NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "odk_orders_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "odk_payments" (
        "id" TEXT NOT NULL,
        "order_id" TEXT NOT NULL,
        "provider" "OdkPaymentProvider" NOT NULL DEFAULT 'MANUAL',
        "provider_ref" TEXT,
        "status" "OdkPaymentStatus" NOT NULL DEFAULT 'PENDING',
        "amount_cents" INTEGER NOT NULL,
        "paid_at" TIMESTAMP(3),
        "failure_reason" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "odk_payments_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "odk_entitlements" (
        "id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "package_id" TEXT NOT NULL,
        "order_id" TEXT,
        "status" "OdkEntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
        "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expires_at" TIMESTAMP(3),
        "revoked_at" TIMESTAMP(3),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "odk_entitlements_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "odk_exam_attempts" (
        "id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "exam_id" TEXT NOT NULL,
        "entitlement_id" TEXT,
        "status" "OdkAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
        "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "submitted_at" TIMESTAMP(3),
        "score" DECIMAL(6,2),
        "correct_count" INTEGER NOT NULL DEFAULT 0,
        "wrong_count" INTEGER NOT NULL DEFAULT 0,
        "blank_count" INTEGER NOT NULL DEFAULT 0,
        "result_payload" JSONB,
        "section_scores" JSONB,
        "tab_switch_count" INTEGER NOT NULL DEFAULT 0,
        "duration_seconds" INTEGER,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "odk_exam_attempts_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "odk_attempt_optical_answers" (
        "id" TEXT NOT NULL,
        "attempt_id" TEXT NOT NULL,
        "section_id" TEXT NOT NULL,
        "question_number" INTEGER NOT NULL,
        "selected_option" TEXT NOT NULL,
        "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "odk_attempt_optical_answers_pkey" PRIMARY KEY ("id")
    );

    -- CreateIndex
    CREATE INDEX "VerificationCode_email_type_idx" ON "VerificationCode"("email", "type");

    -- CreateIndex
    CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

    -- CreateIndex
    CREATE INDEX "LeadSubmission_intakeStatus_submittedAt_idx" ON "LeadSubmission"("intakeStatus", "submittedAt");

    -- CreateIndex
    CREATE INDEX "PurchaseIntent_intakeStatus_submittedAt_idx" ON "PurchaseIntent"("intakeStatus", "submittedAt");

    -- CreateIndex
    CREATE UNIQUE INDEX "Student_phoneKey_key" ON "Student"("phoneKey");

    -- CreateIndex
    CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

    -- CreateIndex
    CREATE INDEX "Student_status_updatedAt_idx" ON "Student"("status", "updatedAt");

    -- CreateIndex
    CREATE INDEX "PurchaseEvent_purchaseIntentId_createdAt_idx" ON "PurchaseEvent"("purchaseIntentId", "createdAt");

    -- CreateIndex
    CREATE UNIQUE INDEX "Teacher_email_key" ON "Teacher"("email");

    -- CreateIndex
    CREATE UNIQUE INDEX "Teacher_userId_key" ON "Teacher"("userId");

    -- CreateIndex
    CREATE INDEX "Teacher_status_idx" ON "Teacher"("status");

    -- CreateIndex
    CREATE INDEX "Package_isActive_idx" ON "Package"("isActive");

    -- CreateIndex
    CREATE INDEX "Camp_category_isActive_idx" ON "Camp"("category", "isActive");

    -- CreateIndex
    CREATE INDEX "Lesson_studentId_scheduledAt_idx" ON "Lesson"("studentId", "scheduledAt");

    -- CreateIndex
    CREATE INDEX "Lesson_teacherId_scheduledAt_idx" ON "Lesson"("teacherId", "scheduledAt");

    -- CreateIndex
    CREATE INDEX "Lesson_status_scheduledAt_idx" ON "Lesson"("status", "scheduledAt");

    -- CreateIndex
    CREATE UNIQUE INDEX "odk_exam_series_slug_key" ON "odk_exam_series"("slug");

    -- CreateIndex
    CREATE INDEX "odk_exam_series_cadence_family_is_active_idx" ON "odk_exam_series"("cadence_family", "is_active");

    -- CreateIndex
    CREATE UNIQUE INDEX "odk_exams_slug_key" ON "odk_exams"("slug");

    -- CreateIndex
    CREATE INDEX "odk_exams_status_idx" ON "odk_exams"("status");

    -- CreateIndex
    CREATE INDEX "odk_exams_cadence_family_status_idx" ON "odk_exams"("cadence_family", "status");

    -- CreateIndex
    CREATE INDEX "odk_exam_sections_exam_id_idx" ON "odk_exam_sections"("exam_id");

    -- CreateIndex
    CREATE UNIQUE INDEX "odk_exam_sections_exam_id_order_index_key" ON "odk_exam_sections"("exam_id", "order_index");

    -- CreateIndex
    CREATE INDEX "odk_exam_official_answers_exam_id_idx" ON "odk_exam_official_answers"("exam_id");

    -- CreateIndex
    CREATE UNIQUE INDEX "odk_exam_official_answers_section_id_question_number_key" ON "odk_exam_official_answers"("section_id", "question_number");

    -- CreateIndex
    CREATE INDEX "odk_exam_files_exam_id_idx" ON "odk_exam_files"("exam_id");

    -- CreateIndex
    CREATE UNIQUE INDEX "odk_exam_files_exam_id_file_type_key" ON "odk_exam_files"("exam_id", "file_type");

    -- CreateIndex
    CREATE UNIQUE INDEX "odk_access_tags_key_key" ON "odk_access_tags"("key");

    -- CreateIndex
    CREATE INDEX "odk_access_tags_is_active_idx" ON "odk_access_tags"("is_active");

    -- CreateIndex
    CREATE INDEX "odk_user_access_tags_user_id_revoked_at_expires_at_idx" ON "odk_user_access_tags"("user_id", "revoked_at", "expires_at");

    -- CreateIndex
    CREATE INDEX "odk_user_access_tags_access_tag_id_idx" ON "odk_user_access_tags"("access_tag_id");

    -- CreateIndex
    CREATE UNIQUE INDEX "odk_user_access_tags_user_id_access_tag_id_key" ON "odk_user_access_tags"("user_id", "access_tag_id");

    -- CreateIndex
    CREATE INDEX "odk_exam_access_tags_access_tag_id_idx" ON "odk_exam_access_tags"("access_tag_id");

    -- CreateIndex
    CREATE UNIQUE INDEX "odk_packages_slug_key" ON "odk_packages"("slug");

    -- CreateIndex
    CREATE INDEX "odk_packages_is_active_idx" ON "odk_packages"("is_active");

    -- CreateIndex
    CREATE INDEX "odk_package_exams_exam_id_idx" ON "odk_package_exams"("exam_id");

    -- CreateIndex
    CREATE INDEX "odk_package_access_tags_access_tag_id_idx" ON "odk_package_access_tags"("access_tag_id");

    -- CreateIndex
    CREATE INDEX "odk_orders_user_id_status_idx" ON "odk_orders"("user_id", "status");

    -- CreateIndex
    CREATE INDEX "odk_orders_status_created_at_idx" ON "odk_orders"("status", "created_at");

    -- CreateIndex
    CREATE INDEX "odk_payments_order_id_idx" ON "odk_payments"("order_id");

    -- CreateIndex
    CREATE INDEX "odk_payments_status_created_at_idx" ON "odk_payments"("status", "created_at");

    -- CreateIndex
    CREATE UNIQUE INDEX "odk_entitlements_order_id_key" ON "odk_entitlements"("order_id");

    -- CreateIndex
    CREATE INDEX "odk_entitlements_user_id_status_idx" ON "odk_entitlements"("user_id", "status");

    -- CreateIndex
    CREATE INDEX "odk_exam_attempts_user_id_exam_id_idx" ON "odk_exam_attempts"("user_id", "exam_id");

    -- CreateIndex
    CREATE INDEX "odk_exam_attempts_user_id_status_idx" ON "odk_exam_attempts"("user_id", "status");

    -- CreateIndex
    CREATE INDEX "odk_attempt_optical_answers_attempt_id_idx" ON "odk_attempt_optical_answers"("attempt_id");

    -- CreateIndex
    CREATE UNIQUE INDEX "odk_attempt_optical_answers_attempt_id_section_id_question__key" ON "odk_attempt_optical_answers"("attempt_id", "section_id", "question_number");

    -- AddForeignKey
    ALTER TABLE "LeadSubmission" ADD CONSTRAINT "LeadSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "PurchaseIntent" ADD CONSTRAINT "PurchaseIntent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "PurchaseEvent" ADD CONSTRAINT "PurchaseEvent_purchaseIntentId_fkey" FOREIGN KEY ("purchaseIntentId") REFERENCES "PurchaseIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_exams" ADD CONSTRAINT "odk_exams_exam_series_id_fkey" FOREIGN KEY ("exam_series_id") REFERENCES "odk_exam_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_exams" ADD CONSTRAINT "odk_exams_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_exam_sections" ADD CONSTRAINT "odk_exam_sections_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "odk_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_exam_official_answers" ADD CONSTRAINT "odk_exam_official_answers_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "odk_exam_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_exam_files" ADD CONSTRAINT "odk_exam_files_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "odk_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_user_access_tags" ADD CONSTRAINT "odk_user_access_tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_user_access_tags" ADD CONSTRAINT "odk_user_access_tags_access_tag_id_fkey" FOREIGN KEY ("access_tag_id") REFERENCES "odk_access_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_user_access_tags" ADD CONSTRAINT "odk_user_access_tags_entitlement_id_fkey" FOREIGN KEY ("entitlement_id") REFERENCES "odk_entitlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_exam_access_tags" ADD CONSTRAINT "odk_exam_access_tags_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "odk_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_exam_access_tags" ADD CONSTRAINT "odk_exam_access_tags_access_tag_id_fkey" FOREIGN KEY ("access_tag_id") REFERENCES "odk_access_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_package_exams" ADD CONSTRAINT "odk_package_exams_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "odk_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_package_exams" ADD CONSTRAINT "odk_package_exams_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "odk_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_package_access_tags" ADD CONSTRAINT "odk_package_access_tags_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "odk_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_package_access_tags" ADD CONSTRAINT "odk_package_access_tags_access_tag_id_fkey" FOREIGN KEY ("access_tag_id") REFERENCES "odk_access_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_orders" ADD CONSTRAINT "odk_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_orders" ADD CONSTRAINT "odk_orders_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "odk_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_payments" ADD CONSTRAINT "odk_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "odk_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_entitlements" ADD CONSTRAINT "odk_entitlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_entitlements" ADD CONSTRAINT "odk_entitlements_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "odk_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_entitlements" ADD CONSTRAINT "odk_entitlements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "odk_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_exam_attempts" ADD CONSTRAINT "odk_exam_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_exam_attempts" ADD CONSTRAINT "odk_exam_attempts_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "odk_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_exam_attempts" ADD CONSTRAINT "odk_exam_attempts_entitlement_id_fkey" FOREIGN KEY ("entitlement_id") REFERENCES "odk_entitlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_attempt_optical_answers" ADD CONSTRAINT "odk_attempt_optical_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "odk_exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "odk_attempt_optical_answers" ADD CONSTRAINT "odk_attempt_optical_answers_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "odk_exam_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$fresh_database_bootstrap$;
