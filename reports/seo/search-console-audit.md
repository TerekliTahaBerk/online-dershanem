# Search Console denetimi — 26 Ekim 2026

Chrome'daki mevcut yetkili oturum kullanıldı. Ayarlar ekranı `sc-domain:onlinedershanem.com` için “Doğrulanmış bir sahipsiniz” gösterdi. Mülk 26 Ekim 2026'da hesaba eklenmiş; geçmiş performans verisi mevcut. Yeni mülk veya kullanıcı oluşturulmadı.

| Öncelik | Doğrulanmış bulgu | Eylem / sınır |
|---|---|---|
| P0 | Sitemap kayıtları 2018/2019 okuma tarihi ve 49.950 eski URL gösteriyor | Yayındaki 38 URL doğrulandı; mevcut HTTPS sitemap yeniden gönderildi. Son kontrolde okuma 26 Ekim, durum Başarılı ve 38 keşfedilen sayfa doğrulandı. Bu sayı indeks garantisi değildir. |
| P1 | Son 28 gün: 16 tıklama/397 gösterim; önceki: 22/448 | Baz oluşturuldu; düşüş yeni yerel değişikliklere bağlanamaz. |
| P1 | 35 indeksli, 90 hariç; 90 kaydın 46'sı redirect, 13'ü alternatif canonical, 10'u noindex | Hariç tutulanların tamamı hata değil. Örnekler ve ayrım [indeksleme raporunda](indexing-audit.md). |
| P1 | Üç hizmet, ürün merkezi ve ana sayfa Google'da mevcut; Google canonical'ı incelenen URL ile aynı | Yeni ürün URL'lerine geçiş gerekçesi yok. Canonical, mevcut yollar ve redirectler korunur. |
| P1 | Fiyat yazısı 186 gösterim/2 tıklama, ortalama konum 18,13 (3 ay) | Aynı URL'de doğrulanmış fiyatlar, koşullar ve karşılaştırma soruları eklendi; henüz yayımlanmadı. |
| P1 | Mobil Lighthouse canlı home LCP 4,07 s | Laboratuvar sorunu; yerel ilk render düzenlemesi test edildi. Saha iyileşmesi iddiası yok. |
| P2 | Breadcrumb: 15 geçerli / 0 geçersiz; manuel işlem ve güvenlik sorunu yok | Yeni FAQ/rating eklenmedi; Service işaretlemesi özel rich result garantisi değildir. |

[Gerçek dönem bazları](search-console-baseline.md), [uygulama ve test](implementation-report.md), [Google işlem günlüğü](google-search-console-actions.md).

Kanıt: `search-console/raw/` orijinal ZIP/CSV dışa aktarımları; `search-console/ui-observations-2026-10-26.json` UI kayıtları; `evidence/sitemap-submitted-2026-10-26.png`. Tarihler Europe/Istanbul bağlamındadır; Google'ın veri kesim tarihi son günlük satırdan ayrıca okunur. Yeni yerel değişiklikler için indexing/validation isteği gönderilmedi.
