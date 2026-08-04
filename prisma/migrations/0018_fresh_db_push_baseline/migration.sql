-- Historical schema additions were made with prisma db push before migration 0019.
-- Recreate only those missing objects in genuinely fresh databases. Existing production
-- databases already have the modern users table, so this migration is a no-op there.
DO $fresh_db_push_baseline$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    -- CreateEnum
    CREATE TYPE "EnrollmentStatus" AS ENUM ('LEAD', 'TRIAL', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

    -- CreateEnum
    CREATE TYPE "EnrollmentSource" AS ENUM ('MANUAL', 'PURCHASE', 'TRIAL', 'CAMP', 'SCHOLARSHIP');

    -- CreateEnum
    CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

    -- CreateEnum
    CREATE TYPE "ContentType" AS ENUM ('LIVE_SESSION', 'VIDEO', 'NOTE', 'PDF', 'QUIZ', 'ASSIGNMENT', 'LINK');

    -- CreateEnum
    CREATE TYPE "StudentContentProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

    -- CreateEnum
    CREATE TYPE "StudentGoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'MISSED', 'ARCHIVED');

    -- CreateEnum
    CREATE TYPE "AssessmentType" AS ENUM ('DENEME', 'QUIZ', 'HOMEWORK', 'MOCK_INTERVIEW');

    -- CreateEnum
    CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'LESSON', 'CONTENT', 'PAYMENT', 'PERFORMANCE', 'ANNOUNCEMENT');

    -- CreateEnum
    CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

    -- CreateEnum
    CREATE TYPE "MetricPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

    -- CreateEnum
    CREATE TYPE "AuditActorType" AS ENUM ('SYSTEM', 'USER');

    -- CreateEnum
    CREATE TYPE "MobilePlatform" AS ENUM ('IOS', 'ANDROID', 'WEB');

    -- CreateEnum
    CREATE TYPE "NotificationChannel" AS ENUM ('PUSH', 'INBOX', 'EMAIL');

    -- CreateEnum
    CREATE TYPE "NotificationCategoryKey" AS ENUM ('LESSON', 'ASSIGNMENT', 'EXAM', 'ANNOUNCEMENT', 'TEACHER_MESSAGE', 'ATTENDANCE', 'PAYMENT', 'SYSTEM');

    -- CreateEnum
    CREATE TYPE "DailyTaskSource" AS ENUM ('ASSIGNMENT', 'LESSON', 'EXAM', 'GOAL', 'MANUAL');

    -- AlterTable
    ALTER TABLE "User" ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3);

    -- AlterTable
    ALTER TABLE "odk_exam_official_answers" ADD COLUMN     "outcomes" JSONB;

    -- AlterTable
    ALTER TABLE "odk_packages" ADD COLUMN     "original_price_cents" INTEGER;

    -- CreateTable
    CREATE TABLE "StudentPackageEnrollment" (
        "id" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "packageId" TEXT NOT NULL,
        "source" "EnrollmentSource" NOT NULL DEFAULT 'MANUAL',
        "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
        "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "endsAt" TIMESTAMP(3),
        "autoRenew" BOOLEAN NOT NULL DEFAULT false,
        "listPrice" INTEGER,
        "discountAmount" INTEGER,
        "billingPeriodLabel" TEXT,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "StudentPackageEnrollment_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "Course" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "description" TEXT,
        "subject" TEXT NOT NULL,
        "examType" TEXT,
        "levelLabel" TEXT,
        "estimatedMinutes" INTEGER,
        "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
        "coverImageUrl" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "CourseModule" (
        "id" TEXT NOT NULL,
        "courseId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "orderIndex" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "CourseModule_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "CourseContent" (
        "id" TEXT NOT NULL,
        "moduleId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "contentType" "ContentType" NOT NULL,
        "orderIndex" INTEGER NOT NULL DEFAULT 0,
        "durationMinutes" INTEGER,
        "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
        "liveStartsAt" TIMESTAMP(3),
        "liveEndsAt" TIMESTAMP(3),
        "videoUrl" TEXT,
        "fileUrl" TEXT,
        "externalUrl" TEXT,
        "createdById" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "CourseContent_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "PackageCourse" (
        "packageId" TEXT NOT NULL,
        "courseId" TEXT NOT NULL,
        "isRequired" BOOLEAN NOT NULL DEFAULT true,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "PackageCourse_pkey" PRIMARY KEY ("packageId","courseId")
    );

    -- CreateTable
    CREATE TABLE "StudentCourseProgress" (
        "id" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "courseId" TEXT NOT NULL,
        "enrollmentId" TEXT,
        "completionPercent" INTEGER NOT NULL DEFAULT 0,
        "completedContent" INTEGER NOT NULL DEFAULT 0,
        "totalContent" INTEGER NOT NULL DEFAULT 0,
        "lastOpenedAt" TIMESTAMP(3),
        "completedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "StudentCourseProgress_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "StudentContentProgress" (
        "id" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "contentId" TEXT NOT NULL,
        "status" "StudentContentProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
        "completionPercent" INTEGER NOT NULL DEFAULT 0,
        "secondsSpent" INTEGER NOT NULL DEFAULT 0,
        "lastOpenedAt" TIMESTAMP(3),
        "completedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "StudentContentProgress_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "StudentGoal" (
        "id" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "unit" TEXT,
        "targetValue" DECIMAL(8,2),
        "currentValue" DECIMAL(8,2),
        "dueAt" TIMESTAMP(3),
        "status" "StudentGoalStatus" NOT NULL DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "StudentGoal_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "StudentExamResult" (
        "id" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "assessmentType" "AssessmentType" NOT NULL DEFAULT 'DENEME',
        "examType" TEXT,
        "title" TEXT NOT NULL,
        "takenAt" TIMESTAMP(3) NOT NULL,
        "score" DECIMAL(6,2),
        "net" DECIMAL(6,2),
        "correctCount" INTEGER NOT NULL DEFAULT 0,
        "wrongCount" INTEGER NOT NULL DEFAULT 0,
        "blankCount" INTEGER NOT NULL DEFAULT 0,
        "ranking" INTEGER,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "StudentExamResult_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "StudentExamSubjectStat" (
        "id" TEXT NOT NULL,
        "examResultId" TEXT NOT NULL,
        "subject" TEXT NOT NULL,
        "correctCount" INTEGER NOT NULL DEFAULT 0,
        "wrongCount" INTEGER NOT NULL DEFAULT 0,
        "blankCount" INTEGER NOT NULL DEFAULT 0,
        "net" DECIMAL(6,2),
        "maxNet" DECIMAL(6,2),
        "trendDelta" DECIMAL(6,2),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "StudentExamSubjectStat_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "StudentExamTopicStat" (
        "id" TEXT NOT NULL,
        "subjectStatId" TEXT NOT NULL,
        "topic" TEXT NOT NULL,
        "correctCount" INTEGER NOT NULL DEFAULT 0,
        "wrongCount" INTEGER NOT NULL DEFAULT 0,
        "blankCount" INTEGER NOT NULL DEFAULT 0,
        "net" DECIMAL(6,2),
        "masteryPct" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "StudentExamTopicStat_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "StudentMetricSnapshot" (
        "id" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "metricKey" TEXT NOT NULL,
        "value" DECIMAL(8,2) NOT NULL,
        "unit" TEXT,
        "period" "MetricPeriod" NOT NULL,
        "startsAt" TIMESTAMP(3) NOT NULL,
        "endsAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "StudentMetricSnapshot_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "Notification" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
        "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
        "title" TEXT NOT NULL,
        "body" TEXT NOT NULL,
        "href" TEXT,
        "readAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "AuditLog" (
        "id" TEXT NOT NULL,
        "actorUserId" TEXT,
        "actorType" "AuditActorType" NOT NULL DEFAULT 'USER',
        "entityType" TEXT NOT NULL,
        "entityId" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "summary" TEXT,
        "payload" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "mobile_devices" (
        "id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "expo_push_token" TEXT NOT NULL,
        "platform" "MobilePlatform" NOT NULL,
        "app_version" TEXT NOT NULL,
        "device_model" TEXT,
        "os_version" TEXT,
        "locale" TEXT,
        "timezone" TEXT,
        "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "revoked_at" TIMESTAMP(3),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "mobile_devices_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "notification_preferences" (
        "id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "category" "NotificationCategoryKey" NOT NULL,
        "channel" "NotificationChannel" NOT NULL,
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "student_daily_tasks" (
        "id" TEXT NOT NULL,
        "student_id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "source_type" "DailyTaskSource" NOT NULL,
        "source_id" TEXT,
        "due_at" TIMESTAMP(3),
        "is_done" BOOLEAN NOT NULL DEFAULT false,
        "done_at" TIMESTAMP(3),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "student_daily_tasks_pkey" PRIMARY KEY ("id")
    );

    -- CreateTable
    CREATE TABLE "app_activity_logs" (
        "id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "payload" JSONB,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "app_activity_logs_pkey" PRIMARY KEY ("id")
    );

    -- CreateIndex
    CREATE INDEX "StudentPackageEnrollment_studentId_status_idx" ON "StudentPackageEnrollment"("studentId", "status");

    -- CreateIndex
    CREATE INDEX "StudentPackageEnrollment_packageId_status_idx" ON "StudentPackageEnrollment"("packageId", "status");

    -- CreateIndex
    CREATE INDEX "StudentPackageEnrollment_startsAt_endsAt_idx" ON "StudentPackageEnrollment"("startsAt", "endsAt");

    -- CreateIndex
    CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

    -- CreateIndex
    CREATE INDEX "Course_status_subject_idx" ON "Course"("status", "subject");

    -- CreateIndex
    CREATE INDEX "CourseModule_courseId_idx" ON "CourseModule"("courseId");

    -- CreateIndex
    CREATE UNIQUE INDEX "CourseModule_courseId_orderIndex_key" ON "CourseModule"("courseId", "orderIndex");

    -- CreateIndex
    CREATE INDEX "CourseContent_moduleId_status_idx" ON "CourseContent"("moduleId", "status");

    -- CreateIndex
    CREATE UNIQUE INDEX "CourseContent_moduleId_orderIndex_key" ON "CourseContent"("moduleId", "orderIndex");

    -- CreateIndex
    CREATE INDEX "PackageCourse_courseId_idx" ON "PackageCourse"("courseId");

    -- CreateIndex
    CREATE INDEX "StudentCourseProgress_enrollmentId_idx" ON "StudentCourseProgress"("enrollmentId");

    -- CreateIndex
    CREATE INDEX "StudentCourseProgress_studentId_completionPercent_idx" ON "StudentCourseProgress"("studentId", "completionPercent");

    -- CreateIndex
    CREATE UNIQUE INDEX "StudentCourseProgress_studentId_courseId_key" ON "StudentCourseProgress"("studentId", "courseId");

    -- CreateIndex
    CREATE INDEX "StudentContentProgress_studentId_status_idx" ON "StudentContentProgress"("studentId", "status");

    -- CreateIndex
    CREATE INDEX "StudentContentProgress_contentId_idx" ON "StudentContentProgress"("contentId");

    -- CreateIndex
    CREATE UNIQUE INDEX "StudentContentProgress_studentId_contentId_key" ON "StudentContentProgress"("studentId", "contentId");

    -- CreateIndex
    CREATE INDEX "StudentGoal_studentId_status_idx" ON "StudentGoal"("studentId", "status");

    -- CreateIndex
    CREATE INDEX "StudentGoal_dueAt_idx" ON "StudentGoal"("dueAt");

    -- CreateIndex
    CREATE INDEX "StudentExamResult_studentId_takenAt_idx" ON "StudentExamResult"("studentId", "takenAt");

    -- CreateIndex
    CREATE INDEX "StudentExamResult_assessmentType_examType_idx" ON "StudentExamResult"("assessmentType", "examType");

    -- CreateIndex
    CREATE INDEX "StudentExamSubjectStat_subject_idx" ON "StudentExamSubjectStat"("subject");

    -- CreateIndex
    CREATE UNIQUE INDEX "StudentExamSubjectStat_examResultId_subject_key" ON "StudentExamSubjectStat"("examResultId", "subject");

    -- CreateIndex
    CREATE INDEX "StudentExamTopicStat_topic_idx" ON "StudentExamTopicStat"("topic");

    -- CreateIndex
    CREATE UNIQUE INDEX "StudentExamTopicStat_subjectStatId_topic_key" ON "StudentExamTopicStat"("subjectStatId", "topic");

    -- CreateIndex
    CREATE INDEX "StudentMetricSnapshot_studentId_metricKey_period_idx" ON "StudentMetricSnapshot"("studentId", "metricKey", "period");

    -- CreateIndex
    CREATE INDEX "StudentMetricSnapshot_startsAt_endsAt_idx" ON "StudentMetricSnapshot"("startsAt", "endsAt");

    -- CreateIndex
    CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

    -- CreateIndex
    CREATE INDEX "Notification_type_priority_idx" ON "Notification"("type", "priority");

    -- CreateIndex
    CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

    -- CreateIndex
    CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

    -- CreateIndex
    CREATE UNIQUE INDEX "mobile_devices_expo_push_token_key" ON "mobile_devices"("expo_push_token");

    -- CreateIndex
    CREATE INDEX "mobile_devices_user_id_revoked_at_idx" ON "mobile_devices"("user_id", "revoked_at");

    -- CreateIndex
    CREATE INDEX "mobile_devices_last_seen_at_idx" ON "mobile_devices"("last_seen_at");

    -- CreateIndex
    CREATE INDEX "notification_preferences_user_id_idx" ON "notification_preferences"("user_id");

    -- CreateIndex
    CREATE UNIQUE INDEX "notification_preferences_user_id_category_channel_key" ON "notification_preferences"("user_id", "category", "channel");

    -- CreateIndex
    CREATE INDEX "student_daily_tasks_student_id_due_at_idx" ON "student_daily_tasks"("student_id", "due_at");

    -- CreateIndex
    CREATE INDEX "student_daily_tasks_student_id_is_done_idx" ON "student_daily_tasks"("student_id", "is_done");

    -- CreateIndex
    CREATE INDEX "app_activity_logs_user_id_created_at_idx" ON "app_activity_logs"("user_id", "created_at");

    -- AddForeignKey
    ALTER TABLE "StudentPackageEnrollment" ADD CONSTRAINT "StudentPackageEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "StudentPackageEnrollment" ADD CONSTRAINT "StudentPackageEnrollment_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "CourseModule" ADD CONSTRAINT "CourseModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "CourseContent" ADD CONSTRAINT "CourseContent_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "CourseContent" ADD CONSTRAINT "CourseContent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "PackageCourse" ADD CONSTRAINT "PackageCourse_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "PackageCourse" ADD CONSTRAINT "PackageCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "StudentCourseProgress" ADD CONSTRAINT "StudentCourseProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "StudentCourseProgress" ADD CONSTRAINT "StudentCourseProgress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "StudentCourseProgress" ADD CONSTRAINT "StudentCourseProgress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "StudentPackageEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "StudentContentProgress" ADD CONSTRAINT "StudentContentProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "StudentContentProgress" ADD CONSTRAINT "StudentContentProgress_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "CourseContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "StudentGoal" ADD CONSTRAINT "StudentGoal_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "StudentExamResult" ADD CONSTRAINT "StudentExamResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "StudentExamSubjectStat" ADD CONSTRAINT "StudentExamSubjectStat_examResultId_fkey" FOREIGN KEY ("examResultId") REFERENCES "StudentExamResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "StudentExamTopicStat" ADD CONSTRAINT "StudentExamTopicStat_subjectStatId_fkey" FOREIGN KEY ("subjectStatId") REFERENCES "StudentExamSubjectStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "StudentMetricSnapshot" ADD CONSTRAINT "StudentMetricSnapshot_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "mobile_devices" ADD CONSTRAINT "mobile_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "student_daily_tasks" ADD CONSTRAINT "student_daily_tasks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "app_activity_logs" ADD CONSTRAINT "app_activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$fresh_db_push_baseline$;
