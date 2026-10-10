# M9 kimlik ve erişim kontrol listesi

Tarih: 10 Ekim 2026. Kapsam: Online Dershanem mobil 1.0.0.

Hiçbir kalıcı kimlik veya signing sırrı uydurulmadı. Aşağıdaki kalemlerin tümü BLOCKED / sahibi teyit edecek.

| Gereksinim | Sahip / gerekli işlem | Kanıt |
| --- | --- | --- |
| Apple Developer üyeliği, Team ID | Ürün sahibi aktif üyelik ve release rolü sağlar | Bekliyor |
| iOS bundle ID / ASC app ID | Apple hesap sahibi App ID ve app record açar | Bekliyor |
| Certificate/provisioning | Release operatörü EAS credentials ile yönetir | Bekliyor |
| EAS proje UUID / owner | Expo hesap sahibi gerçek projeyi bağlar, erişimi sınırlar | Bekliyor |
| Android package / keystore | Play sahibi kalıcı paket adı, Play App Signing ve upload key belirler | Bekliyor |
| Google Play app / service account | Play sahibi yetkili internal-track uploader; JSON Git'e girmez | Bekliyor |
| APNs / FCM v1 | Push operatörü EAS'e güvenli yükler; yalnız push pilotundan önce | Bekliyor |
| Staging origin ve test DB | Operasyon production'dan ayrı olduğunu kanıtlar | Bekliyor |
| Production origin ve SHA | Operasyon M1–M7 + M9 backend uyumluluğunu kanıtlar | Bekliyor |
| Review hesapları | QA sentetik veri, MFA gerekirse güvenli review prosedürü sağlar | Bekliyor |
| Hukuk/veri sorumlusu | Resmî kimlik, iletişim, saklama/aktarım ve silme sürecini onaylar | Bekliyor |

Yerelde .p8/.p12/.mobileprovision/.jks/.keystore, credentials.json, servis hesabı JSON ve binary dosyaları commit edilmez. EAS/GitHub/Vercel sırları yalnız ilgili secret store'da; ekran çıktıları ve belgelerde değer yok. Hesap sahipliği, ekip üyeliği ve key rotasyon sorumlusu release ticket'ında tutulur.
