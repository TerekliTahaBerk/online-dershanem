# M9 mobil gizlilik envanteri ve store beyan taslağı

Tarih: 10 Ekim 2026. Kapsam: Online Dershanem mobil 1.0.0.

**Hukuken onaylı değildir.** Heuristik ana envanter final sınıflandırma sayılmadı. Kaynaklar: mobile contracts/bootstrap/student/yon/parent/staff, secure-store/query/files, push schemas ve lib/data-governance/dsr. Mobil authenticated backend kayıtlarını işler; “kişisel veri toplanmaz” beyanı yanlış olur.

| Veri / kaynak | Amaç, ilişki ve işleme yeri | Sağlayıcı | Saklama / silme ve store karşılığı |
| --- | --- | --- | --- |
| User ID, ad, e-posta / bootstrap | Hesap, kullanıcıya bağlı; backend DB, mobil bellek | Backend barındırma/DB sağlayıcıları hukukça teyit edilmeli | DSR kimlik anonimizasyonu/silme; Contact Info, User IDs |
| Token, session ID, cihaz/sürüm / auth | Kimlik doğrulama; backend + native SecureStore | OS Keychain/Keystore; backend altyapı | Çıkışta token/cache silinir, sunucu oturum iptali; Identifiers / app functionality |
| Öğrenci ders/ödev/attendance/progress | Eğitim hizmeti; StudentProfile/User bağlantılı; DB + RAM | Backend altyapı | Eğitim kaydı saklama kararı eksik; User Content / Other Data sınıflaması kontrol edilmeli |
| Veli–çocuk ilişkileri | Yetkili akademik erişim; backend + RAM | Backend altyapı | İlişki doğrulaması ve DSR bağımlılık incelemesi; linked to user |
| Koç plan/check-in/not/görüşme | Hizmet; serbest metinde özel bilgi olabilir; backend + RAM | Backend, dış meeting sağlayıcısı link açıldığında | INTERNAL yalnız yetkili koç; saklama kararı eksik; User Content |
| ODK sonuç/net/kazanım | Yayınlanmış akademik analiz; backend + RAM | Backend altyapı | Sonuç grant/yayın kapıları ve DSR; linked User Content/Other Data |
| Push token/platform/izin/session | İsteğe bağlı teslim; backend PushDevice | Expo → APNs/FCM (etkinleşirse) | İptal/oturum/60 gün idle; provider transfer onayı bekler; Device IDs |
| Push delivery durumu/ticket/error sınıfı | Operasyon; backend PushDelivery | Expo | Varsayılan 30 gün; Diagnostics/Other Data değerlendirmesi |
| Materyal / cevap anahtarı | Görüntüleme/paylaşım; native cache | OS paylaşımında kullanıcının seçtiği uygulama | Çıkışta cache temizlenir; dışa paylaşılan kopya geri alınamaz |
| Usage/errors | Mobilde yeni analytics/crash SDK yok; mevcut API audit/ürün olayları backend'de olabilir | Backend logger/hosting teyidi | Payload redaction + saklama politikası; Usage Data/Diagnostics nihai operasyon envanterine bağlı |
| Web handoff | Browser'da ayrı oturum; uygulama token taşımaz | Web'in kendi SDK/cookie sağlayıcıları | Web privacy açıklamasında ayrıca incelenir |

## Apple App Privacy taslağı

Linked to user: hesap ad/e-posta/User ID; eğitim ve serbest metin içerikleri; oturum/push tanımlayıcıları. Amaç: App Functionality, güvenlik ve destek. Mobile runtime'da reklam/ATT/tracking SDK eklenmedi. “Tracking: no” ancak web handoff ve tüm sağlayıcılar amaç incelemesinden sonra kesinleştirilir. Backend erişim logları ve ürün olaylarını da collection kapsamına dahil edin; local-only RAM/cache ile sunucuya aktarılan veriyi ayırın. Tam alt kategori cevaplarını final legal inventory ile eşleştirmeden store'a göndermeyin.

## Google Data Safety taslağı

Personal info (name/email/User IDs), kullanıcı içerikleri/akademik veri, Device IDs (push açılırsa), uygulama etkileşimleri/diagnostics (backend envanterine göre). HTTPS in transit zorunlu. Sharing istisnaları varsa hizmet sağlayıcı sözleşmesiyle kanıtlanmalı; provider kullanımı otomatik “shared=no” değildir. Optional push ile zorunlu auth/education verisini ayırın. Account deletion request mekanizması mevcut destek sürecine bağlı; store şartının geçtiği iddia edilmez.

## Final approval engelleri

Veri sorumlusu resmî kimliği/adresi, sağlayıcı listesi (Expo/Apple/Google/hosting/DB/email/blob/meeting), veri işleme sözleşmeleri, uluslararası aktarım dayanağı, kategori başına onaylı saklama süresi, silme SLA/istisnaları, çocuk/veli yetkisi ve destek kanalının işlediği kanıtı eksik. Mevcut /gizlilik metni inceleme taslağı. Hukuk + operasyon ortak onayı Gate C ön koşulu.

[Apple App Privacy](https://developer.apple.com/app-store/app-privacy-details/), [Google Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469).
