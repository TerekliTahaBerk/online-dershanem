# Mobil tanıtım görselleri

`public/applications/{od,yon,deneme}.webp` görselleri, 15 Ekim 2026 tarihinde iPhone SE QA / iOS 26.5 simülatöründe mevcut `mobile/` uygulaması Expo Go 57 ile çalıştırılarak alındı. Ekranlar tasarım maketi değildir. Ada Yılmaz adı, dersler, plan görevleri ve deneme sonuçları yalnız bu çekim için hazırlanmış sentetik verilerdir; gerçek öğrenci kaydı kullanılmadı.

Geçici API sadece localhost üzerinde çalıştırıldı. Üç aktif çalışma alanının bootstrap sözleşmesi ve uygulamanın mevcut ekranları kullanıldı. Expo araç düğmesi çekim sırasında gizlendi. PNG yakalamaları, görsel içeriği değiştirilmeden WebP olarak optimize edildi. Pazarlama sayfasındaki telefon çerçeveleri CSS ile ekleniyor.

Bilgin görselleri kullanıcının sağladığı özgün illüstrasyonlardan boyut ve format optimizasyonuyla hazırlandı; sadece Bilgin sayfasında kullanılır. Sayfadaki örnek YKS/LGS soruları tanıtım etkileşimidir, uygulamadaki ilerlemeye yazmaz.

## Gerçek cihaz mockup’ı

Telefon çerçevesi: [weirdapps/mockups — iPhone 16 Pro Black Titanium](https://github.com/weirdapps/mockups/blob/master/src/mockups/frames/16%20Pro%20-%20Black%20Titanium.png). Kaynağın MIT bildirimi `public/applications/MOCKUP-LICENSE.txt` içinde saklanır. Şeffaf cihaz görseli WebP olarak optimize edildi. Gerçek uygulama ekranları ayrı katmanda korunur; SE yakalamasının sistem durum çubuğu CSS ile gizlenerek mockup’ın kamera alanına uygun durum çubuğu ve alt hareket çizgisi gösterilir.
