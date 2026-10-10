# M5 rollout runbook — Mobil push

**Üretim kararı: NO-GO.** Bu belge, aşağıdaki ön koşullar tamamlandığında izlenecek sırayı tanımlar. Bu çalışmada hiçbir ortamda push açılmadı, üretim veritabanına dokunulmadı, deploy yapılmadı.

## 1. Ortam değişkenleri

| Değişken | Yer | Varsayılan | Not |
| --- | --- | --- | --- |
| `PUSH_DELIVERY_MODE` | sunucu | `DISABLED` | `DISABLED` / `DRY_RUN` / `ENABLED`; bilinmeyen değer DISABLED |
| `EXPO_ACCESS_TOKEN` | sunucu (sır) | boş | Expo "Enhanced push security" açıksa zorunlu; loglanmaz |
| `PUSH_MAX_PER_RUN` | sunucu | 300 | koşu başına kiralanan teslim |
| `PUSH_MAX_FANOUT_PER_RUN` | sunucu | 300 | koşu başına fan-out yapılan bildirim |
| `PUSH_MAX_ATTEMPTS` | sunucu | 5 | deneme tavanı |
| `PUSH_BACKLOG_MAX_AGE_MINUTES` | sunucu | 1440 | daha eski bildirim push'a girmez |
| `PUSH_DELIVERY_RETENTION_DAYS` | sunucu | 30 | teslim satırı saklama |
| `PUSH_DEVICE_IDLE_DAYS` | sunucu | 60 | hareketsiz cihaz iptali |
| `ODK_STUDENT_NOTIFICATIONS` | sunucu | boş (kapalı) | yalnız `ENABLED` açar |
| `CRON_SECRET` | sunucu | mevcut | cron Bearer |
| `EAS_PROJECT_ID` | mobil derleme | yok | yoksa push "desteklenmiyor"; **uydurulmaz** |
| `MOBILE_IOS_BUNDLE_ID`, `MOBILE_ANDROID_PACKAGE` | mobil derleme | yok | M1'den; uydurulmaz |
| `EXPO_PUBLIC_APP_ENV` | mobil derleme | `__DEV__` ise development | sunucuya bilgi amaçlı |

## 2. Ön koşullar (hiçbiri bu çalışmada yapılmadı)

1. EAS projesi ve gerçek `EAS_PROJECT_ID`, bundle ID ve paket adı (ürün sahibi).
2. iOS APNs anahtarı ve Android FCM V1 hizmet hesabı EAS'e yüklenir (`eas credentials`).
3. Expo erişim belirteci oluşturulur; "Enhanced push security" açılır; `EXPO_ACCESS_TOKEN` yalnız sunucu sırrı olarak tanımlanır.
4. Gizlilik metni / KVKK aydınlatması güncellenir (push kanalı, Expo alt işleyici) — hukuk onayı.
5. Migration `0115_mobile_push` staging'e uygulanır (eklemeli). Üretime yalnız onaylı deploy hattıyla uygulanır.
6. Vercel planının `*/2` cron sıklığını desteklediği doğrulanır. Desteklemiyorsa `vercel.json` sıklığı plana göre düşürülür ve gecikme beklentisi güncellenir.
7. Kalıcı otomatik testler (kullanıcı talimatıyla bu fazda yazılmadı) ve gerçek cihaz testleri (§4).

## 3. Aşamalar

| Aşama | Ortam | Ayar | Çıkış ölçütü |
| --- | --- | --- | --- |
| 0 | üretim | `DISABLED` (varsayılan) | migration uygulandı; `push-dispatch` kalp atışı yeşil; metrikler 0 |
| 1 | staging | `DRY_RUN` | 24 sa: `dryRun` artıyor; `skipped*` dağılımı beklenen; hata yok; `oldestPendingAgeMs` < 5 dk |
| 2 | staging | `ENABLED`, iç test hesapları | gerçek iOS + Android cihazda §4 matrisi geçer |
| 3 | staging | `ODK_STUDENT_NOTIFICATIONS=ENABLED` | test denemesiyle REMINDER / OPEN / RESULT / ANSWER_KEY zamanlaması doğru; erken bildirim yok |
| 4 | üretim | `DRY_RUN` | 48 sa gözlem; sayılar bildirim hacmiyle tutarlı |
| 5 | üretim | `ENABLED` | **ayrı ürün + güvenlik onayı ile**; bu çalışma üretimi ENABLED yapmaz |
| 6 | üretim | `ODK_STUDENT_NOTIFICATIONS=ENABLED` | aşama 5 bir hafta sorunsuz |

Push varsayılan olarak kullanıcı başına kapalıdır (`pushEnabled=false`). Açılış, kullanıcılar uygulamadan açtıkça kendiliğinden kademelidir.

## 4. Gerçek cihaz test matrisi (zorunlu, yapılmadı)

| # | Senaryo | iOS | Android |
| --- | --- | --- | --- |
| 1 | Ayarlardan aç → sistem izni → kayıt | ☐ | ☐ |
| 2 | İzin reddi → "Sistem ayarlarını aç" → izin → geri dönünce kayıt | ☐ | ☐ |
| 3 | Ödev ataması → ≤3 dk push, genel metin, kilit ekranında kişisel veri yok | ☐ | ☐ |
| 4 | Ön planda gelen push banner + liste; sayaç yenilenir | ☐ | ☐ |
| 5 | Arka planda dokunma → doğru ekran + okundu | ☐ | ☐ |
| 6 | Soğuk açılış (uygulama kapalı) dokunma → doğru ekran | ☐ | ☐ |
| 7 | Başka çalışma alanına ait bildirim (ör. ODK sonucu, OD'deyken) → çalışma alanı geçişi → hedef | ☐ | ☐ |
| 8 | Rozet = okunmamış sayısı; okununca azalır | ☐ | ☐ |
| 9 | Sessiz saat → ertelenir, bitince gelir | ☐ | ☐ |
| 10 | Kategori kapalı → gelmez | ☐ | ☐ |
| 11 | Çıkış → gelmez; bildirim merkezi + rozet temiz | ☐ | ☐ |
| 12 | Aynı cihazda hesap değişimi → önceki hesabın push'u gelmez | ☐ | ☐ |
| 13 | Uygulamayı sil / yeniden kur → eski kayıt `DeviceNotRegistered` ile iptal | ☐ | ☐ |
| 14 | Deneme Ligi sonucu yayın zamanında (öncesinde değil) | ☐ | ☐ |

## 5. İzleme

`push-dispatch` iş kaydı ayrıntıları ve uyarı eşikleri: [m5-delivery-architecture.md](./m5-delivery-architecture.md) §8. Kalp atışı 10 dk bayatlarsa mevcut cron uyarı hattı tetiklenir.

## 6. Geri alma (kill switch)

1. **Anında:** `PUSH_DELIVERY_MODE=DISABLED` (yeniden deploy / env güncellemesi). Yeni fan-out ve gönderim durur. Kuyrukta kalan teslimler `PUSH_BACKLOG_MAX_AGE` ve TTL nedeniyle yeniden açıldığında `STALE` olur; toplu geç gönderim olmaz.
2. **Deneme Ligi olayları:** `ODK_STUDENT_NOTIFICATIONS` değerini sil. Üretilmiş uygulama içi satırlar kalır (zararsız, kullanıcıya görünür).
3. **Kod geri alma:** Cron girdisini `vercel.json`'dan kaldır; uçlar kalabilir (personel / anonim erişim yok).
4. **Şema:** Migration eklemelidir; geri alma gerekmez. Zorunlu durumda `push_deliveries`, `push_devices` tabloları, iki enum ve `notification_preferences.push_enabled` / `exam_updates` sütunları düşürülür (migration başlığındaki not). **Veri silerek geri alma önerilmez.**
5. Mobil eski sürümler: sunucu uçları kaldırılsa bile kayıt hatası sessizce yutulur; uygulama çalışmaya devam eder.

## 7. Olay müdahalesi

| Belirti | Olası neden | Eylem |
| --- | --- | --- |
| `ticketErrors` / `failedPermanent` sıçraması, `InvalidCredentials` | APNs / FCM kimlik bilgisi | DISABLED; EAS kimlik bilgilerini yenile |
| `devicesRevoked` sıçraması | yanlış proje kimliği / token karışıklığı | DISABLED; `projectId` dağılımını incele |
| `oldestPendingAgeMs` artıyor | cron çalışmıyor / Expo yavaş | kalp atışı, Vercel cron logu; `PUSH_MAX_PER_RUN` |
| Kullanıcı yanlış kişiye push bildirimi | (beklenmez) | DISABLED; `push_devices` token benzersizliği ve oturum eşleşmesi incelemesi; güvenlik olayı süreci |
