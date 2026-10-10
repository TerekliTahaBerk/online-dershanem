# M5 API sözleşmeleri — Push, cihaz kaydı, tercihler

Tüm uçlar mevcut Next.js backend'indedir; ikinci servis yoktur. Mobil istemci
`Authorization: Bearer <oturum>` ve `x-od-client: mobile` gönderir. Mobil
ayrıştırıcılar: `lib/mobile-contracts/push.ts` (`@contracts/push`).

Ortak kurallar:
- Kimlik ve oturum **daima sunucu oturumundan** çözülür (`requireApiAccountRole`). Gövdede `userId` / `sessionId` kabul edilmez (`strict` şema → 400).
- M5 kapsamı **yalnız STUDENT ve PARENT**. Personel (TEACHER / ADMIN / koç) 403 alır; personel push'u M7'ye kadar açılmaz.
- Parola değişimi / MFA kapıları `requireApiAccountRole` içinde uygulanır.
- Yanıtlar `Cache-Control: private, no-store`.
- Push token'ı hiçbir yanıtta geri dönmez ve loglanmaz.

## 1. `POST /api/panel/push-devices` — cihaz kaydı

| Alan | Tür | Kural |
| --- | --- | --- |
| `token` | string | `^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,200}\]$` |
| `platform` | `"IOS" \| "ANDROID"` | zorunlu |
| `appVersion` | string | `x.y.z` |
| `projectId` | uuid \| null | isteğe bağlı (EAS proje kimliği; bilgi amaçlı) |
| `appEnvironment` | `development \| preview \| production` \| null | isteğe bağlı |
| `permissionStatus` | `granted \| provisional \| ephemeral` \| null | isteğe bağlı |

- Ön koşullar: `x-od-client: mobile` (yoksa 400; kimlik kanıtı DEĞİLDİR), `guardMutation` (30 istek / 15 dk / kullanıcı; Origin varsa aynı köken).
- Yanıt `200 { registered: true, deviceId }`.
- Hatalar: 400 (biçim / bilinmeyen alan / mobil değil), 401 (oturum yok), 403 (rol / kapı / guard), 429 (hız sınırı).
- Anlam (bkz. [m5-device-lifecycle.md](./m5-device-lifecycle.md)):
  - Token başka kullanıcıdaysa o kayıt silinir, yeni kullanıcı için temiz kayıt açılır.
  - Aynı oturumun diğer etkin kayıtları `TOKEN_ROTATED` ile iptal edilir.
  - İptal edilmiş kendi kaydı yeniden etkinleşirse `activatedAt` yenilenir (birikim gönderilmez).

## 2. `DELETE /api/panel/push-devices` — kayıt iptali

- Gövde: `{ token?: string }` (strict). Boş gövde kabul edilir.
- Bu oturumun kayıtlarını ve (verildiyse) bu kullanıcıya ait o token'ı iptal eder. Başka kullanıcının token'ına dokunamaz.
- İdempotent: `200 { revoked: <sayı> }`; tekrarında `0`.
- Bekleyen (`PENDING` / `RETRY`) teslimatlar `CANCELED / DEVICE_REVOKED` olur.

## 3. `GET /api/panel/push-devices`

`200 { devices: [{ id, platform, appVersion, lastSeenAt, createdAt, current }] }` — yalnız etkin kayıtlar; token ve oturum kimliği yok.

## 4. `GET /api/panel/notifications/preferences` (yeni)

`200 { preferences }` — satır yoksa varsayılanlar:

| Alan | Varsayılan |
| --- | --- |
| `inAppEnabled` | true |
| `emailEnabled`, `whatsappEnabled` | false |
| `lessonSummary`, `weeklyDigest`, `absence`, `assignment`, `payment` | true |
| **`pushEnabled`** | **false** |
| **`examUpdates`** | true (Deneme Ligi kategorisi) |
| `quietStartMinute`, `quietEndMinute` | null (İstanbul saatinde dakika; gece yarısını aşabilir) |
| `dailyDigest` / `dailyDigestMinute` | false / null |

## 5. `PATCH /api/panel/notifications/preferences` (geriye uyumlu genişletme)

- **Web (varsayılan):** davranış değişmedi. Tam gövde zorunludur; eksik sessiz saat çifti vb. 400 döner. Yeni `pushEnabled` / `examUpdates` web gövdesinde isteğe bağlıdır; gönderilmezse mevcut değer korunur (web formu push'u kapatmaz).
- **Mobil (`x-od-client: mobile`):** gövde **kısmi** olabilir. Sunucu gövdeyi mevcut kayıtla birleştirir, sonra aynı tam şemayla (sessiz saat çifti, günlük özet saati) doğrular. Başlık yalnız gövde biçimini seçer, yetki vermez.
- Her iki durumda bilinmeyen alan 400.
- Yanıt `200 { ok: true, preferences }`.
- Haftalık özet ürün olayı yalnız `weeklyDigest` gövdedeyse kaydedilir.

## 6. `GET /api/panel/notifications/[id]` (yeni)

- Push dokunuşunda kullanılır: yük yalnız opak `notificationId` taşır, içerik buradan kimlikli okunur.
- Sahip + `inAppVisible = true` değilse **404** (başka kullanıcının bildirimi, gizli / bekleyen satır).
- Yanıt `{ id, type, title, body, href, read, createdAt }`.
- Kimlik `:` içerebilir (ör. `user:ODK_EXAM:exam:RESULT:<ISO>`); istemci `encodeURIComponent` kullanır.
- Okundu işareti mevcut `PATCH /api/panel/notifications` (ids) ile yapılır; yeni uç yok.

## 7. `GET|POST /api/cron/push-dispatch`

- `CRON_SECRET` Bearer (`runJob`). Vercel cron: `*/2 * * * *`.
- `PUSH_DELIVERY_MODE` (DISABLED varsayılan) davranışı belirler; bkz. [m5-delivery-architecture.md](./m5-delivery-architecture.md).
- Metrik ayrıntıları: `activeDevices`, `fannedOut`, `sent`, `accepted`, `ticketErrors`, `deferred`, `retried`, `dryRun`, `devicesRevoked`, `receiptsOk`, `receiptErrors`, `pendingBacklog`, `oldestPendingAgeMs`, `skippedPreference`, `skippedSession`, `skippedSource`, `skippedStale`, `durationMs`. Kişisel veri veya token içermez.

## 8. `GET /api/cron/odk-exam-lifecycle` (genişletildi)

Mevcut işe `studentNotifications` metriği eklendi. `ODK_STUDENT_NOTIFICATIONS=ENABLED` değilse hiç satır üretmez.

## 9. Push yükü (Expo mesajı)

```json
{
  "to": "<ExpoPushToken>",
  "title": "Online Dershanem",
  "body": "<kategoriye göre genel metin>",
  "data": { "notificationId": "<kimlik>" },
  "channelId": "default",
  "ttl": 7200,
  "sound": "default",
  "priority": "high"
}
```

Yük ad, not, net, puan, sayı, koç notu, check-in, yardım ayrıntısı, ödeme, sözleşme veya token taşımaz. Ödeme / finans bildirimleri push'a hiç sınıflanmaz.

## 10. Mobil sözleşme ayrıştırıcıları

`parseNotificationPreferences`, `parseSingleNotification`, `parseDeviceRegisterResult`, `parseDeviceUnregisterResult`. Bilinmeyen ek alanlar yok sayılır (eklemeli sözleşme, MD-12).
