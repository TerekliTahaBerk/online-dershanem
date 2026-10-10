# M9 TestFlight pilot rehberi

Tarih: 10 Ekim 2026. Kapsam: Online Dershanem mobil 1.0.0.

TestFlight ilk dağıtım hedefidir. Durum: BLOCKED; signed build, ASC record, Apple hesap erişimi ve fiziksel cihaz testi yok. Bu çalışmada upload/submit yapılmadı.

1. Credentials checklist ve Gate A kusurlarını kapatın. Backend deploy için ayrıca onay alın; ardından health + auth + rol kapsamı smoke kontrolü yapın.
2. App Store Connect'te gerçek bundle ID ile app kaydı açın; production EAS environment ve remote build numarasını kontrol edin.
3. Onaylı immutable SHA'dan production IPA oluşturun. EAS build ID, iOS buildNumber, backend deployment SHA ve ortamı release ticket'ına ekleyin.
4. **Yalnız açık TestFlight gönderim onayı sonrası:** `npx eas-cli submit --platform ios --profile production --id <ONAYLI_EAS_BUILD_ID>`. ascAppId gerekirse submit profilinde gerçek değeri girin; şu an uydurulmadı. `--latest` kullanmayın.
5. ASC processing/export compliance sorularını gerçek encryption kullanımıyla cevaplayın. Internal testers grubuna yalnız yetkili sentetik veri erişimini açın. External testing için Beta App Review ve test bilgileri gerekir.
6. “What to Test”: giriş/MFA, OD ders ve ödevler, Yön plan/görüşme, Deneme Ligi yayınlanmış sonuç, veli çocuk geçişi, öğretmen kapanışı, koç not görünürlüğü, oturum iptali, ağ kaybı ve hesap silme talep erişimi. Uygulama içi sınav veya satış yok.
7. App Review gönderimi TestFlight upload onayından ayrıdır. App Store review/publish için yeni açık insan onayı gerekir.

## Review hesapları

QA bir sentetik OD öğrencisi, OK öğrencisi, ODK öğrencisi, veli ve gerekiyorsa teacher/coach hazırlar. Bir öğrenciye üç workspace verilebilir; velide iki sentetik çocuk değişimi gösterilir. Yayınlanmış sentetik sonuçlar gerçek ürün akışıyla üretilir. Şifreler repo/PR'da bulunmaz; ASC app access alanına güvenli girilir. Hesapları expiry/pilot/feature flag'leriyle birlikte reviewer cihazından doğrulayın. ADMIN demo hesabı verilmez. MFA kapısı backend'de kaldırılmaz; review için geçerli erişim adımları yazılır.

Rollout önce küçük internal grup, sonra kontrollü external pilot, sonra Gate C değerlendirmesi. Başarısızlıkta build tester grubundan kaldırılır ve yeni build hazırlanır.
