# M5 cihaz ve token yaşam döngüsü

Kod:
- Sunucu: `lib/push/device-server.ts`, `app/api/panel/push-devices/route.ts`, `lib/push/dispatcher.ts` (temizlik).
- Mobil: `mobile/src/lib/push/native-push.ts`, `mobile/src/lib/push/registration.ts`, `mobile/src/features/push/push-runtime.tsx`, `mobile/src/features/push/notification-settings.tsx`, `mobile/src/lib/auth/session-provider.tsx`.

## 1. Veri modeli (`push_devices`)

| Alan | Anlam |
| --- | --- |
| `userId`, `sessionId` | Sunucu oturumundan. Oturum silinirse kayıt da silinir (FK cascade). |
| `expoPushToken` | Benzersiz. Aynı anda tek kullanıcıya bağlıdır. Hiçbir yanıtta dönmez, loglanmaz. |
| `platform`, `appVersion`, `projectId?`, `appEnvironment?`, `permissionStatus?` | Bilgi / tanı amaçlı. |
| `activatedAt` | Kayıt anı. Bu andan **önce** oluşmuş bildirimler bu cihaza gönderilmez (birikim yok). |
| `lastSeenAt` | Son kayıt / yenileme. |
| `revokedAt`, `revokedReason` | İptal. Nedenler aşağıda. |

## 2. Kayıt koşulları (mobil)

Kayıt yalnız şu üç koşul birlikteyken yapılır (`syncPushRegistration`):
1. Sunucuda `pushEnabled = true`. Varsayılan **false**; kullanıcı ayarlardan açar.
2. İşletim sistemi izni verilmiş (iOS `provisional` dahil).
3. Ortam destekliyor: gerçek cihaz, Expo Go değil, EAS proje kimliği var.

Desteklenmeyen durumlar: web, simülatör / emülatör, Expo Go (`EXPO_GO`), `EAS_PROJECT_ID` yok (`NO_PROJECT_ID`). Bu durumlarda ayar ekranı açıklama gösterir, kayıt denenmez.

## 3. İzin akışı

- Açılışta **izin istenmez**. İstem yalnız kullanıcı "Bildirimleri aç" dediğinde açılır.
- Sıra:
  1. İzin istenir.
  2. İzin verilirse `PATCH preferences { pushEnabled: true }` gönderilir.
  3. Ardından kayıt yapılır.
- Reddedilmişse (`canAskAgain = false`) sistem istemi tekrar açılmaz. Ekran "Sistem ayarlarını aç" (`Linking.openSettings`) önerir.
- Uygulama ön plana döndüğünde (`AppState active`) izin yeniden okunur. Kullanıcı izni sistemden açtıysa kayıt yenilenir.
- Android 8+: token alınmadan önce `default` kanalı oluşturulur.

## 4. Olaylar ve sonuçları

| Olay | Mobil | Sunucu |
| --- | --- | --- |
| Push'u aç | izin → PATCH true → kayıt | yeni kayıt (`activatedAt = now`) |
| Push'u kapat | PATCH false → DELETE | oturumun kayıtları `USER_UNREGISTERED`; bekleyen teslimler `CANCELED` |
| Token rotasyonu (`addPushTokenListener`) / yeniden kurulum | `force` ile yeniden kayıt | aynı oturumun diğer etkin kayıtları `TOKEN_ROTATED` |
| Aynı token tekrar kayıt | bellek içi tekrar engeli | aynı satır güncellenir; iptal edilmişse yeniden etkinleşir ve `activatedAt` yenilenir |
| Çıkış (çevrimiçi) | `DELETE` (en iyi çaba) → logout → rozet 0 + bildirim merkezi temizliği | kayıt iptal; logout oturumu iptal eder |
| Çıkış (çevrimdışı) | yerel temizlik | kayıt kalır, ama oturum geçersiz olduğu için gönderimde `SESSION_INVALID`; temizlik `SESSION_ENDED` ile iptal eder |
| Hesap değişimi (aynı cihaz, B girişi) | önceki oturum çıkışı + B için kayıt | token A'daysa A kaydı **silinir**, B için temiz kayıt. A'nın bildirimi B'nin cihazına gitmez |
| Oturum iptali (parola değişimi, yönetici, MFA) | — | gönderimde `SESSION_INVALID`; temizlikte `SESSION_ENDED` |
| Hesap askıya alma | — | gönderimde `USER_INACTIVE` |
| Expo `DeviceNotRegistered` (bilet veya makbuz) | — | kayıt `DeviceNotRegistered` ile iptal |
| 60 gün görülmeme | — | `IDLE` ile iptal (`PUSH_DEVICE_IDLE_DAYS`) |

## 5. Güvenlik özellikleri

- Anonim kayıt yok: geçerli oturum + tamamlanmış kapılar gerekir.
- Kullanıcı / oturum gövdeden alınmaz.
- Bir token iki kullanıcıda aynı anda etkin olamaz (benzersiz kısıt + serileştirilebilir işlem; P2002 / P2034'te bir kez yeniden deneme).
- Önceki kullanıcının kaydı yeniden kullanılmaz: silinir, teslim geçmişi de silinir.
- Personel rolleri kayıt yapamaz (403).
- Token mobilde depolanmaz; yalnız bellekte tutulur.
- Gönderim anında cihaz, oturum, kullanıcı ve tercih **yeniden** kontrol edilir. Kayıt anındaki durum yetki sayılmaz.

## 6. Kalan riskler

- **Çevrimdışı çıkış:** Logout sunucuya ulaşmazsa oturum, süresi dolana veya iptal edilene kadar geçerli kalır. Bu sürede cihaz push alabilir. Etki sınırlı: yük yalnız genel metin ve opak kimlik taşır, içerik kimlikli uçtan okunur ve uygulama artık çıkış yapmıştır.
- **Uygulama silme:** Expo, sonraki gönderimde `DeviceNotRegistered` döndürür. Kayıt o zaman iptal edilir; arada en fazla bir başarısız deneme olur.
- **Fiziksel cihaz doğrulaması yapılmadı.** iOS / Android gerçek cihaz testleri rollout ön koşuludur ([m5-rollout-runbook.md](./m5-rollout-runbook.md)).
