# M5 doğrulama sonuçları

Tarih: 2026-10-09.
Ortam: yerel Postgres 16 (port 5433), `next build` üretim derlemesi, Chromium (Playwright), Node 22.

**Gerçek cihaz, gerçek Expo / APNs / FCM, staging veya üretim doğrulaması YAPILMADI.**

Talimat gereği yeni otomatik test **commit'lenmedi**. Aşağıdaki "probe" satırları scratchpad'de duran, repoya girmeyen geçici betiklerdir. Kalıcı test kapsamı **sayılmaz**.

## 1. Mevcut paketler

| Kontrol | Sonuç |
| --- | --- |
| Kök `tsc --noEmit` | ✅ temiz |
| Kök `eslint .` | ✅ temiz |
| Hijyen / API doğrulama envanteri | ✅ 201 rota, 224 metot |
| Mobil sözleşme sınırı (`check-mobile-contracts`) | ✅ 8 sözleşme dosyası |
| Birim (`test:unit`) | ⚠️ 928 / 929: tek hata önceden var olan `lib/public-marketing-products.test.ts` (CSS); M5'ten bağımsız |
| Birim kapsamı | 93,19 / 81,11 / 73,97 (satır / dal / fonksiyon) |
| Entegrasyon (taze veritabanı, `0115_mobile_push` dahil) | ✅ 100 / 100 (§5 düzeltmesinden önce koşuldu; paket tercih ucunu kapsamıyor) |
| Prisma: taze zincirde `migrate diff` | ✅ boş (şema = migration) |
| Mobil `tsc` | ✅ temiz |
| Mobil `expo lint` | ✅ temiz |
| Mobil Jest | ✅ 141 / 141 (E2E ile eşzamanlı koşuda 2 zaman aşımı görüldü; yük yokken temiz) |
| Mobil dışa aktarma (Hermes) | ✅ Android 3,5 MB, iOS 3,2 MB |
| Paket sızıntı taraması | ✅ §4 |
| E2E (Playwright, üretim derlemesi, sıfırdan oluşturulan `e2e_test`) | ⚠️ 94 geçti / 3 başarısız. Tamamı önceden var olan sorunlar: `odk-product-quality` öğrenci × 2 (M4'te belgelenen `odk-exam-flow` sıra kirliliği; tek başına koşuda geçti) ve `panel-experience:660` (M3'ten beri flaky). Koşulan paketler: mobile-api, panel-access, permission-matrix, phase0-security, panel-auth-smoke, measurement-notifications, lesson-day, panel-experience, odk-product-quality, odk-exam-flow |
| E2E tek başına yeniden koşu | ✅ 29 / 29 (measurement-notifications, odk-product-quality, mobile-api) |

## 2. Dağıtıcı probe'u — 24 / 24

Kurulum:
- `integration_fresh` veritabanı.
- Gerçek `runPushDispatch`. Yalnız `exp.host` HTTP yanıtları sahte (global `fetch`).
- Çalıştırma: `node --conditions react-server --import tsx`.

| # | Senaryo | Sonuç |
| --- | --- | --- |
| 1 | DISABLED: teslim satırı yok, Expo çağrısı yok | ✅ |
| 2 | DRY_RUN: `CANCELED / DRY_RUN`, Expo çağrısı yok | ✅ |
| 3 | ENABLED: bilet ok → ACCEPTED + `ticketId` | ✅ |
| 3 | Yük yalnız `notificationId` | ✅ |
| 3 | Kilit ekranı metni genel (bildirimdeki ad / ödev / net yok) | ✅ |
| 3 | Makbuz ok → PROVIDER_ACCEPTED | ✅ |
| 3 | Makbuz tekrar işleme: değişiklik ve yeniden gönderim yok | ✅ |
| 4 | HTTP 429 → RETRY, gelecekte `nextAttemptAt` | ✅ |
| 4b | 5xx tekrarı sınırlı → FAILED (deneme = 5) | ✅ |
| 5 | Bilet `DeviceNotRegistered` → FAILED + cihaz iptal | ✅ |
| 5b | Makbuz `DeviceNotRegistered` → FAILED + cihaz iptal | ✅ |
| 6 | Push oluşturma ile gönderim arasında kapatıldı → `PUSH_DISABLED` | ✅ |
| 7 | Kategori kapalı → `CATEGORY_DISABLED` | ✅ |
| 8 | Sessiz saat (şu anı kapsayan aralık) → PENDING / `QUIET_HOURS`, ileri tarih | ✅ |
| 8b | Sessiz saat sonuna kadar bayatlayacak bildirim → `STALE` | ✅ |
| 9 | Oturum iptal → `SESSION_INVALID` | ✅ |
| 10 | Hesap askıya → `USER_INACTIVE` | ✅ |
| 11 | Zaten okundu → `ALREADY_READ` | ✅ |
| 12 | Cihaz iptal (çıkış) → `DEVICE_REVOKED` | ✅ |
| 13/15 | Üç eşzamanlı koşu: tek teslim satırı, tek gönderim | ✅ |
| 14 | Cihaz kaydından önceki bildirim → teslim yok | ✅ |
| 16 | Ödeme bildirimi → push sınıfı yok | ✅ |
| 17 | Deneme Ligi hakkı yok → `SOURCE_INVALID` | ✅ |
| 18 | Personel (TEACHER) bildirimi → push yok | ✅ |

Gece yarısını aşan sessiz saat kuralı mevcut `afterQuietHours` fonksiyonundan gelir. Probe, koşu saatine göre aralığı kurar; bu koşuda aralık gece yarısını aşmadı.

## 3. HTTP probe'u — 29 / 29

Kurulum: `e2e_test` veritabanı, `next start` üretim derlemesi, mobil başlıklar + Bearer.

| # | Senaryo | Sonuç |
| --- | --- | --- |
| 1 | Geçerli oturumla kayıt → 200, satır oturuma bağlı | ✅ |
| 1 | Yanıtta token yok; `private, no-store` | ✅ |
| 1 | Liste ucu token / oturum kimliği döndürmez | ✅ |
| 2 | Kimliksiz → 401; geçersiz Bearer → 401 | ✅ |
| 3 | Gövdede `userId` → 400; biçimsiz token → 400; mobil olmayan istemci → 400 | ✅ |
| 4 | Öğretmen kaydı → 403 | ✅ |
| 5 | Veli kaydı → 200 | ✅ |
| 6 | Hesap değişimi: token yeni kullanıcıya taşınır, önceki kullanıcıda satır kalmaz | ✅ |
| 7 | Token rotasyonu: eski `TOKEN_ROTATED`, yeni etkin; aynı token tekrar → aynı cihaz | ✅ |
| 8 | DELETE iptal eder; tekrarı 0 (idempotent); başka kullanıcının token'ını iptal edemez | ✅ |
| 9 | Çıkış: cihaz iptal; eski Bearer 401 | ✅ |
| 10 | Tercih GET varsayılan `pushEnabled=false`, `examUpdates=true` | ✅ |
| 10 | Mobil kısmi PATCH yalnız verilen alanları değiştirir; bilinmeyen alan 400 | ✅ |
| 10 | Web tam gövdesi (`pushEnabled`'sız) geçerli ve `pushEnabled`'ı korur | ✅ |
| 10 | Web kısmi gövde → 400 (web davranışı değişmedi) | ✅ |
| 10 | Personel tercih GET → 403 | ✅ |
| 11 | Kendi bildirimi 200 + no-store; başkasınınki 404; gizli satır 404; `:` içeren ODK kimliği (kodlanmış) 200 | ✅ |

Ek gözlem: Ardışık probe koşularında kullanıcı başına 30 / 15 dk hız sınırı devreye girdi (429). Probe tekrarı için yerel `RateLimitEntry` satırları temizlendi.

## 4. Deneme Ligi olay probe'u — 21 / 21

Kurulum: `e2e_test` veritabanındaki gerçek ODK tohumu. Sözleşme anlık görüntüleri değiştirilemez, bu yüzden her değişiklik hak iptali + yeni sipariş / hak ile yapıldı.

| # | Senaryo | Sonuç |
| --- | --- | --- |
| A | Bayrak yok → satır yok | ✅ |
| B | Skor HIDDEN → RESULT yok | ✅ |
| C | PUBLISHED + yayın geçmiş → tek RESULT, sürüm = yayın zamanı, hedef `/sonuc` | ✅ |
| C | WITH_RESULTS → ayrı ANSWER_KEY yok | ✅ |
| C | Tekrar koşu idempotent | ✅ |
| C | Kaynak geçerli | ✅ |
| C | Push metni genel (deneme adı / net yok) | ✅ |
| C | Sınıf `examUpdates`, TTL 48 sa | ✅ |
| D | Sözleşmede gelecekte zamanlanmış yayın → RESULT yok; eski RESULT kaynağı geçersiz; zaman gelince RESULT, sürüm = sözleşme zamanı | ✅ |
| E | Bağımsız zamanlanmış cevap anahtarı → tek ANSWER_KEY | ✅ |
| F | `studentReports=false` → kaynak geçersiz | ✅ |
| G | Hak iptali → kaynak geçersiz | ✅ |
| H | 2 sa önce hatırlatma yok; 30 dk önce tek REMINDER; aynı sürümde OPEN yok; başlangıç sonrası REMINDER kaynağı geçersiz | ✅ |
| H | Saat değişti (yeni sürüm) → açılıştan 5 dk sonra tek OPEN; 20 dk sonra OPEN yok | ✅ |
| I | `examUpdates=false` → satır yok | ✅ |

## 5. Bulunan ve düzeltilen regresyon

İlk E2E koşusunda `measurement-notifications` › "sessiz saat ve günlük özet kaydedilir…" başarısız oldu.

- **Neden:** Tercih PATCH'i web için de kısmi gövdeyi mevcut kayıtla birleştiriyordu. Eskiden 400 dönen eksik sessiz saat gövdesi 200 dönüyordu.
- **Düzeltme:** Kısmi gövde yalnız `x-od-client: mobile` için kabul edilir. Web eskisi gibi tam gövde ister; yeni M5 alanları web gövdesinde isteğe bağlıdır ve mevcut değer korunur.
- **Doğrulama:** Mevcut test **değiştirilmedi**. Yeniden derlemeden sonra geçti.

## 6. Paket sızıntı taraması (Android + iOS Hermes)

Sıfır eşleşme:
- `PrismaClient`, `@prisma`, `server-only`
- `DATABASE_URL`, `NEXTAUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`
- `EXPO_ACCESS_TOKEN`, `PUSH_DELIVERY_MODE`
- `runPushDispatch`, `evaluatePushEligibility`, `classifyNotification`
- `privateNote`

Beklenen eşleşmeler:
- `registerPushDevice` (3): mobilin kendi API istemci fonksiyonu.
- `exp.host` (4) ve `expoPushToken` (2): `expo-notifications` kütüphanesinin token alma kodu.

## 7. Doğrulanamayanlar

- Fiziksel iOS / Android cihazda: izin istemi, kilit ekranı, soğuk açılış, rozet, Android kanal, çalışma alanı geçişi ([m5-rollout-runbook.md](./m5-rollout-runbook.md) §4).
- Gerçek Expo gönderimi ve makbuzu (EAS / APNs / FCM kimlik bilgisi yok).
- Mobil `PushRuntime` için davranış testleri (yeni test yazılmadı; yalnız mevcut Jest paketinin bozulmadığı doğrulandı).
- Vercel `*/2` cron'unun planda desteklendiği.
- Staging DRY_RUN gözlemi.
