-- Guest checkout — OD/ODK siparişleri artık bir hesaba bağlı olmak zorunda değil.
--
-- Public kullanıcı login olmadan paket satın alabilir. Ödeme alındıktan sonra
-- order `status=PAID AND user_id IS NULL` olarak admin/onboarding kuyruğunda kalır;
-- admin öğrenci/veli hesabını oluşturup order'ı kullanıcıya bağlar.
--
-- Değişiklik:
--   1. od_orders.user_id  → NULLABLE
--   2. odk_orders.user_id → NULLABLE
--   3. FK davranışı Cascade → SET NULL (kullanıcı silinse bile ödenmiş order +
--      muhasebe izi korunur; order guest'e geri döner).
--
-- Tümü additive/relaxing; veri kaybı yok. Yeni tablo/kolon yok — purchaser/
-- öğrenci/veli bilgileri zaten buyer_info JSON'unda tutuluyor.
--
-- NOT: odk_orders bazı ortamlarda `prisma db push` ile oluşturulduğundan FK adı
-- standart Prisma adından (`<table>_user_id_fkey`) farklı olabilir. Bu yüzden
-- mevcut FK'yi adına bakmadan (pg_constraint üzerinden) düşürüp yeniden kuruyoruz.

-- 1. od_orders.user_id → NULLABLE
ALTER TABLE "od_orders" ALTER COLUMN "user_id" DROP NOT NULL;

-- 2. odk_orders.user_id → NULLABLE
ALTER TABLE "odk_orders" ALTER COLUMN "user_id" DROP NOT NULL;

-- 3a. od_orders: user_id üzerindeki tüm FK constraint'lerini düşür, SET NULL ile yeniden kur
DO $$
DECLARE
  c text;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
    WHERE con.contype = 'f'
      AND rel.relname = 'od_orders'
      AND att.attname = 'user_id'
  LOOP
    EXECUTE format('ALTER TABLE "od_orders" DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE "od_orders" ADD CONSTRAINT "od_orders_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3b. odk_orders: aynı işlem
DO $$
DECLARE
  c text;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
    WHERE con.contype = 'f'
      AND rel.relname = 'odk_orders'
      AND att.attname = 'user_id'
  LOOP
    EXECUTE format('ALTER TABLE "odk_orders" DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE "odk_orders" ADD CONSTRAINT "odk_orders_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
