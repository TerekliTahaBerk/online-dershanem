# Instagram CRM ve finans mimarisi

## Kararlar ve varsayımlar

- Mevcut `UserRole` eğitim alanına aittir ve değiştirilmedi. İşletme rolleri `BusinessRoleAssignment` ile `BusinessUnit` kapsamında verilir; mevcut `ADMIN` tüm iş birimlerinde `SUPER_ADMIN` sayılır.
- `BusinessUnit` kayıtları OD ve ODK ürünleriyle bire bir eşleşir. CRM, kampanya, bilgi merkezi ve finans sorguları iş birimi filtresi taşır.
- Mevcut `LeadSubmission` public formu korunur. Birleşik satış adayları `BusinessLead` içinde yaşar.
- Finans mevcut sipariş tablolarını değiştirmez. `FinancialTransaction` ortak ve değişmez görünümü sağlar; hard delete yerine ters kayıt kullanılır.
- Para kuruş bazlı `Int`, oranlar `Decimal`, zaman damgaları UTC tutulur. Arayüz Europe/Istanbul gösterir.
- Webhook önce `InstagramWebhookEvent` ve `BackgroundJob` yazar, ardından 200 döner. Ağ çağrısı webhook içinde yapılmaz. Job anahtarları unique, retry/backoff kalıcıdır.
- AI varsayılanı `SUGGESTION`; şikâyet, iade, ödeme veya insan talebi daima insan kuyruğuna geçer.

Akış: `Meta → HMAC imza → event + job → conversation/message/lead → seçili bilgi bağlamı → Responses API structured output → öneri veya güvenli gönderim`.

PayTR başarı akışı aynı Serializable transaction içinde sipariş, ödeme ve ledger upsert’i yapar. `order:{OD|ODK}:{id}:sale` anahtarı duplicate geliri engeller. Panel/API yetkisi server-side uygulanır; secret, mesaj içeriği ve PII loglanmaz. CSV hücreleri formula injection’a karşı korunur.

