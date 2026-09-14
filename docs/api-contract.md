# API response contract

Yeni veya migrate edilmiş JSON API route'ları `lib/api/response.ts` içindeki helper'ları kullanır. Mevcut route'lar topluca değiştirilmez; istemci bağımlılığı doğrulanan küçük domain'ler halinde taşınır.

## Response bodies

Başarılı yanıt:

```json
{ "success": true, "data": { "id": "..." }, "meta": { "count": 1 } }
```

`meta` isteğe bağlıdır. Hata yanıtı:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Gönderilen alanları kontrol edin.",
    "details": { "field": "email" }
  }
}
```

`details` isteğe bağlıdır ve production'da stack, secret veya PII taşımamalıdır. `message` kullanıcıya gösterilebilir; istemci dallanmasını `message` ile değil kararlı `code` ile yapmalıdır.

## Status and code policy

| HTTP | Code | Kullanım |
| ---: | --- | --- |
| 400 | `VALIDATION_ERROR` | JSON/parametre/şema veya iş kuralı girdisi geçersiz |
| 401 | `UNAUTHORIZED` | Oturum veya kimlik doğrulama yok/geçersiz |
| 403 | `FORBIDDEN` | Kimlik doğrulanmış ancak rol, izin veya origin reddedildi |
| 404 | `NOT_FOUND` | Kapsam içindeki kaynak bulunamadı; kapsam dışındaki kaynağı gizlemek için de kullanılabilir |
| 409 | `CONFLICT` | Güncel kaynak durumu mutation ile çakışıyor |
| 413 | `PAYLOAD_TOO_LARGE` | İstek boyutu sınırı aşıldı |
| 429 | `RATE_LIMITED` | Rate limit; varsa `Retry-After` korunur |
| 500 | `INTERNAL_ERROR` | Beklenmeyen sunucu hatası; iç ayrıntı dönülmez |
| 503 | `SERVICE_UNAVAILABLE` | Özellik veya zorunlu bağımlılık geçici olarak kullanılamıyor |

Domain'e özgü kararlı kodlar (`SCHEDULE_CONFLICT` gibi) ortak kodlara eklenebilir. Aynı koşul route'lar arasında aynı HTTP semantiğini kullanmalıdır.

## Helpers

```ts
return apiError(404, API_ERROR_CODES.NOT_FOUND, "Hesap bulunamadı.");
return apiSuccess({ account });
```

Header gerekiyorsa son argüman kullanılır. Örneğin rate limit yanıtında `apiError(429, ..., undefined, { headers })` çağrısı yapılır.

## Pilot: Instagram yönetim entegrasyonu

`/api/admin/integrations/instagram` tek route'lu, izole pilot domaindir. Önceki hata gövdesi `{ "error": "Yetkisiz." }`, başarılı GET gövdesi `{ "accounts": [...], "secrets": {...} }` idi. Pilot sonrasında hata standart zarfı, başarı ise `{ "success": true, "data": ... }` kullanır; status kodları (400/401/403/404/429) korunmuştur.

Kaynak taramasında bu yolu çağıran üretim frontend `fetch`/API client kodu bulunmadı. Tek tüketici `tests/e2e/business-rbac.spec.ts` içindeki status temelli RBAC kontrolüdür; gövdeye bağımlı olmadığı için değişiklik gerektirmedi.

## Migration gates

Bir domain migrate edilmeden önce:

1. Route ve tüm istemci çağrıları birlikte listelenir.
2. Mevcut status/gövde contract testi eklenir veya güncellenir.
3. İstemci `response.error` gibi legacy alanlardan `response.error.message/code` ve başarı `response.data` zarfına taşınır.
4. Domain testleri, typecheck ve ilgili e2e çalıştırılır.
5. Yalnız bu domain merge edilir; toplu codemod yapılmaz.

Tam statik envanter [api-error-inventory.md](./api-error-inventory.md) dosyasındadır.

## Recommended migration order

1. `health`, `smoke`, salt-okunur `admin` route'ları: küçük ve az UI bağımlılığı.
2. `integrations/instagram/*`: sınırlı business UI; pilot ile aynı domain.
3. `cron/*` ve webhook dışı internal job uçları: istemci bağımlılığı az, izleme etkisi kontrol edilmeli.
4. `panel/accessibility`, `network`, `notifications/preferences`: küçük ve izole ayar domain'leri.
5. `panel/materials`, `curriculum`, `teacher/templates`: orta riskli CRUD grupları.
6. `panel/groups`, `lessons`, `assignments`: yüksek kullanım ve birden çok rol; contract testleriyle.
7. `panel/users`, auth/session ve MFA: güvenlik-kritik; ayrı migration görevleri.
8. `od`, `odk/checkout`, purchases ve PayTR webhook'ları: ödeme/harici sağlayıcı contract'ları nedeniyle en son ve sağlayıcı fixture'larıyla.
