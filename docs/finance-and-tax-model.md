# Finans ve vergi modeli

`FinancialTransaction` OD, ODK, manuel ve diğer kaynakları tek operasyonel ledger’da gösterir; sipariş tabloları korunur. PayTR callback ledger satırını Serializable transaction içinde idempotent upsert eder. Tarihsel kayıtları önce `node --import tsx scripts/backfill-finance-ledger.ts --dry-run`, sonra bayraksız komutla aktarın.

Brüt, indirim, net, KDV, stopaj, diğer vergi ve komisyon kuruş; oranlar yönetilebilir Decimal’dır. Kilitli `AccountingPeriod` normal mutasyonu reddeder. Düzeltme/iptal ters kayıt üretir. KDV dahil tutardaki KDV `brüt × oran / (100 + oran)` ile tahmin edilir.

Vergi ekranı resmî muhasebe yerine geçmez; profil ve oranlar mali müşavirce doğrulanmalıdır.

Mutabakat motoru PayTR provider ref, order id, tutar ve duplicate sayısını karşılaştırır. Eksik komisyon da `REVIEW_REQUIRED` üretir. Yetkili kullanıcı sonucu `MANUALLY_MATCHED` veya `CORRECTED` yapabilir; çözüm zamanı/kullanıcısı ve audit kaydı korunur. Aylık veya çeyreklik görünüm dashboard tarih aralığıyla aynı UTC sınırlarını kullanır ve arayüzde Europe/Istanbul gösterilir.
