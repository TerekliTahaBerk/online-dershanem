# Sitemap ve robots

Canlı HTTPS robots ve sitemap 26 Ekim 2026'da HTTP200 döndü. XML parse edildi; 38 benzersiz mutlak HTTPS URL'nin tamamı ayrıca 200, canonical ve noindex yönünden doğrulandı; sitemap URL'lerinde sorun bulunmadı. Ana sayfa, ürün merkezi, üç ürün ve 21 mevcut blog dahil. /panel, /api, /giris, satın alma/hesap yolları, kariyer noindex, LGS/YKS alias'ları ve OG görselleri sitemap'e alınmadı.

Robots doğru HTTPS sitemap'i bildiriyor; /api/, /panel, /sepet ve ödeme yollarını engelliyor. Genel public erişim açık. Robot dosyası sitemap değildir; geçmiş GSC gönderimlerindeki robots.txt/robot.txt/ana sayfa hataları site genelinin robots engelli olduğu anlamına gelmez.

## GSC işlemi
Mevcut `https://www.onlinedershanem.com/sitemap.xml` kaydı yeniden gönderildi. UI “Site haritası başarıyla gönderildi” ve gönderim tarihi 26 Eki 2026 gösterdi. Gönderimden hemen sonra son okuma tarihi 26 Şubat 2019 ve keşfedilen sayı 49.950 olarak kalmıştı. Çalışma sonundaki tekrar kontrolde son okuma 26 Ekim 2026, durum Başarılı ve keşfedilen sayfa sayısı 38 oldu. Yeni sitemap işlenmesi doğrulandı; 38 sayfanın tamamının indekslendiği iddia edilmez. Kanıt: `evidence/sitemap-processed-2026-10-26.png`. HTTP sitemap ve hatalı eski gönderimler silinmedi.

## Yerel lastmod düzeltmeleri — henüz yayımlanmadı

- Blog lastmod, gerçek `blogReviewedAt` varsa onu, yoksa `blogPublishedAt` değerini kullanır. Yayın tarihi değişmez.
- Gerçekten genişletilen fiyat rehberinin gözden geçirme tarihi 26 Ekim 2026; diğer 20 yazıya bugünün tarihi yazılmadı.
- Deneme kontratının `capturedAt` alanı her okuma anında üretiliyor. Bu içerik güncellemesi değildir; deneme sitemap girdilerinden lastmod kaldırıldı. Backend kontratı/depolanmış veri değiştirilmedi. Anlamlı içerik değişikliği tarihi veri kaynağından sağlanırsa sonradan kullanılabilir.

Yerel değişikliklerin sitemap'i GSC'ye ayrıca sunulmadı. Onaylı deployment sonrası XML ve örnek lastmod tekrar kontrol edilmeli. [Google sitemap rehberi](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) canonical URL ve anlamlı değişiklik tarihlerinin önemini açıklar; sitemap gönderimi indeks garantisi değildir.
