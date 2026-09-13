# Instagram CRM ve finans mimarisi

## Kararlar ve varsayımlar

- Mevcut `UserRole` eğitim alanına aittir ve değiştirilmedi. İşletme rolleri `BusinessRoleAssignment` ile `BusinessUnit` kapsamında verilir; mevcut `ADMIN` tüm iş birimlerinde `SUPER_ADMIN` sayılır.
- `BusinessUnit` kayıtları OD ve ODK ürünleriyle bire bir eşleşir. CRM, kampanya, bilgi merkezi ve finans sorguları iş birimi filtresi taşır.
- Mevcut `LeadSubmission` public formu korunur. Birleşik satış adayları `BusinessLead` içinde yaşar.
- Finans mevcut sipariş tablolarını değiştirmez. `FinancialTransaction` ortak ve değişmez görünümü sağlar; hard delete yerine ters kayıt kullanılır.
- Para kuruş bazlı `Int`, oranlar `Decimal`, zaman damgaları UTC tutulur. Arayüz Europe/Istanbul gösterir.
- Webhook önce `InstagramWebhookEvent` ve `BackgroundJob` yazar, ardından 200 döner. Ağ çağrısı webhook içinde yapılmaz. Job anahtarları unique, retry/backoff kalıcıdır.
- AI varsayılanı `SUGGESTION`; şikâyet, iade, ödeme veya insan talebi daima insan kuyruğuna geçer.
- Arka arkaya gelen kısa mesajlar 8 saniyelik kalıcı debounce işiyle birleştirilir. AI bağlamı en fazla dört inbound mesaj, aktif ürün/paket fiyatları ve anahtar kelimeyle seçilmiş sekiz bilgi kaydıyla sınırlıdır.
- Otomasyonlar serbest kod çalıştırmaz. Zod ile doğrulanan tetikleyici, koşul ve allowlist aksiyonları `AutomationExecution` ile süre/sonuç/hata kaydı üretir. Part 12 genişlemesi (dry-run, recursion, idempotency, eğitim tetikleyicileri) için bkz. [automation-architecture.md](./automation-architecture.md).
- Referral içindeki reklam/kampanya kimlikleri first-touch atfına dönüştürülür; kesin eşleşmeyen telefon/e-posta kayıtları otomatik birleşmez, panelde öneri oluşturur.
- Saatlik bakım işleri finans mutabakatı ve cevapsız sıcak aday kontrolünü; günlük iş ise iş birimi saklama politikasına göre kapalı/spam konuşma anonimleştirmesini yürütür.
- Satış operasyonu alanları (`nextFollowUpAt`, `priority`, `wonAt`/`lostAt`, `lostReasonCode`) ve günlük worklist için bkz. `docs/crm-sales-operations.md`.

Akış: `Meta → HMAC imza → event + job → conversation/message/lead → seçili bilgi bağlamı → Responses API structured output → öneri veya güvenli gönderim`.

PayTR başarı akışı aynı Serializable transaction içinde sipariş, ödeme ve ledger upsert’i yapar. `order:{OD|ODK}:{id}:sale` anahtarı duplicate geliri engeller; yüksek güvenli lead eşleşmesi adayı `WON` yapıp otomasyon işi üretir. Panel/API yetkisi server-side ve same-origin/rate-limit katmanlarıyla uygulanır; secret, mesaj içeriği ve PII loglanmaz. CSV hücreleri formula injection’a karşı korunur.

Lead → Student uçtan uca yaşam döngüsü, timeline, provisioning idempotency, Ops Center ve funnel metrikleri için bkz. [lead-student-lifecycle.md](./lead-student-lifecycle.md).
