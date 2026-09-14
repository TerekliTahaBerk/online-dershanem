-- KPSS Görev 5: KPSS üyeliklerinde `product` ve `product_ref_id` birlikte dolu olmalı.
--
-- 0106 KPSS satırlarını `product = NULL` + `product_ref_id` olarak yazıyordu, çünkü
-- KPSS enum'da yoktu. 0107 ile enum'a girdiği için 0106 trigger'ı
-- (`enum_range(NULL::"ProductCode")` üzerinden dinamik) yeni yazımlarda `product`'ı
-- zaten dolduruyor; bu migration eski satırları aynı duruma getirir.
-- Trigger UPDATE'te iki kolonun aynı ürünü gösterdiğini doğrular.
-- Veri silmez; OD/OK/ODK satırlarına dokunmaz.

UPDATE "product_memberships" m
SET "product" = 'KPSS'
FROM "products" p
WHERE p."id" = m."product_ref_id"
  AND p."code" = 'KPSS'
  AND m."product" IS NULL;

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
    RAISE EXCEPTION 'product_memberships: KPSS enum backfill left inconsistent rows';
  END IF;
END $$;
