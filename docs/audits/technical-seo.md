# Teknik SEO denetimi

26 Ekim 2026. Next.js'in kurulu `node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md`, metadata robots/sitemap rehberleri okundu. Kurulu runtime 16.3.6; package.json aralığı ^16.3.8. Sürüm yükseltmesi bu çalışmanın dışında.

| Öncelik / bulgu | Kanıt / dosya | Etki | Çözüm | Risk | Kabul |
|---|---|---|---|---|---|
| P1 Hizmet kimliği şemada eksik | Ürün sayfalarında Breadcrumb/FAQ var; Service yok | Üç hizmetin makine tarafından ayrıştırılması zayıf | Her ürüne doğru isim, canonical URL, hizmet türü ve sağlayıcı ile Service | Düşük | HTML JSON-LD parse edilir; fiyat, yorum, puan uydurulmaz |
| P1 Başlıklar arama niyetini yeterince belirtmiyor | Eski koçluk title yalnız marka/LGS/YKS | Hizmet türü daha açık anlatılabilir | Canlı online ders / online öğrenci koçluğu / online deneme başlıkları | Düşük | Meta, OG ve canonical uyumu |
| P2 404 ana sayfa canonical'ını miras alıyor | Canlı bilinmeyen URL: HTTP 404, noindex; canonical `/` | Gereksiz canonical sinyali; kritik indeksleme engeli değil | Sonraki metadata temizlik işi | Düşük | 404 statüsü ve noindex korunur |
| P2 İndeks/sorgu verisi yok | Search Console hesabına erişilmedi | İndeks durumu ve kelime talebi kanıtlanamaz | Yetkili Search Console incelemesi | Yok | URL Inspection, sitemap raporu ve arama sorguları |

## Çalışan temel
Beş ana route 200 ve tek H1; üç ürün canonical'ı mevcut public URL ile aynı. SSR HTML ürün metnini içeriyor. robots.txt 200, public yollar açık, API/panel/sepet/ödeme yolları engelli. Sitemap 200 ve üç ürünü içeriyor; blog/deneme katalog girdileri mevcut kaynaktan geliyor. Redirectler `next.config.ts` üzerinden HTTP permanent; framework veya URL taşınması gerekmiyor. Branded alternatifler eklenmedi; kopya indexlenebilir sayfa yok.

Blogda Article/FAQ/Breadcrumb, ana sayfada Organization/WebSite zaten var. FAQ işaretlemesi özel arama görünümü garantisi değildir. Service doğrulaması yerel JSON yapısı ve URL doğruluğunu kapsar; Google Rich Results ve Search Console kontrolü tamamlanmış sayılmaz.

Kaynaklar: [Google yapılandırılmış veri rehberi](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data), [Schema.org Service](https://schema.org/Service). Canlı kanıt: [ders](https://www.onlinedershanem.com/urunler/online-dershanem), [koçluk](https://www.onlinedershanem.com/urunler/online-kocum), [deneme](https://www.onlinedershanem.com/urunler/online-deneme-kulubum).
