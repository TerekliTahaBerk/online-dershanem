# İşletme merkezi operasyon runbook

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
