# M7 güvenlik incelemesi

## 1. Kimlik ve yetki

- **Bearer token yalnız `Authorization` başlığında.** URL'de token yok; web devamı oturumsuz `/panel/...` yolu açar.
- **Sunucu yetkisi her istekte.** Rol + ürün + personel izni + kaynak ilişkisi. Probe 1–4: kimliksiz 401; ADMIN, öğrenci ve veli 403.
- **İstemci başlığı yetki kanıtı değil.** `x-od-client` yalnız istemci türü / sürüm kapısıdır.
- **Yatay erişim (probe):**
  - başka öğretmenin dersi, teslimi, yardım isteği → 404;
  - atanmamış öğrencinin koç verisi → 404 / 403;
  - başka koçun planı / görevi → 404 / 403;
  - tahmin edilen kimlikler → 404.
- **OD öğretmenliği koçluk açmaz (probe 44).** Koç verisi yalnız aktif `CoachAssignment` ile açılır.
- **MFA / step-up korunur.** 428 `STEP_UP_REQUIRED` → "web'de tamamla" devamı. Mobilde atlatma veya sahte doğrulama yok.

## 2. Gizlilik

| Veri | Kural | Kanıt |
| --- | --- | --- |
| Görüşme `privateNote` | Yalnız koç detayında ve `ok:note:read_private` ile | Probe 38–39: Bugün, liste ve öğrenci yanıtında yok |
| INTERNAL koç notu | Yalnız öğrenci detayında ve `read_private` ile | Probe 28–30 |
| Öğrenciye özel ders notu | Yalnız dersin öğretmenine, ders detayında | Yükleyici `teacherId` süzgeci |
| Check-in yanıtları | Enerji / özgüven gönderilmez; yalnız seçilen engel etiketi; yalnız `shareWithTeacher` | Probe 21–22 |
| Görüşme bağlantısı | Listede yok. Detayda yalnız HTTPS (`httpsOrNull`); mobil yalnız `https:` açar | Probe 36 |
| Dikkat skoru | Bugün DTO'sunda sayısal skor yok | Sözleşme |
| ODK | Bütünlük etiketi, e-posta, doğru cevap yok | Probe 43b |

- Görüşme ve meeting URL'leri **loglanmaz**. Mobil yalnız `Linking.openURL` ile açar.
- Koç öğrenci / ODK öğrenci seçimi yalnız ekran belleğinde tutulur. Detay sorgularında `gcTime: 0` kullanılır; kalıcı saklama yok.
- Önbellek anahtarları kullanıcı + çalışma alanı + `staff/TEACHER` kapsamlıdır. Çalışma alanı değişince sorgular devre dışı kalır.

## 3. Kapsam dışı (bilinçli)

- ODK yönetim izinleri (`odk:exam:edit`, `odk:ops:live`, `odk:grant:manage`, `odk:result:score`, `odk:result:release`, `odk:key:revise`, `odk:package:manage`) mobilde yok.
- ADMIN mobil personel ekranı yok.
- Personel push'u yok.
- Ödev oluşturma / düzenleme, ders ödev taslağı, öğrenci yönetimi, müdahale kutusu ve AI yardımcı mobilde yok (web).

## 4. Paket taraması

iOS ve Android Hermes paketlerinde gizli anahtar, veritabanı URL'si, test parolası ve Bearer değeri yok (m7-validation-results §3).

## 5. Açık riskler

- S-1 / S-2 (m7-staff-permission-review): enforce modunda OD yazma uçları personel iznini denetlemiyor; üretim modu bilinmiyor.
- Gerçek cihazda doğrulanmadı.
