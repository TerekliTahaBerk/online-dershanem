# Google tarafında yapılan işlemler

## 27 Ekim 2026 ek işlemleri
İşletme hesabının kullanıcı tarafından oluşturulan GA4 mülkü `560870730` ve `16209176153` web akışı Search Console alan adı mülküne başarıyla bağlandı. Sorgular raporunda GA4 içinden gerçek Search Console verileri görüldü. Kullanıcı/erişim/DNS değişikliği yapılmadı.

Güncel sitemap hâlâ Başarılı, son okuma 26 Ekim, keşfedilen 38 sayfa. Tekrar gönderilmedi. HTTPS raporu 26 Ekim güncel: HTTPS olmayan 0, HTTPS 16; kritik sorun yok. Breadcrumb 25 Ekim güncel: geçersiz 0, geçerli 15. Ürün snippet ve satıcı raporlarında geçersiz 0 / geçerli 0; eski opsiyonel alan uyarıları 0 öğeye ait. Sahte review, aggregateRating, kargo/iade verisi eklenmedi. İndeks raporu hâlâ 23 Ekim: 35 indeksli / 90 hariç; önceki neden dağılımı değişmedi.

PR #484'ün fiyat rehberi değişikliklerinin gerçekten yayında olduğu Chrome'da doğrulandı. `/blog/online-dershane-fiyatlari-2026` Google dizininde mevcut. Canlı test 27 Ekim 00:14: Google kullanabilir, indekslenebilir, 1 geçerli breadcrumb. Güncellenen içerik için tek yeniden indeksleme isteği gönderildi; “Dizine eklenmesi istendi” ve öncelikli tarama sırasına eklenme bildirimi görüldü. CAPTCHA çözülmedi, tekrar gönderim yapılmadı. Bu istek sıralama veya tarama zamanı garantisi değildir.

GA4 web sitesinden veri almıyor: etiketi ve izin tercihi bağlantısının üretimde yayını gerekir. Gerçek Realtime verisi bu oturumda doğrulanmadı.

## 26 Ekim 2026 tarihsel kayıt

Tarih 26 Ekim 2026, Europe/Istanbul. Kullanıcının açık Chrome sekmesi ve mevcut oturumu kullanıldı. Şifre/cookie/token alınmadı. Alan adı mülkü `sc-domain:onlinedershanem.com`; doğrulanmış sahiplik Ayarlar'da görüldü.

## Okunan ve dışa aktarılan

- Performans Web: son 28 gün, önceki 28 gün karşılaştırması, 3 ay, 6 ay ve 12 ay seçimi. 12 ay görünümünde mevcut grafik 16 Mar–24 Eki 2026.
- Native CSV ZIP: bu 5 performans görünümü; her birinin Filtreler bilgisi korundu. Comparison ZIP günlük grafik içermiyor; önceki 28 gün toplamları daha uzun gerçek günlük grafikten çıkarıldı ve UI ile eşleştirildi.
- İndeksleme genel raporu ve “Tarandı, şu anda dizine eklenmiş değil” örnekleri native CSV ZIP olarak indirildi. Kullanıcının verdiği 7 CSV aynen saklandı; SHA256 manifesti var.
- Beş önemli URL'nin dizin durumu, site/Google canonical'ı, son taraması ve izinleri okundu.
- Manuel işlem ve güvenlik: her ikisinde “Hiçbir sorun algılanmadı”. Breadcrumb 15 geçerli / 0 geçersiz. Mobil/desktop CWV: son 90 güne ait yeterli kullanım verisi yok.
- Analytics welcome/provision ekranı: mevcut GA4 property/stream doğrulanamadı; yeni property oluşturulmadı.

## Değiştirilen tek Google ayarı / gönderim
Yayındaki `https://www.onlinedershanem.com/sitemap.xml` önce HTTP/XML/38 URL ile doğrulandı. Mevcut kayda 26 Ekim'de yeniden gönderildi. “Site haritası başarıyla gönderildi” diyaloğu ve güncellenen gönderim tarihi görüldü. Kanıt: `evidence/sitemap-submitted-2026-10-26.png`.

Gönderimden hemen sonra eski 26 Şubat 2019 / 49.950 bilgisi görünüyordu. Sonraki tek tekrar kontrolde okuma tarihi 26 Ekim 2026, durum Başarılı, keşfedilen sayfa sayısı 38 oldu. Böylece mevcut yayındaki sitemap'in işlenmesi doğrulandı; 38 sayfanın tamamı indekslendi denmiyor. Son kanıt: `evidence/sitemap-processed-2026-10-26.png`. Eski HTTP/robots/robot.txt/ana sayfa kayıtları silinmedi. Henüz yayımlanmayan yerel sitemap değişiklikleri gönderilmedi.

## Canlı Google URL testleri

| URL | Test zamanı | Sonuç |
|---|---|---|
| Deneme Ligi | 17:44:20 | Google kullanabilir, indekslenebilir, başarılı getirme, 1 geçerli breadcrumb |
| Yön Koçluk | 17:53 | Google kullanabilir, indekslenebilir, 1 geçerli breadcrumb |
| Online Dershanem | 17:57 | Google kullanabilir, indekslenebilir, 1 geçerli breadcrumb |
| Ana sayfa | 18:03 | Google kullanabilir, indekslenebilir; özel geliştirme yok |
| Ürün merkezi | 18:09 | Google kullanabilir, indekslenebilir, 1 geçerli breadcrumb |

Canlı URL testi bir indexing request değildir. İndeksleme isteği 0, düzeltmeyi doğrula isteği 0. Mülk/kullanıcı/erişim/DNS değişikliği 0; üretim deployment 0. GSC sayfalarının geçici yüklenmesi ve arayüz büyük harf/erişilebilir ad farkı giderilerek okundu; yalnız görünür tamamlanmış sonuçlar kaydedildi.

## Deployment sonrası
Yeni fiyat yazısı ve sitemap lastmod'u public olduğunda HTTP/HTML kontrol et; ardından gereken tekil URL Inspection/live test yap. Değişmemiş veya yayınlanmamış sayfalar için tekrarlanan indeks talepleri gönderme. Sitemap'in güncel işlenmesi bu oturumda doğrulandı. Sonraki incelemede indeks kapsamı ve yeni içeriklerin Google durumunu kontrol et; zamanlanmış izleme kurulmadı.
