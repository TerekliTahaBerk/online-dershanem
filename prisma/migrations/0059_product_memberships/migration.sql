CREATE TYPE "ProductCode" AS ENUM ('OD', 'ODK');
CREATE TYPE "ProductAccessSource" AS ENUM ('MANUAL', 'PURCHASE', 'STAFF', 'PROMOTION', 'LEGACY_BACKFILL');

CREATE TABLE "product_memberships" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "product" "ProductCode" NOT NULL,
  "source" "ProductAccessSource" NOT NULL DEFAULT 'MANUAL',
  "granted_by_id" TEXT,
  "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_memberships_user_id_product_key" ON "product_memberships"("user_id", "product");
CREATE INDEX "product_memberships_product_revoked_at_expires_at_idx" ON "product_memberships"("product", "revoked_at", "expires_at");
CREATE INDEX "product_memberships_granted_by_id_created_at_idx" ON "product_memberships"("granted_by_id", "created_at");

ALTER TABLE "product_memberships"
  ADD CONSTRAINT "product_memberships_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_memberships"
  ADD CONSTRAINT "product_memberships_granted_by_id_fkey"
  FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Mevcut panel kullanıcılarının OD erişimini koru.
INSERT INTO "product_memberships" ("id", "user_id", "product", "source", "updated_at")
SELECT 'pm_od_' || "id", "id", 'OD', 'LEGACY_BACKFILL', CURRENT_TIMESTAMP
FROM "users";

-- Personel iki üründe de çalışır; ürün seçici bu iki üyeliği gösterir.
INSERT INTO "product_memberships" ("id", "user_id", "product", "source", "updated_at")
SELECT 'pm_odk_' || "id", "id", 'ODK', 'STAFF', CURRENT_TIMESTAMP
FROM "users"
WHERE "role" IN ('ADMIN', 'TEACHER');
