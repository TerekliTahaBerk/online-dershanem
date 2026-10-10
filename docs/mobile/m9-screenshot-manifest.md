# M9 mağaza ekran görüntüsü manifesti

Tarih: 10 Ekim 2026. Kapsam: Online Dershanem mobil 1.0.0.

Durum: NOT VERIFIED; final screenshot üretilmedi. Render edilmiş gerçek uygulama + sentetik veri gerekir; mockup mağaza ekranı değildir. Öğrenci adı, e-posta, sonuç ve koç notlarında canlı kişisel veri kullanılmaz.

| Sıra / dosya | Gerçek ekran | Rol / kontrollü veri | Cihaz / ölçü | Onay |
| --- | --- | --- | --- | --- |
| 01-od-today.png | od-home | OD öğrenci, sentetik ders | iPhone Dynamic Island medium: 1206×2622 | Bekliyor |
| 02-od-lessons.png | od-lessons / assignments | Aynı öğrenci, sentetik ödev | Aynı | Bekliyor |
| 03-yon-coaching.png | yon-coaching | OK öğrenci, sentetik görüşme | Aynı | Bekliyor |
| 04-yon-plan.png | yon-plan | APPROVED OK plan | Aynı | Bekliyor |
| 05-odk-results.png | exam-result | RELEASED + PUBLISHED sentetik sonuç; anahtar kapısı | Aynı | Bekliyor |
| 06-progress.png | od-progress | Kontrollü eğitim ilerlemesi | Aynı | Bekliyor |
| 07-parent.png | parent-home | Veli + iki sentetik çocuk | Aynı | Bekliyor |

Android karşılıkları `android-01-...png`, 1080×1920 gerçek device/emulator capture; kaynağı ve SHA'yı kaydedin. Apple güncel rehberi Dynamic Island medium ekran ister; 1206×2622 bu kategori için kabul edilen dikey ölçüdür. Large ekran için ek 1320×2868 capture hazırlanabilir; Play JPEG/24-bit PNG, 320–3840 px ve en uzun kenar en kısa kenarın en fazla iki katı koşullarını upload anında doğrulayın. iPad supportsTablet=false; yanıltıcı tablet ekranları eklemeyin.

Her capture yanında build/version, platform/model/OS, test data fixture ref, tarih, reviewer ve PASS/FAIL kaydı tutulur. Status bar, safe area ve Türkçe uzun metinler crop ile gizlenmez. Dynamic Type ve VoiceOver QA ayrıca yapılır.

Kontrol edilen kaynaklar: [Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications), [Play preview assets](https://support.google.com/googleplay/android-developer/answer/9866151).
