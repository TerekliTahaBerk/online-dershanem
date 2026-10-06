-- Phase 1 — ürün başına personel sorumluluğu (ProductStaffAssignment).
--
-- Platform rolü (UserRole) DEĞİŞMEZ. Satırlar geçmişi korur: iptal satırı
-- kapatır (revoked_at), yeniden verme yeni satır açar. Hiçbir satır silinmez.
-- Bu migration hiçbir mevcut erişimi değiştirmez; geri doldurma ayrı ve
-- açık bir adımdır (scripts/backfill-product-staff-assignments.mjs).

-- CreateEnum
CREATE TYPE "ProductStaffRole" AS ENUM ('TEACHER', 'COACH', 'EXAM_EDITOR', 'EXAM_OPERATOR', 'RESULT_PUBLISHER', 'REPORT_VIEWER', 'PRODUCT_MANAGER');

-- CreateEnum
CREATE TYPE "ProductStaffAssignmentSource" AS ENUM ('MANUAL', 'LEGACY_BACKFILL');

-- CreateTable
CREATE TABLE "product_staff_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "role" "ProductStaffRole" NOT NULL,
    "source" "ProductStaffAssignmentSource" NOT NULL DEFAULT 'MANUAL',
    "granted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "granted_by_id" TEXT,
    "grant_reason" TEXT,
    "revoked_at" TIMESTAMPTZ(3),
    "revoked_by_id" TEXT,
    "revoke_reason" TEXT,

    CONSTRAINT "product_staff_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_staff_assignments_user_id_revoked_at_idx" ON "product_staff_assignments"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "product_staff_assignments_product_id_role_revoked_at_idx" ON "product_staff_assignments"("product_id", "role", "revoked_at");

-- AddForeignKey
ALTER TABLE "product_staff_assignments" ADD CONSTRAINT "product_staff_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_staff_assignments" ADD CONSTRAINT "product_staff_assignments_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_staff_assignments" ADD CONSTRAINT "product_staff_assignments_revoked_by_id_fkey" FOREIGN KEY ("revoked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_staff_assignments" ADD CONSTRAINT "product_staff_assignments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- En fazla bir AKTİF satır / (kullanıcı, ürün, rol). Prisma kısmi tekil indeksi
-- ifade edemez; `prisma db push` bunu OLUŞTURMAZ (bkz. coach_assignments_one_active_per_student, 0083).
CREATE UNIQUE INDEX "product_staff_assignments_one_active"
  ON "product_staff_assignments" ("user_id", "product_id", "role")
  WHERE "revoked_at" IS NULL;
