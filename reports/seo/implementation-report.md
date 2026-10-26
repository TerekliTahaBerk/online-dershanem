# Uygulama ve doğrulama raporu

Dal `test/search-console-seo`, merge edilmiş #483'ü içeren güncel origin/main'den başlar (`75077e81`). Bu çalışmada push/PR/deploy yapılmadı. Önceki PR'ın canlıda görülen başlık, Service ve teklif iyileştirmeleri yeni değişiklik olarak sayılmaz.

## Kalıcı kod değişiklikleri

- `app/not-found.tsx`: 404 sayfasının ana sayfa canonical mirasını kaldırır; gerçek 404/noindex korunur.
- `app/sitemap.ts`: blog için gerçek reviewed → published önceliği; istek anında üretilen ODK capturedAt değeri lastmod'dan çıkarıldı. Backend kontratı aynı.
- `lib/blog-content.ts`: mevcut fiyat rehberi aynı slug ve yayın tarihiyle güncel canlı ders fiyatları ve ilk aya özel koçluk koşullarıyla genişletildi. Fiyatlar mevcut commerce/marketing-offers kaynaklarından okunur; ödeme tutarı değiştirilmez.
- `lib/blog-meta.ts`: yalnız gerçekten genişletilen fiyat yazısının kontrol tarihi 26 Ekim 2026 olarak güncellendi.
- `lib/seo/editorial-links.ts`, `components/product/reading-links.tsx`, üç ürün sayfası ve blog template: konuya uygun hizmet bağlantıları ve mevcut rehberlere karşılıklı taranabilir bağlantılar. Server Components; ek veri çağrısı veya görsel kütüphanesi yok.
- `scripts/analyze-search-console.py`: Python standart kütüphanesiyle native CSV ZIP analizi; kaynak SHA256, gerçek dönemler/toplamlar, sorgu gizlilik farkı, ülke/cihaz ayrımı ve açık marka regexi. Ham dosyaları değiştirmez.
- `lib/seo/editorial-links.test.ts`, `tests/e2e/public-search-console-seo.spec.ts`: niyet eşlemesi, eski URL/yayın tarihi, fiyat kapsamı, iki yönlü bağlantılar, 404/sitemap ve mobil erişilebilirlik kontrolleri.

## Son doğrulama

| Kontrol | Sonuç |
|---|---|
| `npm run build` | Başarılı son üretim derlemesi; yalnız 127.0.0.1:1 test DB override, migration yok |
| `npm run lint` | Başarılı, hata/uyarı yok |
| `npm run typecheck` | Başarılı |
| Odaklı unit | 9/9 geçti: editorial, fiyat metni, Tally parametre/teklif |
| Tüm unit | 1.119 test: 1.118 geçti, 1 kaldı; önceden mevcut sprintf-js kurulum uyuşmazlığı (1.0.3 yerine 1.1.4-od.1 bekleniyor). Vendor/lock değişmedi |
| Son üretim Playwright | 19/19 geçti, 17,7 saniye: 6 yeni SEO testi + 13 pazarlama regresyonu |
| CSV hesapları | 16/397 ve 22/448 toplamları UI ile birebir eşleşti; önceki dönemde 28 günlük veri tam |
| Canlı sitemap | 38 URL'nin tamamı 200, uygun canonical, tek H1 ve noindex yok; robots 200 |
| Chrome görsel QA | Fiyat rehberi masaüstü ve 390×844 mobilde görüntülendi; yatay taşma 0; fiyat/ilk ay koşulu okunuyor. Rehber → Yön bağlantısı tıklandı; doğru ürün ve ilgili rehberler görüldü. Konsolda error/warn yok, framework overlay yok |

İlk E2E çalıştırmasında 404 robots locator'ı iki etiket gördü: Next otomatik noindex ve sayfanın noindex/nofollow etiketi. Test, tüm robots etiketlerinin noindex olduğunu denetleyecek biçimde düzeltildi; SEO etiketi sırf testi geçirmek için kaldırılmadı. Son derleme tüm 19 kontrolden geçti.

Chrome ekran görüntüleri CUA ile alındı; masaüstü/mobil fiyat sayfası ayrıca view_image ile incelendi. Geçici viewport override sıfırlandı. Repo içindeki görsel kanıtlar `reports/seo/evidence/` altında; geçici test logları `/tmp/od-seo-*.log` içinde.

## Performans deneyi ve sınırı
Canlı mobil Lighthouse 12.6.1: performance 86 / accessibility 100 / SEO 100; LCP 4.065 ms, CLS 0, TBT 56 ms. Yerel üretim başlangıcı: performance 95, LCP2.871 ms, CLS 0, TBT 76 ms. Hero'yu veri bekleyen alt bölümlerden ayıran Suspense deneyi: performance 89, LCP 3.777 ms, CLS 0, TBT 62 ms. Tek ölçüm gürültülüdür; kanıtlanmış kazanç olmadığı için deneme geri alındı. Kalıcı HomePage/render değişikliği bırakılmadı.

Üretimde mobil LCP hedefi çözülmüş sayılmaz. INP ölçülmedi; TBT onun yerine geçirilmez. GSC mobil ve masaüstü saha CWV için yeterli veri göstermiyor. Localhost ölçümü canlı hızlanma yüzdesi olarak sunulmaz. Ham Lighthouse raporları baseline/experiment adlarıyla saklandı.

## Kalan işler ve yetki sınırları
1. Yeni kodun üretim yayını ayrıca açık onay gerektirir. Deployment sonrası yeni makale ve lastmod public olarak yeniden doğrulanmalı.
2. Sitemap'in son okuma tarihi 26 Ekim, durumu Başarılı ve keşfedilen sayfa sayısı 38 olarak doğrulandı. Sonraki kontrol yeni yerel içeriğin yayınlanması ve indeks kapsamına odaklanmalı; 38 keşif, 38 indeks demek değildir.
3. Mobil LCP darboğazı için üretim profiliyle ayrı çalışma; önceki yerel deney başarısız diye altyapı veya veri kuralları değiştirilmedi.
4. Mevcut GA4 mülkü/stream ve consent kapısı doğrulanmadan yeni takip veya confirmed lead olayı eklenmedi. Tally, CRM, ödeme, DB ve auth korunuyor.
5. Kurulu bağımlılığı repodaki yerel sprintf-js yamasıyla hizalayıp tüm unit testlerini yeniden çalıştırmak gerekiyor.

## Tekrarlama
```sh
python3 scripts/analyze-search-console.py --exported-on 2026-10-26
npm run lint
npm run typecheck
node --import tsx --test lib/seo/editorial-links.test.ts lib/marketing-application.test.ts lib/commerce/public-pricing-copy.test.ts
npm run test:unit
# Local test DB only, no migrations:
DATABASE_URL='postgresql://audit:audit@127.0.0.1:1/audit?connect_timeout=1' DIRECT_URL='postgresql://audit:audit@127.0.0.1:1/audit?connect_timeout=1' npm run build
PLAYWRIGHT_BASE_URL=http://localhost:3105 PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test tests/e2e/public-search-console-seo.spec.ts tests/e2e/public-marketing-audit.spec.ts --workers=2
```
