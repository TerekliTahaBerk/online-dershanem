-- KPSS Görev 4: ProductMembership → Product registry köprüsü + ürün içerik rolleri.
--
-- 0103 `product_ref_id` kolonunu ekleyip bir kez backfill etmişti; ancak uygulama
-- kodu yeni satırlarda bu kolonu yazmadığı için 0103 sonrası açılan üyelikler NULL
-- kalıyordu. Registry'den gelen ürünler (KPSS) `ProductCode` enum'unda olmadığı
-- için `product` kolonu da NULL olabilmelidir.
--
-- Bu migration:
--   1. `product`'ı nullable yapar,
--   2. NULL kalmış `product_ref_id` değerlerini yeniden backfill eder,
--   3. iki kolonu her INSERT/UPDATE'te senkron tutan trigger kurar (legacy yazma
--      yolları değişmeden doğru `product_ref_id` üretir; registry'deki legacy kod
--      `product_ref_id` ile yazılırsa `product` doldurulur, böylece
--      (user_id, product) benzersizliği atlatılamaz),
--   4. `product_ref_id`'yi CHECK ile zorunlu kılar,
--   5. (user_id, product_ref_id) benzersizliğini ekler,
--   6. tutarsız satır kalırsa migration'ı durdurur.
-- Veri silmez; mevcut OD/OK/ODK erişim davranışını değiştirmez.

-- CreateEnum
CREATE TYPE "ProductContentRole" AS ENUM ('CONTENT_EDITOR');

-- AlterTable
ALTER TABLE "product_memberships" ALTER COLUMN "product" DROP NOT NULL;

-- CreateTable
CREATE TABLE "product_content_role_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "role" "ProductContentRole" NOT NULL,
    "granted_by_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "product_content_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_content_role_assignments_product_id_revoked_at_idx" ON "product_content_role_assignments"("product_id", "revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "product_content_role_assignments_user_id_product_id_role_key" ON "product_content_role_assignments"("user_id", "product_id", "role");


-- AddForeignKey
ALTER TABLE "product_content_role_assignments" ADD CONSTRAINT "product_content_role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_content_role_assignments" ADD CONSTRAINT "product_content_role_assignments_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_content_role_assignments" ADD CONSTRAINT "product_content_role_assignments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Backfill: 0103 sonrası yazılmış legacy satırlar.
UPDATE "product_memberships" source SET "product_ref_id" = registry."id"
FROM "products" registry
WHERE source."product" IS NOT NULL
  AND registry."code" = source."product"::text
  AND source."product_ref_id" IS DISTINCT FROM registry."id";

CREATE OR REPLACE FUNCTION "product_memberships_sync_product_ref"() RETURNS trigger AS $$
DECLARE
  registry_id TEXT;
  registry_code TEXT;
BEGIN
  IF NEW."product" IS NOT NULL THEN
    SELECT "id" INTO registry_id FROM "products" WHERE "code" = NEW."product"::text;
    IF registry_id IS NULL THEN
      RAISE EXCEPTION 'product_memberships: registry row missing for product %', NEW."product";
    END IF;
    IF NEW."product_ref_id" IS NOT NULL
       AND NEW."product_ref_id" <> registry_id
       AND (TG_OP = 'INSERT' OR NEW."product_ref_id" IS DISTINCT FROM OLD."product_ref_id") THEN
      RAISE EXCEPTION 'product_memberships: product % does not match product_ref_id %', NEW."product", NEW."product_ref_id";
    END IF;
    NEW."product_ref_id" := registry_id;
  ELSIF NEW."product_ref_id" IS NOT NULL THEN
    SELECT "code" INTO registry_code FROM "products" WHERE "id" = NEW."product_ref_id";
    IF registry_code = ANY (enum_range(NULL::"ProductCode")::text[]) THEN
      NEW."product" := registry_code::"ProductCode";
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "product_memberships_sync_product_ref" ON "product_memberships";
CREATE TRIGGER "product_memberships_sync_product_ref"
  BEFORE INSERT OR UPDATE OF "product", "product_ref_id" ON "product_memberships"
  FOR EACH ROW EXECUTE FUNCTION "product_memberships_sync_product_ref"();

ALTER TABLE "product_memberships"
  ADD CONSTRAINT "product_memberships_product_ref_required" CHECK ("product_ref_id" IS NOT NULL) NOT VALID;
ALTER TABLE "product_memberships" VALIDATE CONSTRAINT "product_memberships_product_ref_required";

-- CreateIndex
CREATE UNIQUE INDEX "product_memberships_user_id_product_ref_id_key" ON "product_memberships"("user_id", "product_ref_id");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "product_memberships" s
    LEFT JOIN "products" r ON r."id" = s."product_ref_id"
    WHERE r."id" IS NULL
       OR (s."product" IS NOT NULL AND r."code" <> s."product"::text)
       OR (s."product" IS NULL AND r."code" = ANY (enum_range(NULL::"ProductCode")::text[]))
  ) THEN
    RAISE EXCEPTION 'product_memberships registry bridge left inconsistent rows';
  END IF;
END $$;
