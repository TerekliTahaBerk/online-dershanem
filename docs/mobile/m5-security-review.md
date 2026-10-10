# M5 güvenlik ve gizlilik incelemesi

Kapsam:
- Cihaz kaydı uçları, tercih uçları, tekil bildirim ucu.
- Push dağıtıcısı, Expo istemcisi, Deneme Ligi olay üreticisi.
- Mobil izin / token / dokunma akışı.

İnceleme kod okuması ve geçici yerel probe'larla yapıldı ([m5-validation-results.md](./m5-validation-results.md)). Bağımsız sızma testi ve gerçek cihaz testi **yapılmadı**.

## 1. Tehdit → kontrol tablosu

| # | Tehdit | Kontrol | Doğrulama |
| --- | --- | --- | --- |
| T1 | Anonim / sahte cihaz kaydı | `requireApiAccountRole("STUDENT","PARENT")`; kullanıcı ve oturum sunucu oturumundan; gövde `strict` | HTTP probe 2, 3 |
| T2 | Başka kullanıcı adına kayıt / iptal | gövdede `userId` 400; DELETE `userId` filtresi | HTTP probe 3, 8 |
| T3 | Aynı cihazda hesap değişimi: A'nın bildirimi B'ye | token benzersiz; başka kullanıcıdaki kayıt silinir; teslim anında sahip eşleşmesi (`OWNER_MISMATCH`) | HTTP probe 6; dağıtıcı probe |
| T4 | Çıkış sonrası push | çıkışta DELETE; oturum iptaliyle `SESSION_INVALID`; temizlikte `SESSION_ENDED` | HTTP probe 9; dağıtıcı probe 9, 12 |
| T5 | Askıya alınan hesap / iptal edilen oturum | gönderim anında kullanıcı ve oturum yeniden kontrol | dağıtıcı probe 9, 10 |
| T6 | Kilit ekranında kişisel veri | push metni kategoriye göre sabit; bildirim başlığı / gövdesi KULLANILMAZ; yük yalnız `notificationId` | dağıtıcı probe 3; ODK probe C |
| T7 | Ödeme / finans içeriği | sınıflandırma ödemeyi dışlar | dağıtıcı probe 16 |
| T8 | Personel bildirimleri | fan-out yalnız STUDENT / PARENT; personel kayıt 403 | HTTP probe 4; dağıtıcı probe 18 |
| T9 | Push dokunuşuyla yetkisiz içerik | tekil uç sahip + `inAppVisible`; hedef rota kapıları + sunucu yetkisi yeniden uygulanır; yük yetki taşımaz | HTTP probe 11 |
| T10 | Hak iptali / yayın geri çekme sonrası eski bildirim | gönderim anında `SOURCE_INVALID`; açılan ekran güvenli boş / 404 | dağıtıcı probe 17; ODK probe D, F, G |
| T11 | Erken sonuç bildirimi | sonuç / anahtar yalnız gerçek yayın kurallarıyla (`contractResultAvailable`, `PUBLISHED`) | ODK probe B, D |
| T12 | Token sızıntısı (log / yanıt / depolama) | yanıtlarda token yok; liste ucu token döndürmez; loglarda token yok; mobilde depolanmaz | HTTP probe 1; kod taraması |
| T13 | Expo erişim belirteci sızıntısı | yalnız sunucu env (`EXPO_ACCESS_TOKEN`); mobil pakette yok | dışa aktarma taraması |
| T14 | Çift gönderim / yarış | `@@unique` + `FOR UPDATE SKIP LOCKED` + `claimToken` korumalı yazım | dağıtıcı probe 13/15 (3 eşzamanlı koşu) |
| T15 | Toplu bildirim → maliyet / hız sınırı | koşu başına sınırlar, geri çekilme, deneme tavanı | dağıtıcı probe 4, 4b |
| T16 | Kayıt ucu kötüye kullanımı | `guardMutation` 30 / 15 dk / kullanıcı; Origin varsa aynı köken | probe tekrarında 429 gözlendi |
| T17 | Derin bağlantı / yük manipülasyonu | mobil yalnız `^[\w:.-]{1,191}$` kimliği kabul eder; hedefi yükten değil kimlikli uçtan okur; `mapNotificationHref` izin listesi | kod incelemesi |
| T18 | Yanlışlıkla üretimde açılma | varsayılan DISABLED; bilinmeyen değer DISABLED; ODK olayları ayrı bayrakla kapalı | dağıtıcı probe 1 |

## 2. Kişisel veri (KVKK) değerlendirmesi

| Saklanan | Amaç | Saklama |
| --- | --- | --- |
| Push token, platform, uygulama sürümü, ortam, izin durumu, oturum bağlantısı | teslim | iptal / oturum silinmesi / 60 gün hareketsizlik |
| Teslim durumu, deneme sayısı, Expo bilet kimliği, hata sınıfı | operasyon | 30 gün (`PUSH_DELIVERY_RETENTION_DAYS`) |

- Expo'ya giden veri: token, genel başlık / gövde, opak bildirim kimliği, kanal, TTL. Ad, sınıf, not, net, koç notu, check-in, yardım, ödeme, sözleşme bilgisi gitmez.
- Opak kimlik `userId:SOURCE:sourceId:...` biçiminde olabilir: iç kimlikleri içerir ama kişisel içerik taşımaz ve yetkisiz okunamaz. İsteğe bağlı sertleştirme: yükte bildirim kimliği yerine teslim kimliği.
- Gizlilik metni güncellemesi (push kanalı, Expo alt işleyici) hukuk onayı gerektirir. **Açık madde.**

## 3. Bulgular

| Kod | Önem | Durum | Açıklama |
| --- | --- | --- | --- |
| M5-S1 | Orta | KABUL EDİLEN RİSK | Çevrimdışı çıkışta oturum süresince cihaz push alabilir; yük genel olduğundan etkisi düşük. |
| M5-S2 | Düşük | KABUL EDİLEN RİSK | Zaman aşımı sonrası yeniden deneme çift bildirim üretebilir (at-least-once). |
| M5-S3 | Düşük | AÇIK | iOS kilit ekranında uygulama adı ve kategori metni görünür ("Deneme sonucun açıklandı"). Ürün / hukuk tamamen genel metin isterse `pushCopyFor` sadeleştirilir. |
| M5-S4 | Bilgi | AÇIK | Expo "Enhanced push security" (erişim belirteci) önerilir; `EXPO_ACCESS_TOKEN` desteklenir ama değer bu çalışmada oluşturulmadı. |
| M4-S5 | — | BLOCKED (M4'ten) | Web sonuç sayfasındaki `correctOption` politikası değişmedi. |

Yüksek veya kritik açık bulgu yok.

## 4. Doğrulanmayanlar

- Gerçek APNs / FCM teslimi.
- Fiziksel cihazda kilit ekranı görünümü, soğuk açılış, rozet.
- iOS provisional izin davranışı.
- Android 13+ izin istemi.
- Üretim Vercel cron sıklığı.
- Expo erişim belirteci ile imzalı gönderim.
