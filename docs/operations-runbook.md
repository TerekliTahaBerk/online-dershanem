# İşletme merkezi operasyon runbook

## Actions kurulumu ve production sağlık kontrolü

`npm ci` adımında `Missing: rxjs@7.8.2 from lock file` görülürse lock dosyasını CI'daki npm 10 ile güncelleyin (`npx --package npm@10.9.9 npm install --package-lock-only --ignore-scripts`) ve aynı sürümle `npm ci --dry-run --ignore-scripts` çalıştırın. npm 11'in başarılı olması npm 10 ile uyumluluğu doğrulamaz. `@flags-sdk/posthog` altındaki `posthog-node` isteğe bağlı olarak RxJS 7 ister; Lighthouse'ın RxJS 6 bağımlılığı bunu karşılamaz. Güncellenmiş `package-lock.json` depoya dahil edilmelidir.

GitHub repository **Settings → Secrets and variables → Actions** altında şu secret'ları tanımlayın. Vercel değişkenleri GitHub Actions'a otomatik aktarılmaz:

| Secret | Kullanım |
| --- | --- |
| `PRODUCTION_DATABASE_DIRECT_URL` | Yedekleme, saklama raporu ve ödeme mutabakatı için doğrudan production PostgreSQL bağlantısı; Prisma Accelerate URL'si kullanılmaz. |
| `BACKUP_ENCRYPTION_PASSWORD` | Dump ve tombstone defterinin şifrelenmesi. Kalıcı parolayı parola yöneticisinde de saklayın; eski yedekler önceki parolayı gerektirir. |
| `BLOB_READ_WRITE_TOKEN` | Saklama motorunda gerçek Blob silme işlemleri için gereklidir. |

Production `/api/health` yanıtında `cache: down`, `CACHE_UNAVAILABLE` ve `lastErrorCode: ENOTFOUND` birlikteyse Redis REST adresi DNS'te çözülemiyordur. Upstash panelindeki etkin veritabanının REST URL/token çiftini Vercel **Production** kapsamındaki `UPSTASH_REDIS_REST_URL` ve `UPSTASH_REDIS_REST_TOKEN` alanlarına kaydedip yeniden deploy edin. `ready: true`, cache `status: ok` ve HTTP 200 ile doğrulayın; sağlık kontrolünü gevşetmeyin.

Düzeltme yeni commit'e girdikten sonra workflow'ları yeni commit üzerinden çalıştırın. Eski çalıştırmada “Re-run” eski commit'in lock dosyasını kullanır. Saklama kontrolünü `dry_run=true` ile çalıştırın.

## Webhook

Admin health endpoint’ini, callback/verify token, subscription ve app mode’u kontrol edin. 401 app secret, 403 verify token sorunudur. Event var mesaj yoksa background job’a bakın.

## Token / gönderim

Hesabı pasif veya AI’ı OFF yapın, yeni token’ı Vercel secret’a girip redeploy edin. Aynı mesajı farklı anahtarlarla çoğaltmayın; delivery kaydını inceleyin.

## Yanlış AI yanıtı

Konuşmayı OFF, hesap varsayılanını SUGGESTION yapın. `AIExecution` ve seçilen bilgi kayıtlarını inceleyip kaydı versiyonlayın; düzeltmeyi insan onayıyla gönderin.

## Takılmış job

Lock zamanı, cron logu ve processor secret’ı kontrol edilir. 15 dakikadan eski `PROCESSING` kilidi işlemci tarafından `STALE_LOCK_RECOVERED` ile tekrar kuyruğa alınır. `DEAD` iş hata çözüldükten sonra yeni idempotency anahtarlı kontrollü telafi işiyle açılır.

## Duplicate finans / mutabakat

Order ID, provider ref, tutar ve tarihi karşılaştırın. Kaydı silmeyin; yanlış satıra yetkili ters kayıt oluşturup `ReconciliationRecord` ile belgeleyin.

## Dönem kilidi

Ay sonu mutabakatından sonra dönemi LOCKED yapıp audit yazın. Sonraki farklar kilidi sessiz açmadan yeni dönemde adjustment/reversal ile kaydedilir.

## Meta Ads / attribution

Entegrasyon ekranından senkronizasyonu çalıştırın. `META_ADS_CONFIGURATION_MISSING` için Marketing API token, reklam hesabı ve Graph sürümünü kontrol edin. Instagram Login mesaj API’sinin reklamlara erişmediğini unutmayın. Referral dış kimliği bulunamazsa otomatik atıf oluşmaz; inbox lead kartından manuel atıf yapın.

## KVKK anonimleştirme

İş birimi saklama gününü Ayarlar’dan doğrulayın. Günlük iş yalnız kapalı/spam konuşmaları işler. Yanlışlık şüphesinde işi durdurmak için kayıtları `OPEN` yapın; anonimleştirilmiş içerik uygulamadan geri alınamaz ve yalnız yedek politikası kapsamında kurtarılabilir.
