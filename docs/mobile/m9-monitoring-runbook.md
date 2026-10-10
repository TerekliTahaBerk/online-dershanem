# M9 mobil izleme ve geri alma

Tarih: 10 Ekim 2026. Kapsam: Online Dershanem mobil 1.0.0.

Yeni üçüncü taraf analytics/crash SDK eklenmedi. Mevcut backend health, auth hata sınıfları, ürün olayları ve operasyon logları kullanılır; native crash/launch için ASC/TestFlight diagnostics ve Play Android vitals erişimi gerekir. Bu kanallar bu çalışmada bağlanmadı. Mobil root error boundary raw exception/stack/URL göstermez. Merkezi release scan review edilmemiş console çıktısını reddeder.

## Pilot gözlem

Release operatörü ilk 1 saat yakın, sonra ilk 24/48 sa günlük pilot kontrolü yapar. Her gözlem SHA/build/OS/platform/backend release'e bağlıdır. Hesap ID'leri ve akademik içerik loglara/rapora eklenmez. Sadece sayı, hata kodu, sürüm, anonim olay grubu ve kontrollü correlation ref kullanın.

| Sinyal | Aksiyon / stop kriteri |
| --- | --- |
| Crash/launch | Tek tekrarlanabilir giriş engelleyen crash bile pilotu durdurur; yaygın crash'te rollout durur |
| Auth/MFA/401 | Test hesabında 3 ardışık başarısız giriş/refresh → uyumluluk ve session incelemesi |
| API/screen yükleme | Aynı kritik uçta 5 dk sürekli 5xx → dağıtımı durdur, backend health kontrolü |
| Teacher closure/review | Çift mutation/veri kaybı veya yaygın kapanış hatası → pilot durur |
| Parent/staff erişim | Tek cross-user exposure / izinsiz private note → anında güvenlik stop |
| ODK | Tek erken cevap/score yayını → güvenlik stop; sözleşme/yayın kapısını incele |
| Push (etkinse) | Yanlış recipient/private payload → DISABLED; cron/credential failure ayrıca incele |
| Version/API | Min version ile dağıtılmış binary uyuşmazsa rollout durur; uyumlu backend korunur |
| Privacy/deletion | Yanıltıcı disclosure veya işlemeyen silme → public release NO-GO |

## Geri alma sırası

1. Release sahibi yeni build/submit/OTA dağıtımını durdurur; olay ve etkilenen build'leri kaydeder.
2. Play staged rollout halt; App Store phased release pause. Zaten yüklenmiş binary kullanıcı cihazından geri çekilemez; store UI değişikliği eski binary'yi kaldırmaz.
3. JS-only uyumlu hata: onaylı environment/aynı fingerprint için bilinen iyi update republish: `npx eas-cli update:republish --group <GOOD_GROUP_ID> --destination-channel production`. Güncel CLI `--help` ve runtime/platform'u doğrulayın. Native değişiklikte yeni binary gerekir.
4. Embedded JS'ye dönüş gerekiyorsa `npx eas-cli update:roll-back-to-embedded --channel production` güncel CLI/runtime seçimlerini doğrulayıp yalnız onayla çalıştırılır. İlgili runtime/platform için uygundur; native uyumsuzluğu çözmez.
5. Backend rollback mevcut Vercel runbook'una göre, deployed mobile API'leri korunarak yapılır. M1–M7 API veya migration tabloları körlemesine kaldırılmaz.
6. Push sorunu: `PUSH_DELIVERY_MODE=DISABLED`, ODK_STUDENT_NOTIFICATIONS kapalı. İzin/tercih yine kullanıcıda kalır; in-app merkez korunur.
7. İyileşmeyi sentetik hesapla doğrulayın; tekrar rollout için yeni karar ve evidence gerekir.

Native build/permission/entitlement değişimi OTA ile çözülmez. Güncel [EAS Update CLI](https://docs.expo.dev/eas/cli/) komutlarını operatör yayın tarihinde kontrol eder. Production env/deploy/OTA değişiklikleri bu görevde yürütülmedi.
