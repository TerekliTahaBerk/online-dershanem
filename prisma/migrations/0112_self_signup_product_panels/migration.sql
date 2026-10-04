-- Kendi kendine kayıt (Öğrenci/Veli), Tally iletişim formu, veli adına bekleyen
-- çocuklar ve oturum bazlı ürün paneli seçimi. Kayıt ürün erişimi VERMEZ.
-- CreateEnum
CREATE TYPE "RegistrationSource" AS ENUM ('ADMIN_INVITE', 'SELF_SIGNUP', 'PURCHASE');

-- CreateEnum
CREATE TYPE "SignupHeardFrom" AS ENUM ('INSTAGRAM', 'GOOGLE', 'YOUTUBE', 'FRIEND', 'SCHOOL', 'OTHER');

-- CreateEnum
CREATE TYPE "SignupPurchaseStatus" AS ENUM ('ALREADY_PURCHASED', 'WANTS_TO_PURCHASE', 'EXPLORING');

-- CreateEnum
CREATE TYPE "ContactChannel" AS ENUM ('PHONE', 'WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "ContactTimePreference" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'ANY');

-- CreateEnum
CREATE TYPE "SignupContactStatus" AS ENUM ('NEW', 'CONTACTED', 'UNREACHABLE', 'CONVERTED', 'NOT_INTERESTED');

-- CreateEnum
CREATE TYPE "PendingChildStatus" AS ENUM ('PENDING', 'ACCOUNT_CREATED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadSource" ADD VALUE 'SELF_SIGNUP';
ALTER TYPE "LeadSource" ADD VALUE 'TALLY_FORM';

-- AlterTable
ALTER TABLE "od_orders" ADD COLUMN     "buyer_user_id" TEXT,
ADD COLUMN     "pending_child_id" TEXT;

-- AlterTable
ALTER TABLE "odk_orders" ADD COLUMN     "buyer_user_id" TEXT,
ADD COLUMN     "pending_child_id" TEXT;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "active_product" "ProductCode";

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "field_track" TEXT,
ADD COLUMN     "school_type" TEXT,
ADD COLUMN     "weak_subjects" TEXT[],
ADD COLUMN     "weekly_study_hours" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "contact_form_skipped_at" TIMESTAMPTZ(3),
ADD COLUMN     "contact_form_submitted_at" TIMESTAMPTZ(3),
ADD COLUMN     "kvkk_accepted_at" TIMESTAMPTZ(3),
ADD COLUMN     "kvkk_version" TEXT,
ADD COLUMN     "marketing_consent_at" TIMESTAMPTZ(3),
ADD COLUMN     "profile_completed_at" TIMESTAMPTZ(3),
ADD COLUMN     "registration_source" "RegistrationSource" NOT NULL DEFAULT 'ADMIN_INVITE',
ADD COLUMN     "terms_accepted_at" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "signup_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "city" TEXT,
    "district" TEXT,
    "heard_from" "SignupHeardFrom",
    "interested_products" "ProductCode"[],
    "purchase_status" "SignupPurchaseStatus" NOT NULL DEFAULT 'EXPLORING',
    "existing_order_ref" TEXT,
    "preferred_channel" "ContactChannel" NOT NULL DEFAULT 'PHONE',
    "preferred_contact_time" "ContactTimePreference" NOT NULL DEFAULT 'ANY',
    "note" TEXT,
    "guardian_name" TEXT,
    "guardian_phone" TEXT,
    "guardian_email" TEXT,
    "relationship" TEXT,
    "billing_address" TEXT,
    "contact_status" "SignupContactStatus" NOT NULL DEFAULT 'NEW',
    "contact_note" TEXT,
    "contacted_at" TIMESTAMPTZ(3),
    "contacted_by_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "signup_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_children" (
    "id" TEXT NOT NULL,
    "parent_user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "class_level" TEXT,
    "school_name" TEXT,
    "exam_type" TEXT,
    "field_track" TEXT,
    "birth_year" INTEGER,
    "email" TEXT,
    "phone" TEXT,
    "relationship" TEXT,
    "status" "PendingChildStatus" NOT NULL DEFAULT 'PENDING',
    "student_profile_id" TEXT,
    "resolved_by_id" TEXT,
    "resolved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "pending_children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_form_submissions" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'TALLY',
    "external_response_id" TEXT NOT NULL,
    "form_id" TEXT,
    "user_id" TEXT,
    "email" TEXT,
    "payload" JSONB NOT NULL,
    "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "signup_profiles_user_id_key" ON "signup_profiles"("user_id");

-- CreateIndex
CREATE INDEX "signup_profiles_contact_status_created_at_idx" ON "signup_profiles"("contact_status", "created_at");

-- CreateIndex
CREATE INDEX "pending_children_status_created_at_idx" ON "pending_children"("status", "created_at");

-- CreateIndex
CREATE INDEX "pending_children_parent_user_id_status_idx" ON "pending_children"("parent_user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "contact_form_submissions_external_response_id_key" ON "contact_form_submissions"("external_response_id");

-- CreateIndex
CREATE INDEX "contact_form_submissions_user_id_received_at_idx" ON "contact_form_submissions"("user_id", "received_at");

-- CreateIndex
CREATE INDEX "od_orders_buyer_user_id_created_at_idx" ON "od_orders"("buyer_user_id", "created_at");

-- CreateIndex
CREATE INDEX "od_orders_pending_child_id_idx" ON "od_orders"("pending_child_id");

-- CreateIndex
CREATE INDEX "odk_orders_buyer_user_id_created_at_idx" ON "odk_orders"("buyer_user_id", "created_at");

-- CreateIndex
CREATE INDEX "odk_orders_pending_child_id_idx" ON "odk_orders"("pending_child_id");

-- AddForeignKey
ALTER TABLE "odk_orders" ADD CONSTRAINT "odk_orders_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "odk_orders" ADD CONSTRAINT "odk_orders_pending_child_id_fkey" FOREIGN KEY ("pending_child_id") REFERENCES "pending_children"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "od_orders" ADD CONSTRAINT "od_orders_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "od_orders" ADD CONSTRAINT "od_orders_pending_child_id_fkey" FOREIGN KEY ("pending_child_id") REFERENCES "pending_children"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signup_profiles" ADD CONSTRAINT "signup_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signup_profiles" ADD CONSTRAINT "signup_profiles_contacted_by_id_fkey" FOREIGN KEY ("contacted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_children" ADD CONSTRAINT "pending_children_parent_user_id_fkey" FOREIGN KEY ("parent_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_children" ADD CONSTRAINT "pending_children_student_profile_id_fkey" FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_children" ADD CONSTRAINT "pending_children_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_form_submissions" ADD CONSTRAINT "contact_form_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: ödeme sonrası provisioning'in açtığı (admin tarafından açılmamış ve
-- bir siparişe bağlı) hesaplar PURCHASE olarak işaretlenir. Geri kalanlar
-- varsayılan ADMIN_INVITE kalır.
UPDATE "users" u
SET "registration_source" = 'PURCHASE'
WHERE u."created_by_id" IS NULL
  AND u."role" IN ('STUDENT', 'PARENT')
  AND (
    EXISTS (SELECT 1 FROM "od_orders" o WHERE o."user_id" = u."id")
    OR EXISTS (SELECT 1 FROM "odk_orders" k WHERE k."student_user_id" = u."id")
  );
