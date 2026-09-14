-- KPSS Görev 6: haftalık plan motorunun ürün kimliği + ürün-bazlı onay politikası.
--
-- SORUN: `weekly_plans` hiçbir yerde hangi ürüne ait olduğunu tutmuyordu; bu bilgi
-- yalnız `app/api/panel/adaptive-plan/**` içindeki sabit `requireApiProductRole("OK", …)`
-- çağrılarından geliyordu. Bir plan satırına bakıp ürününü söylemek mümkün değildi ve
-- KPSS gibi öğretmensiz bir ürün için onay akışını dallandırmanın veri temeli yoktu.
--
-- Bu migration:
--   1. `products.requires_plan_approval` ekler (varsayılan TRUE = mevcut OK davranışı),
--   2. `weekly_plans.product_ref_id` ekler ve MEVCUT TÜM satırları "OK" ürününe backfill eder,
--   3. `weekly_plans.auto_approved` ekler (sistemce onaylanan planın işareti),
--   4. kolonu NOT NULL + FK yapar ve backfill'i doğrular.
--
-- Veri SİLMEZ. Mevcut OK planlarının onay davranışı değişmez: `requires_plan_approval`
-- tüm mevcut ürünlerde TRUE kalır, hiçbir plan `auto_approved` işaretlenmez.

-- 1. Ürün başına plan onayı politikası. Varsayılan TRUE: mevcut ürünlerin
--    (OD/OK/ODK ve halihazırda yazılmış KPSS satırı) davranışı değişmez.
ALTER TABLE "products" ADD COLUMN "requires_plan_approval" BOOLEAN NOT NULL DEFAULT true;

-- 2. Plan → ürün kimliği. Önce nullable eklenir, backfill sonrası NOT NULL yapılır.
ALTER TABLE "weekly_plans" ADD COLUMN "product_ref_id" TEXT;
ALTER TABLE "weekly_plans" ADD COLUMN "auto_approved" BOOLEAN NOT NULL DEFAULT false;

-- 3. Backfill: bugüne kadarki HER plan Online Koçum planıdır — plan üretimi ve
--    onayı yalnız `requireApiProductRole("OK", …)` arkasındaki uçlardan yapılıyordu.
UPDATE "weekly_plans" SET "product_ref_id" = (SELECT "id" FROM "products" WHERE "code" = 'OK')
WHERE "product_ref_id" IS NULL;

-- 4. Backfill eksiksiz olmadan ilerleme. `weekly_plans` boşken de, "OK" ürünü
--    kayıpken de bu kontrol doğru davranır (boş tabloda satır yok → geçer).
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT count(*) INTO orphan_count FROM "weekly_plans" WHERE "product_ref_id" IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'weekly_plans: % satır "OK" ürününe backfill edilemedi (products.code = ''OK'' eksik olabilir)', orphan_count;
  END IF;
END $$;

ALTER TABLE "weekly_plans" ALTER COLUMN "product_ref_id" SET NOT NULL;

ALTER TABLE "weekly_plans" ADD CONSTRAINT "weekly_plans_product_ref_id_fkey"
  FOREIGN KEY ("product_ref_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "weekly_plans_product_ref_id_week_start_idx" ON "weekly_plans"("product_ref_id", "week_start");

-- 5. KPSS öğretmensiz/otonom bir üründür: planı koç onayı beklemeden aktif olur.
--    KPSS ürün satırı yalnız `scripts/seed-kpss-product.mjs` çalıştırıldığı ortamlarda
--    vardır; yoksa bu UPDATE hiçbir satıra dokunmaz ve migration yine de geçerlidir.
--    Ürün satırı sonradan açıldığında aynı bayrağı seed script'i yazar.
UPDATE "products" SET "requires_plan_approval" = false WHERE "code" = 'KPSS';
