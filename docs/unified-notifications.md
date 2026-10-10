# Unified Notifications

Cross-product bildirim orchestration prensipleri.

## Duplicate önleme

Aynı olay için üç ayrı push **üretilmez**:

- Assignment create → tek ASSIGNMENT notification
- Koçum projection → ayrı notification yok (plan içinde görünür)

Event consumer'lar notification oluşturmaz; kaynak mutation notification üretir.

## Priority

| Seviye | Örnek |
| --- | --- |
| High | Sınav/ders başlıyor, kritik deadline |
| Normal | Ödev, plan publish |
| Low | Progress summary |

Mevcut: `NotificationPreference` kategorileri (`assignment`, `lessonSummary`, …).

## Orchestration roadmap

`notification-orchestrator` consumer slot reserved — central dedup key:

```text
{userId}:{sourceType}:{sourceId}:{category}
```

## Veli özeti

`WeeklyDigest` — üç ürün sinyallerini birleştirir (`calm-weekly-digest`).

Structured evidence'a dayanmalı; vanity score yok.

## Audit

Cross-product aksiyonlar audit log + event payload ile izlenebilir.

## Merkezi üretici (Faz 5)

`notification-producer.ts` yeni ders, koçluk görüşmesi ve koç plan onayı
hatırlatmalarının üreticisidir. Faz 3/4 adaptörü aynı kalıcı anahtarı korur;
kategori tercihi ile panel/e-posta kanalları bağımsızdır. Eski bildirim
üreticileri sonraki taşıma kapsamındadır. WhatsApp sağlayıcısı eklenmez.

Sessiz saatler İstanbul saatinde kullanıcı tarafından seçilir; gece yarısını
aşabilir. Günlük özet varsayılan false'tur ve açıldığında kullanıcı saat
seçmelidir. Bekleyen içerik mevcut `Notification` satırında görünmez olarak
tutulur; yeni kimlik/saklama sistemi yoktur. Menü, liste API'si ve okundu
işlemi görünmez satırları dışlar. Mevcut bildirim silme/cascade yaşam döngüsü
bu satırlara da uygulanır.

15 dakikalık `lesson-reminders` işi bekleyen teslimatları işler. Kaynak iptali,
saat değişikliği, sona ermiş grup/koç/veli ilişkisi ve değişen kanal/kategori
tercihi teslimattan önce yeniden değerlendirilir. Başlamış ders/görüşme için
bekleyen hatırlatma bastırılır. Sessiz saat sırasında teslimat ertelenir.
Günlük özet anahtarı `{userId}:SUMMARY:{istanbulDate}:DAILY`; panel ve e-posta
kuyruğunda tekildir. O günün özetinden sonra gelen içerik sonraki güne gider.
Hesap/parola ve ödeme mesajları bu opsiyonel hatırlatma tercihine taşınmaz.

Geri alma: `lesson-reminders` üretimini geçici olarak durdurun; üretici,
tercih arayüzü ve bu fazın ana sayfa/ölçüm eklerini geri alın. 0111 eklemeli
migration ve tercih verisini koruyun. `PanelShell`, bildirim sayfası/liste
API'si, okundu API'si ve veli ödeme sinyali sorgusundaki `inAppVisible`
filtrelerini geri alma patch'inde koruyun; böylece bekleyen ve e-posta için
saklanan satırlar eski kodda müşteri ekranına açılmaz. Veriyi silerek geri
alma yapılmaz. Yeniden teslimata geçmeden önce bekleyen kaynaklar ve tercihler
merkezi worker ile tekrar doğrulanmalıdır.

## Mobil push kanalı (M5)

Push, kanonik `Notification` satırlarının **ek bir teslim kanalıdır**. Yeni
bildirim veritabanı veya kuyruk yoktur; üreticiler değişmez. Ayrıntı:
[mobile/m5-delivery-architecture.md](./mobile/m5-delivery-architecture.md).

- `push-dispatch` cron'u (2 dk) görünür, okunmamış, bekleme dışı satırları
  etkin cihazlara dağıtır (`push_deliveries`, bildirim × cihaz tekil).
- Varsayılan `PUSH_DELIVERY_MODE=DISABLED`; kullanıcı düzeyinde
  `pushEnabled` varsayılan false.
- Push yalnız STUDENT / PARENT içindir. Ödeme / finans ve personel
  bildirimleri push'a çıkmaz.
- Sessiz saat, kategori tercihi, oturum / cihaz geçerliliği ve kaynak
  geçerliliği **gönderim anında** yeniden değerlendirilir. Doğrudan yazılan
  bildirimler de sessiz saate uyar.
- Kilit ekranı metni kategoriye göre geneldir; yük yalnız `notificationId`
  taşır, içerik uygulamada kimlikli uçtan (`GET /api/panel/notifications/[id]`)
  okunur.
- Deneme Ligi öğrenci olayları (REMINDER / OPEN / RESULT / ANSWER_KEY)
  `odk-exam-lifecycle` içinde üretilir; anahtar
  `{userId}:ODK_EXAM:{examId}:{KIND}:{sürüm}`, tercih anahtarı `examUpdates`,
  bayrak `ODK_STUDENT_NOTIFICATIONS=ENABLED` (varsayılan kapalı).

Geri alma: `PUSH_DELIVERY_MODE=DISABLED` anında gönderimi durdurur; 0115
eklemeli migration korunur. Runbook:
[mobile/m5-rollout-runbook.md](./mobile/m5-rollout-runbook.md).
