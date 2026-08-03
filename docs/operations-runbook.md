# İşletme merkezi operasyon runbook

## Webhook

Admin health endpoint’ini, callback/verify token, subscription ve app mode’u kontrol edin. 401 app secret, 403 verify token sorunudur. Event var mesaj yoksa background job’a bakın.

## Token / gönderim

Hesabı pasif veya AI’ı OFF yapın, yeni token’ı Vercel secret’a girip redeploy edin. Aynı mesajı farklı anahtarlarla çoğaltmayın; delivery kaydını inceleyin.

## Yanlış AI yanıtı

Konuşmayı OFF, hesap varsayılanını SUGGESTION yapın. `AIExecution` ve seçilen bilgi kayıtlarını inceleyip kaydı versiyonlayın; düzeltmeyi insan onayıyla gönderin.

## Takılmış job

Lock zamanı, cron logu ve processor secret’ı kontrol edilir. `DEAD` iş hata çözüldükten sonra yeni idempotency anahtarlı kontrollü telafi işiyle açılır.

## Duplicate finans / mutabakat

Order ID, provider ref, tutar ve tarihi karşılaştırın. Kaydı silmeyin; yanlış satıra yetkili ters kayıt oluşturup `ReconciliationRecord` ile belgeleyin.

## Dönem kilidi

Ay sonu mutabakatından sonra dönemi LOCKED yapıp audit yazın. Sonraki farklar kilidi sessiz açmadan yeni dönemde adjustment/reversal ile kaydedilir.

