# Mobil deneyim ve yayın planı

13 Ekim 2026. Hedef: kullanıcının verdiği açılış görselinden hizmet seçimine ve ürün panellerine kadar tutarlı, hızlı ve erişilebilir bir deneyim. Mevcut test dağıtımı ve OTA güncellemesi kullanıcı tarafından istendi; mağaza yayını bu çalışmanın dağıtım hedefi değil.

## Uygulama

1. **Açılış:** mevcut `launch-background.jpg` korunur. Yerel açılış ile React ekranı aynı zemini kullanır. Görsel çizilmeden yerel ekran kapatılmaz; görsel hatasında logo yedeği gösterilir. Güvenli alanda okunabilir hazırlık göstergesi ve açık renk durum çubuğu kullanılır. Yapay bekleme süresi eklenmez; font/bootstrap hazır olduğunda devam edilir.
2. **Hizmet seçimi:** gerçek ürün logoları, ürün vurguları, kısa hizmet açıklamaları ve açık giriş eylemi olan üç kart. Yükleniyor, kilitli, hazırlanıyor ve hata durumları ayırt edilir. Tek ürünlü ve personel hesaplarında mevcut seçim/erişim kuralları korunur. Aynı seçimin art arda gönderilmesi engellenir.
3. **Hareket sistemi:** native driver ile kısa giriş ve basma animasyonları. Sayfa girişleri veri yenilenmesinde tekrarlanmaz. Kartlar en fazla 200 ms kademelenir; dokunma 90 ms, içerik girişi 240 ms. Ekran geçişleri platform navigasyonunu kullanır. Sistem hareket azaltma tercihi bilininceye kadar sakin görünüm; tercih açıkken animasyon ve dokunsal seçim geri bildirimi kapalı.
4. **Ortak etkileşim:** butonlar, liste satırları, sekmeler, üst bar ve hizmet değiştiricide aynı basma davranışı. Haptics hatası eylemi engellemez. Hizmet değiştirme sırasında gerçek spinner ve sunucudan doğrulanmış ürün bağlamı kullanılır.
5. **Mevcut iş akışları:** oturum, MFA, ürün/rol kapıları, önizlemede salt okunur davranış, bildirim, çevrimdışı veri ve eğitim servisleri korunur. Yeni native bağımlılık, izin ya da uygulama kimliği eklenmez; kurulu test binary'sinin runtime uyumluluğu yayın öncesi doğrulanır.
6. **Web:** hazır işletme paneli tasarımı normal panelin menü, başlık, form, tablo ve nötr yüzey stiline taşınır. Web ve mobil aynı birleştirilmiş commit üzerinden yayınlanır.

## Kabul ve dağıtım

- Mobil typecheck/lint ve tam Jest akışları; özellikle hizmet seçimi, MFA/önizleme, tek ürün ve erişim reddi.
- Hareket azaltma, dokunma devre dışı durumu, haptics hatası ve açılış görseli yedeği için odaklı testler.
- iOS/Android Hermes export, mobil sözleşme sınırı, web token eşleşmesi ve bundle hijyeni.
- Küçük iPhone simülatöründe giriş, üç hizmet, ürün değiştirme, menü ve büyük yazı kontrolü. Açılış hataları ve hareket azaltma davranışı bileşen testleriyle doğrulanır. Test hesabı/verisi yerel ve sentetiktir; gerçek öğrenci kaydı değişmez.
- PR kontrolleri başarılı olduktan sonra birleştirme; Vercel üretim commit/sağlık doğrulaması.
- Mevcut EAS test dağıtımının kanal/runtime değerlerine uygun OTA; yayın grubunun ve commit'in doğrulanması. Native runtime değişirse uyumsuz OTA zorlanmaz, yeni test binary'si gerekir.

Fiziksel cihazdaki GPU performansı, gerçek titreşim motoru ve mağaza incelemesi simülatör/Jest sonuçlarından çıkarılamaz. Yayın kimlikleri PR ve teslim mesajında izlenir. Expo Go kendi yerel açılış ekranını kullandığından özel native splash, yeni TestFlight binary'sinde ayrıca cihaz kontrolü gerektirir.

## Doğrulanan sonuçlar

- 62 Jest paketi / 331 test başarılı; mobil typecheck başarılı. Lint yalnız önceden var olan `admin-activation-desk.test.tsx` import sırası uyarısını bildiriyor.
- iOS ve Android Hermes export ve bundle hijyeni başarılı; 50 mobil sözleşme dosyası ve 33 tasarım token eşleşmesi doğrulandı.
- Küçük iPhone SE simülatöründe üç hizmetin ana ekranı, çalışma alanı geçişleri, menü ve büyük yazılı hizmet seçici doğrulandı.
- Web lint/typecheck/hijyen başarılı; işletme panelinin 16 bölümü ve beş mobil genişlik önceki görsel kontrolden geçti.
- Mevcut TestFlight build 6 runtime değeri `ebe2cecedfdd415c3ea26042049b98957e042f1a`; güncel üretim fingerprint `8b5739715fd988bf0ad8248892ff304cc4e75b69`. Güncel native splash yapılandırması için yeni TestFlight build gerekir; OTA eski runtime değerine zorlanmaz.
