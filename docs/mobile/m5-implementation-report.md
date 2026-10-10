# M5 uygulama raporu — Push bildirimleri, cihaz kaydı, çalışma alanları arası senkron

**Durum:** UYGULANDI + YEREL OLARAK DOĞRULANDI. Staging doğrulaması yok. **Üretim: NO-GO.**
**Kapsam dışı (yapılmadı):** M6 / M7 / M8, native sınav yürütme, personel push'u, üretim deploy / push / veri değişikliği, mağaza gönderimi.
**Test politikası:** Kullanıcı talimatıyla ("Kesinlikle test yazma") yeni otomatik test dosyası veya test vakası **commit'lenmedi**. Doğrulama mevcut paketler ve commit'lenmeyen geçici probe'larla yapıldı ([m5-validation-results.md](./m5-validation-results.md)).

## 1. Durum sözlüğü

| Etiket | Anlam |
| --- | --- |
| IMPLEMENTED | Kod repoda |
| LOCALLY VALIDATED | Yerel Postgres + üretim derlemesi + sahte Expo yanıtı / gerçek HTTP ile doğrulandı |
| STAGING VERIFIED | Staging ortamında gerçek Expo / cihaz ile doğrulandı |
| PRODUCTION READY | Runbook ön koşulları + onaylar tamam |

## 2. Alt fazlar

| Faz | İçerik | IMPLEMENTED | LOCALLY VALIDATED | STAGING VERIFIED | PRODUCTION READY |
| --- | --- | --- | --- | --- | --- |
| M5.0 | Taban çizgisi | ✅ | ✅ | — | — |
| M5.1 | Şema: `push_devices`, `push_deliveries`, `pushEnabled` (false), `examUpdates`; migration `0115_mobile_push` (eklemeli) | ✅ | ✅ (taze zincir, diff boş) | ❌ | ❌ |
| M5.2 | Cihaz kayıt / iptal / liste uçları; tekil bildirim ucu; tercih GET + geriye uyumlu PATCH | ✅ | ✅ (HTTP probe 29 kontrol) | ❌ | ❌ |
| M5.3 | Kalıcı dağıtıcı: fan-out, `SKIP LOCKED` kiralama, uygunluk, Expo partileri, biletler | ✅ | ✅ (dağıtıcı probe 24 kontrol, sahte Expo) | ❌ | ❌ |
| M5.4 | Makbuzlar, yeniden deneme / geri çekilme, cihaz iptali, temizlik, metrikler, kalp atışı | ✅ | ✅ | ❌ | ❌ |
| M5.5 | Çalışma modları DISABLED / DRY_RUN / ENABLED (varsayılan DISABLED); cron `*/2` | ✅ | ✅ | ❌ | ❌ |
| M5.6 | Mobil: izin, token, kayıt, çıkış / hesap değişimi, ayar ekranı (push, kategoriler, sessiz saat, günlük özet) | ✅ | ⚠️ tsc / lint / Jest / dışa aktarma; **gerçek cihaz yok** | ❌ | ❌ |
| M5.7 | Dokunma → tekil okuma → okundu → hedef; soğuk açılış; çalışma alanı geçişi; rozet; ön plan alımı | ✅ | ⚠️ yalnız statik + mevcut Jest; **cihaz yok** | ❌ | ❌ |
| M5.8 | Deneme Ligi REMINDER / OPEN / RESULT / ANSWER_KEY (`ODK_STUDENT_NOTIFICATIONS`, varsayılan kapalı) | ✅ | ✅ (ODK probe 21 kontrol, gerçek sözleşme kuralları) | ❌ | ❌ |
| M5.9 | Doğrulama, belgeler, runbook | ✅ | ✅ | — | — |

## 3. Sunucu değişiklikleri

- **Şema** (`prisma/schema/system.prisma`, `auth.prisma`, `prisma/migrations/0115_mobile_push`):
  - `PushPlatform`, `PushDeliveryState`, `PushDevice`, `PushDelivery`.
  - `NotificationPreference.pushEnabled` (false), `examUpdates` (true).
- **`lib/push/`:**

  | Dosya | İçerik |
  | --- | --- |
  | `config.ts` | Mod ve sınırlar |
  | `classification.ts` | İzin listesi + genel metin |
  | `eligibility.ts` | Saf uygunluk kararı |
  | `expo-client.ts` | HTTPS, zaman aşımı, hata sınıflandırma |
  | `device-server.ts` | Kayıt / iptal / liste |
  | `dispatcher.ts` | Dağıtıcı |

- **`lib/odk/student-notifications.ts`:** Deneme Ligi olay üreticisi + gönderim anı kaynak doğrulaması. `odk-exam-lifecycle` cron'una bağlandı.
- **`lib/notification-producer.ts`:** `isNotificationSourceCurrent` dışa açıldı; mevcut davranış değişmedi.
- **Uçlar:**
  - `app/api/panel/push-devices`
  - `app/api/panel/notifications/[id]`
  - `app/api/panel/notifications/preferences` (GET eklendi; PATCH web için değişmedi, mobil için kısmi)
  - `app/api/cron/push-dispatch`
- **İşletim:**
  - `lib/jobs/health.ts` (`push-dispatch` kritik cron)
  - `vercel.json` (`*/2`)
  - `.env.example` (yeni değişkenler)

## 4. Mobil değişiklikleri

- **Bağımlılık:** `expo-notifications ~57.0.12` (SDK 57 uyumlu, `EXPO_OFFLINE=1 npx expo install`). `app.json` eklentisi `defaultChannel: "default"`.
- **Push katmanı:**
  - `src/lib/push/native-push.ts`: destek tespiti, izin, Android kanal, token, rozet, yerel temizlik.
  - `src/lib/push/registration.ts`: koşullu kayıt, iptal.
  - `src/lib/api/push.ts`: uç istemcileri.
  - `@contracts/push`: sözleşme ayrıştırıcıları.
- **`src/features/push/push-runtime.tsx`:**
  - Ön plan gösterimi (banner + liste, sessiz).
  - Dokunma tekilleştirme.
  - Soğuk açılış (`getLastNotificationResponse`).
  - Token dinleyicisi.
  - Rozet = okunmamış sayısı.
  - Ön planda gelen push'ta sayaç yenileme.
  - Hedef çözümü: tekil uç → okundu → `mapNotificationHref`. Hedef başka ürüne aitse `workspaceForWebPath` ile çalışma alanı geçişi, sonra hedef; bulunamazsa bildirim listesi.
- **`src/features/push/notification-settings.tsx`** (Hesap → Bildirim ayarları, yalnız öğrenci / veli):
  - Destek ve izin durumu, push aç / kapat, sistem ayarlarına yönlendirme.
  - Kategoriler, sessiz saat ön ayarları, günlük özet.
- **`session-provider.tsx`:** Çıkışta cihaz iptali (en iyi çaba), yerel push durumu ve rozet temizliği.
- **`route-map.ts`:** `workspaceForWebPath`.

## 5. Bilinçli kararlar

Ayrıntı: MD-21, [m5-delivery-architecture.md](./m5-delivery-architecture.md).

1. Push varsayılan kapalı (kullanıcı ve sunucu).
2. Kilit ekranında genel metin; yük yalnız `notificationId`.
3. Gönderim anında tam yeniden uygunluk; ödeme ve personel hariç.
4. Kayıttan önceki birikim gönderilmez.
5. En az bir kez teslim; olası çift bildirim kabul edilen risk.
6. `inAppEnabled` push için de ön koşul (başlangıç sınırlaması).
7. Web tercih PATCH sözleşmesi korunur (ilk denemede bozulup E2E ile yakalandı ve düzeltildi; [m5-validation-results.md](./m5-validation-results.md) §5).

## 6. Kalan işler / riskler

- EAS proje kimliği, APNs / FCM kimlik bilgileri, Expo erişim belirteci (verilmedi, uydurulmadı).
- Gerçek cihaz testleri (iOS + Android).
- Kalıcı otomatik testler (talimat gereği yazılmadı).
- KVKK metni güncellemesi.
- Vercel planının `*/2` cron sıklığı.
- Çevrimdışı çıkış riski (M5-S1).
- Kilit ekranı metninin tamamen genelleştirilmesi (M5-S3).
- M4'ten BLOCKED `correctOption` maddesi.

Devir: [m6-handoff.md](./m6-handoff.md).
