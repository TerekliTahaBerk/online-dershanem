# M9 yayın denetimi

Tarih: 10 Ekim 2026. Kapsam: Online Dershanem mobil 1.0.0.

## Doğrulanan taban

`git fetch origin` başarılı. Başlangıç dalı `main`, HEAD ve origin/main `2c8c0995`; fark 0/0. M1 `4e8e4ed3` (#438), M2–M7 `2c8c0995` (#439) ile main'e birleşmiş. Eski handoff belgelerindeki “birleşmedi” ifadeleri tarihsel kayıttır. M9 dalı `test/m9-mobile-release-readiness`. Üretimde bu commit'in dağıtıldığı doğrulanmadı.

SDK: Expo 57, React Native 0.86.2, React 19.2.3; mobilin ayrı package-lock dosyası var. M8 uygulanmıyor. Yeni otomatik test yok. Web PAYTR satış sistemi korunur; mobilde satış, fiyat, checkout veya satın almaya yönlendirme yok.

## Envanter

| Alan | Kaynak / durum | Eylem sahibi |
| --- | --- | --- |
| EAS profilleri | mobile/eas.json, development/preview/production | Release mühendisi |
| Kalıcı kimlikler | MOBILE_IOS_BUNDLE_ID, MOBILE_ANDROID_PACKAGE eksik | Ürün sahibi kayıtlı değerleri sağlar |
| EAS proje/hesap sahibi | EAS_PROJECT_ID eksik; organization doğrulanmadı | Ürün sahibi |
| API | Yerelde .env; gizli değerler bu belgeye alınmadı | Operasyon staging/production originlerini doğrular |
| Prod aday web adresi | https://www.onlinedershanem.com; dağıtım/API uyumluluğu kanıtlanmadı | Operasyon |
| Staging | Ayrı origin ve izole DB verilmedi | Operasyon |
| İmzalama | Apple Team/APNs/provisioning, Android keystore/FCM/Play servis hesabı yok | Hesap sahipleri |
| Native paketler | secure-store, notifications, file-system, sharing, datetimepicker, dev-client, updates, Reanimated; yeni binary gerekli | Release mühendisi |
| Bayraklar | MOBILE_MIN_SUPPORTED_VERSION, STAFF_PRODUCT_ASSIGNMENTS, PUSH_DELIVERY_MODE, ODK_STUDENT_NOTIFICATIONS ve mevcut panel bayrakları | Operasyon |
| OTA | Fingerprint runtime, 3 channel; otomatik yayın yok | Release onaylayıcısı |
| Görsel varlıklar | Mevcut od. ikonu 1024×1024; splash 250×137; default Expo adaptive/mono kaldırıldı, adaptive mevcut ikona bağlı. Final mono asset eksik | Tasarım cihazda maskeyi onaylar |

## İncelenen kaynaklar

M7 implementation/validation/security/staff-permission/iphone belgeleri; M6 implementation ve parent-scope-security; M5 security/rollout; M4 security; m8-handoff; roadmap/decisions; role-permission-matrix; heuristic data inventory; deployment/rollback; app config, auth/API/query/files/push/navigation; CI ve release workflowları. Kaynak kod belgelerden üstündür.

## Eski bulguların V1 etkisi

| Bulgu | Karar ve sonuç |
| --- | --- |
| M4 correctOption | Yayın engeli: web iki gösterimi artık answerKeyAvailable ile kapılı; mobil zaten kapılı. Gerçek HTTP/SSR kanıtı bekleniyor. |
| M5 push | Üretim NOT VERIFIED; varsayılan DISABLED korunur. Paketleme teslim kanıtı değildir. |
| M6 P-1 | OK/ODK velisinin geri bildirimi sınırlı; mevcut feedbackAvailable kapısı korunur. Ürün kararı; vaat edilmez. |
| P-2/P-3 | Veli saat değişikliği ve katılım bağlantıları web'de; native özellik olarak ilan edilmez. |
| P-4 | Taslak OK planının sayıları ana sayfaya girebilir; içerik değil özet sayısı. Düşük, açık; fiziksel QA kaydına alınır. |
| S-1 | Üç OD yazma ucu requireStaffApi(OD, od:lesson:teach) ile sıkılaştırıldı; assignment modu değişmedi. |
| S-2 | Üretim shadow/enforce ve atama verisi bilinmiyor: personel dağıtımı BLOCKED. |
| S-3 | OK menüsü/OD yardım yanıtı ayrımı; canRespond kapısı korunur, izin genişletilmez. |
| S-4 | Ortak koç yükleyicisinde productRef.code=OK süzgeci eklendi. |
| S-5 | Web hazırlık INTERNAL notları ve sütunu artık ok:note:read_private ile süzülür; enforce gerçek ortam kanıtı beklenir. |
| S-6/S-7 | Web kuyruklarında değerlendirilemeyen teslim/atanmamış plan satırı riski; yazma uçları reddeder. Açık, yanlış başarı yok. |
| S-8/S-9 | Mobil rapor daha dar; tekrarlanan değerlendirme 404 ile güvenli yenileme. |
| Eski test hataları | M7 sonuçlarıyla karşılaştırma m9-validation-results belgesinde. |

Gizlilik, hesap silme, ödeme modeli sınıflandırması ve fiziksel cihaz kanıtı olmadan mağaza hazır denmez.
