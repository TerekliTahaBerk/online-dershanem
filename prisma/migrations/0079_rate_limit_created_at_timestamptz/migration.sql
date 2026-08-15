-- RateLimitEntry.createdAt → timestamptz
--
-- Bu tabloya İKİ yazar dokunuyor: limiter'ın ham SQL'i (`statement_timestamp()`,
-- oturumun yerel saati) ve Prisma (`now()`, UTC). Kolon `timestamp without time
-- zone` iken bu ikisi, oturum saat dilimi UTC değilse offset kadar kayıyor ve
-- pencere sorgusu Prisma'nın yazdığı satırları hiç görmüyordu.
--
-- `USING ... AT TIME ZONE 'UTC'` bilinçli: düz `SET DATA TYPE` mevcut değerleri
-- migration'ı çalıştıran oturumun saat dilimine göre yorumlar.
ALTER TABLE "RateLimitEntry" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
