# M5 teslim mimarisi — Kalıcı push dağıtıcısı

## 1. İlke

- **Tek kaynak:** Kanonik `Notification` tablosu. İkinci bildirim veritabanı, kuyruk servisi veya WebSocket yok.
- **Üreticiler değişmedi:** Merkezi `produceNotification` ve doğrudan yazan ~24 yol aynen çalışır. Push, bu satırları **sonradan** tüketir.
- **Ek tablo:** `push_deliveries`, yalnız teslim durumunu tutar.
- **Sağlayıcı:** Expo Push Service (HTTPS). Ücretli üçüncü taraf servis yok.
- **Kod:** `lib/push/{config,classification,eligibility,expo-client,dispatcher,device-server}.ts`, cron `app/api/cron/push-dispatch/route.ts` (`*/2 * * * *`).

## 2. Çalışma modları (`PUSH_DELIVERY_MODE`)

| Mod | Fan-out | Uygunluk | Expo çağrısı | Makbuz | Kullanım |
| --- | --- | --- | --- | --- | --- |
| `DISABLED` (varsayılan; bilinmeyen değer de bu) | yok | yok | **yok** | yok | Üretim varsayılanı |
| `DRY_RUN` | var | var (gerçek durumla) | **yok**; satır `CANCELED / DRY_RUN` | yok | Staging gözlemi |
| `ENABLED` | var | var | var | var | Yalnız onaylı staging; üretim runbook onayı sonrası |

DISABLED modunda yalnız saklama temizliği ve metrikler çalışır.

## 3. Aşamalar (her koşu, sınırlı)

1. **Fan-out**
   - Seçim ölçütleri:
     - son `PUSH_BACKLOG_MAX_AGE_MINUTES` (24 sa) içinde oluşmuş;
     - `inAppVisible`, okunmamış, `deliveryPending = false`;
     - henüz teslim satırı olmayan;
     - sahibi ACTIVE STUDENT / PARENT, `pushEnabled` açık ve en az bir etkin cihazı olan bildirim.
   - En fazla `PUSH_MAX_FANOUT_PER_RUN` bildirim alınır.
   - Push sınıfı olmayan satırlar elenir (§4).
   - Her etkin cihaz için, `device.activatedAt <= notification.createdAt` ise `PushDelivery(PENDING)` açılır (`createMany skipDuplicates`, `@@unique([notificationId, deviceId])`).
2. **Kiralama**
   - Ham SQL `UPDATE … WHERE id IN (SELECT … FOR UPDATE SKIP LOCKED) RETURNING id`.
   - `PENDING` / `RETRY` (zamanı gelmiş) ve kirası dolmuş `CLAIMED` satırlar alınır.
   - `claimToken` ve 2 dk kira yazılır, `attempts` artırılır. En fazla `PUSH_MAX_PER_RUN`.
   - Eşzamanlı iki koşu aynı satırı alamaz.
3. **Değerlendirme + gönderim**
   - Gönderim anındaki **güncel** durumla `evaluatePushEligibility` çalışır (§5).
   - Kaynak doğrulama:
     - LESSON / COACHING / PLAN: `isNotificationSourceCurrent` (merkezi üretici kuralları);
     - ODK_EXAM: `isOdkNotificationSourceCurrent`.
   - Uygun satırlar ≤100'lük partilerle Expo'ya gider. Bilet kimliği (`ticketId`) kalıcı yazılır → `ACCEPTED`.
   - Tüm durum yazımları `claimToken` ile korunur: kirası başka işçiye geçmiş satır üzerine yazılmaz.
4. **Makbuz** (yalnız ENABLED)
   - `ACCEPTED` satırlar 15 dk sonra `getReceipts` ile sorgulanır (≤300 / koşu).
   - `ok` → `PROVIDER_ACCEPTED`.
   - Hata → `FAILED` veya `RETRY`; `DeviceNotRegistered` cihazı iptal eder.
   - 24 sa içinde makbuz alınamazsa sorgulama bırakılır: durum `ACCEPTED` kalır, `receiptStatus = UNAVAILABLE` yazılır.
   - Makbuz yalnız Expo / APNs / FCM'nin kabulünü gösterir; cihaza ulaştığını veya görüldüğünü **kanıtlamaz**.
5. **Temizlik**
   - `PUSH_DELIVERY_RETENTION_DAYS` (30) günden eski teslim satırları silinir.
   - `PUSH_DEVICE_IDLE_DAYS` (60) gün görülmeyen cihaz `IDLE` olur.
   - Oturumu bitmiş cihaz `SESSION_ENDED` olur.

## 4. Sınıflandırma (`classifyNotification`)

| Kaynak | Kategori | Tercih anahtarı | TTL |
| --- | --- | --- | --- |
| `type = PAYMENT` veya `preferenceKey = payment` | **push yok** | — | — |
| `ASSIGNMENT` | ASSIGNMENT | `assignment` | 24 sa |
| `ABSENCE` | ABSENCE | `absence` | 24 sa |
| `LESSON_SUMMARY` | LESSON | `lessonSummary` | 24 sa |
| SYSTEM / `LESSON` (ders hatırlatması) | LESSON | `lessonSummary` | 2 sa |
| SYSTEM / `COACHING` | COACHING | satırın anahtarı | 12 sa |
| SYSTEM / `PLAN` | PLAN | satırın anahtarı | 24 sa |
| SYSTEM / `ODK_EXAM` | EXAM | `examUpdates` | sonuç / anahtar 48 sa, hatırlatma / açılış 2 sa |
| SYSTEM / `SUMMARY` (günlük özet) | DIGEST | — | 24 sa |
| Diğer SYSTEM, yalnız öğrenci / veli panel `href` | GENERAL | — | 24 sa |
| Geri kalan (personel / yönetim / ödeme yolları) | **push yok** | — | — |

## 5. Uygunluk (gönderim anında, sırayla)

| Sıra | Koşul | Sonuç kodu |
| --- | --- | --- |
| 1 | Bildirim sahibi ≠ cihaz sahibi | `OWNER_MISMATCH` |
| 2 | Kullanıcı ACTIVE değil | `USER_INACTIVE` |
| 3 | Cihaz iptal edilmiş | `DEVICE_REVOKED` |
| 4 | Oturum iptal edilmiş veya süresi dolmuş | `SESSION_INVALID` |
| 5 | `pushEnabled = false` / tercih yok | `PUSH_DISABLED` |
| 6 | `inAppEnabled = false` | `IN_APP_DISABLED` (başlangıç sınırlaması: push, uygulama içi bildirimin bir kanalıdır) |
| 7 | Push sınıfı yok | `NOT_CLASSIFIED` |
| 8 | Kategori tercihi kapalı | `CATEGORY_DISABLED` |
| 9 | Görünmez | `NOT_VISIBLE` |
| 10 | Okunmuş | `ALREADY_READ` |
| 11 | Kaynak artık geçerli değil | `SOURCE_INVALID` |
| 12 | TTL dolmuş | `STALE` |
| 13 | Sessiz saat (İstanbul, gece yarısını aşabilir; `afterQuietHours`) | sessiz saat bitişi TTL'den önceyse `DEFER` (PENDING, `QUIET_HOURS`), değilse `STALE` |

`SKIP` → `CANCELED` + sonuç kodu. `DEFER` deneme sayısını artırmaz.

## 6. Hata ve yeniden deneme

| Durum | Sınıf | Sonuç |
| --- | --- | --- |
| HTTP 429 / 5xx / zaman aşımı (10 sn) / ağ | geçici | `RETRY`, üstel geri çekilme (30 sn × 2^n, ≤1 sa, +0–10 sn jitter, `Retry-After`'a uyar) |
| Bilet `MessageRateExceeded` | geçici | `RETRY` |
| Bilet / makbuz `DeviceNotRegistered` | kalıcı | `FAILED` + cihaz iptal |
| Diğer bilet / makbuz hataları (`InvalidCredentials`, `MessageTooBig`, …) | kalıcı | `FAILED` |
| `PUSH_MAX_ATTEMPTS` (5) aşıldı | — | `FAILED` |

**Teslim garantisi:** En az bir kez denenir. Fiziksel olarak tam-bir-kez teslim **garanti edilmez**: zaman aşımında Expo isteği almış olabilir ve yeniden deneme çift bildirim üretebilir. Mantıksal tekilleştirme (bildirim × cihaz tekil satırı, kararlı ODK kimlikleri) çoğaltmayı sınırlar.

## 7. Deneme Ligi olay bildirimleri (`lib/odk/student-notifications.ts`)

`odk-exam-lifecycle` cron'u içinde, `ODK_STUDENT_NOTIFICATIONS=ENABLED` iken çalışır. Varsayılan kapalıdır.

| Olay | Koşul | Sürüm (idempotency) | Hedef |
| --- | --- | --- | --- |
| REMINDER | sözleşme başlangıcına ≤60 dk, öğrencinin denemesi yok, sınav SCHEDULED / LIVE | başlangıç saati | `/panel/odk/ogrenci/denemeler/<id>` |
| OPEN | başlangıçtan ≤15 dk geçmiş, `decideAttemptStart` uygun, aynı sürüm için REMINDER yok | başlangıç saati | aynı |
| RESULT | `studentReports` hakkı + `contractResultAvailable` + öğrencinin KENDİ teslim edilmiş denemesinin skoru `PUBLISHED`; yayın ≤7 gün önce | gerçek yayın zamanı (SCHEDULED ise sözleşme zamanı) | `…/<id>/sonuc` |
| ANSWER_KEY | `answerKeyReleaseMode ≠ WITH_RESULTS` + `contractAnswerKeyAvailable` + kendi teslim edilmiş denemesi skorlu | gerçek anahtar yayın zamanı | `…/<id>/sonuc` |

- Kimlik: `notificationKey(userId, "ODK_EXAM", examId, "<KIND>:<sürüm>")`, `createMany skipDuplicates`. Tekrar koşu satır üretmez. Saat değişirse yeni sürüm, yani yeni olay oluşur.
- Tercih: `inAppEnabled && examUpdates`.
- Erken bildirim yok: zamanlanmış yayın gelmeden RESULT / ANSWER_KEY üretilmez. Gönderim anında `isOdkNotificationSourceCurrent` hak, yayın ve saat kurallarını yeniden kontrol eder.
- Sınav başlatılmaz, puanlama / yayın değişmez.

## 8. Gözlemlenebilirlik

- `runJob` kalp atışı: `CRITICAL_CRON_DEFINITIONS` içinde `push-dispatch`, 2 dk ritim, 10 dk bayatlık, 30 dk uyarı aralığı.
- Metrikler: [m5-api-contracts.md](./m5-api-contracts.md) §7.
- Loglarda token, kullanıcı içeriği veya yük yoktur. Hata kodları yalnız sınıf adıdır.
- Uyarı eşikleri (öneri):
  - `pendingBacklog` > 1000 veya `oldestPendingAgeMs` > 15 dk;
  - `failedPermanent / sent` > %5;
  - `receiptErrors` artışı;
  - `devicesRevoked` sıçraması (kimlik bilgisi sorunu olabilir).

## 9. Ölçek ve sınırlar

- Koşu başına varsayılan 300 gönderim × 30 koşu/sa ≈ 9.000 push/sa üst sınır. Toplu bildirim patlamaları sonraki koşulara yayılır.
- Bir koşu en fazla 4 Expo isteği yapar (≤100'lük partiler). Expo'nun cihaz başına ~600/sn sınırının çok altındadır.
- Vercel cron `*/2` sıklığı: repoda zaten `*/2` cron var; planın bu sıklığı desteklediği MCP üzerinden doğrulanamadı (plan bilgisi dönmedi). Runbook'ta kontrol maddesi.
