# M6 devir notu — Veli deneyimi

M5 tamamlandı (yerel doğrulama; üretim NO-GO). **M6'ya başlanmadı.**

## 1. Veliler için M5'ten hazır olanlar

- **Cihaz kaydı:** `POST /api/panel/push-devices` PARENT rolünü kabul eder. Veli ayar ekranı (`account/notifications`) öğrenciyle aynıdır.
- **Push uygunluğu:** Dağıtıcı STUDENT ve PARENT bildirimlerini fan-out eder. Veliye giden bildirimler genel sınıfa düşer:
  - `ABSENCE`, `ASSIGNMENT`, `LESSON_SUMMARY`;
  - `SUMMARY` (günlük özet);
  - `/panel/veli/...` yollu SYSTEM satırları.
- **Kilit ekranı:** Metin genel; çocuğun adı, notu, devamsızlık ayrıntısı **yer almaz**.
- **Tercihler:** `GET/PATCH /api/panel/notifications/preferences`. Veli için `weeklyDigest`, `absence`, `assignment`, `lessonSummary` anlamlıdır. `examUpdates` yalnız öğrenci Deneme Ligi olaylarına uygulanır (M5'te veliye ODK olayı üretilmez).

## 2. M6'nın yapması gerekenler (push tarafı)

1. **Veli hedefleri:**
   - `mobile/src/navigation/route-map.ts#mapNotificationHref` şu an yalnız yetkili menü öğelerini çözer.
   - Veli ekranları (Bugün, Dersler, Ödev, Koçluk, Haftalık özet) eklenince `/panel/veli/...` → native rota eşlemesi eklenmeli.
   - `workspaceForWebPath` veli yollarını bugün `null` döndürür.
2. **Çocuk bağlamı:**
   - Bildirim belirli bir çocuğa aitse hedef ekran `studentId` bağlamını kimlikli uçtan yeniden doğrulamalı (`resolveParentScope`).
   - Push yükü `studentId` **taşımaz**; yalnız `notificationId`.
3. **Veli olay kaynakları (ürün kararı):**
   - Haftalık özet yayını, devamsızlık, Deneme Ligi raporu.
   - Her yeni kaynak için: `sourceType` + kararlı `notificationKey`, sınıflandırma satırı (`lib/push/classification.ts`), gönderim anında kaynak geçerlilik kontrolü (ilişki bitti / görünürlük kapandı → `SOURCE_INVALID`).
4. **Görünürlük izinleri:** Velinin görmediği bir alan push metnine hiç girmemeli. Genel metin kuralı korunmalı.
5. **Çoklu çocuk:** Rozet tüm okunmamışları sayar (kullanıcı düzeyi). Çocuk başına rozet gerekmez.

## 3. Açık M5 maddeleri (M6'yı engellemez)

- **Gerçek cihaz testleri** ve EAS / APNs / FCM kimlik bilgileri ([m5-rollout-runbook.md](./m5-rollout-runbook.md) §2, §4).
- **Kalıcı otomatik testler** (kullanıcı talimatıyla yazılmadı; önerilir):
  - Entegrasyon: cihaz kaydı yetkisi, hesap değişimi, tercih kısmi / tam PATCH, tekil bildirim sahipliği, dağıtıcı uygunluk matrisi, ODK olay zamanlaması.
  - Mobil Jest: `PushRuntime` dokunma / soğuk açılış / çalışma alanı geçişi, `workspaceForWebPath`, ayar ekranı izin durumları.
- Push için `inAppEnabled` zorunluluğu (başlangıç sınırlaması; ayrı kanal tercihi istenirse şema değişmez, yalnız uygunluk kuralı değişir).
- M4'ten **BLOCKED:** web sonuç sayfasında `correctOption` politikası.
- M5-S3: kilit ekranı metninin tamamen genelleştirilmesi (ürün / hukuk kararı).

## 4. Kurallar (değişmedi)

- Personel push'u M7'ye kadar kapalı.
- Ödeme / finans bildirimi push'a çıkmaz.
- Yeni bildirim veritabanı, WebSocket veya ücretli servis eklenmez.
