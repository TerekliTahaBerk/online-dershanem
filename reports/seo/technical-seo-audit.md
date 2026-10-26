# Teknik SEO: mevcut ve değişen durum

Next.js 16 App Router / React 19; server-rendered public sayfalar, küçük client etkileşimler, Tailwind/CSS Modules, yerel fontlar ve Next Image. Kurulu Next rehberleri metadata merge, sitemap ve Suspense için okundu. Canlı tarama 38 sitemap URL'sini ve ek alias/404 denetimlerini kapsıyor; HTML başlık/metinleri hydration öncesi mevcut. Framework değişikliği gerekmiyor.

| Öncelik / bulgu | Kanıt | Yerel düzeltme | Risk / doğrulama |
|---|---|---|---|
| P1 404 yanlış homepage canonical mirası | Canlı /seo-audit-missing HTTP 404 + noindex + homepage canonical | `app/not-found.tsx` canonical null | Düşük; gerçek 404, noindex ve canonical yokluğu E 2 E |
| P1 Sitemap snapshot zamanı lastmod gibi | `app/sitemap.ts` ODK contract.capturedAt; kaynak new Date | Snapshot tarihini sitemap'ten kaldır | Düşük; ödeme/kontrat kodu değişmez |
| P1 Blog sitemap tarihleri gerçek revizyonu kaçırıyor | Yayın tarihi tek kaynak kullanılıyordu | Reviewed→published önceliği | Düşük; yalnız değişen makale güncellendi |
| P1 Blogların hizmet yönlendirmesi ağırlıkla derse gidiyor | Blog sonundaki ortak linkler | Niyete göre Yön/Deneme/Ders bağlantısı; ürünlerden 3 mevcut rehbere dönüş | Düşük; link hedefleri unit/E 2 E ile doğrulandı |
| P1 İlk ekran render gecikmesi | Canlı mobil Lighthouse LCP 4,07 s; 3,40 s render delay | Streaming deneyi yerelde ölçüldü; belirgin kazanç vermediği için geri alındı | Üretim altyapısı/üçüncü taraf yükleme profiliyle ayrı performans çalışması gerekli |

Mevcut ürün title/description/OG/Service/Breadcrumb, canonical ve URL'ler önceki merge edilmiş PR'dan geliyor ve canlıda görülüyor; bu çalışmanın yeni kazanımı diye tekrar sayılmadı. Organization/WebSite ve BlogPosting zaten var. Yeni rating/review/FAQ, ödül veya ticari başarı iddiası eklenmedi. Service için özel Google rich result garantisi yok. GSC breadcrumb raporu 15 geçerli / 0 geçersiz; tüm schema türlerinin Google testi tamamlanmış sayılmaz.

## Performans kanıtı
Canlı Lighthouse 12.6.1, mobile simulated throttling: performance 86, accessibility 100, SEO 100, LCP 4065 ms, CLS 0, TBT 56 ms. INP ölçülmedi; TBT onun yerine geçirilmez. Saha CWV mobil/desktop yeterli veri yok. Yerel üretim başlangıcı aynı Lighthouse koşullarında LCP2871 ms, CLS 0, TBT 76 ms, performance 95; geri alınan render deneyi sonucu [uygulama raporunda](implementation-report.md). Localhost ve canlı ölçümler kıyaslanarak kazanç yüzdesi çıkarılmaz.

İç linkler, metadata, sitemap, canonical ve erişilebilirlik odaklı testler uygulanır. Yeni geniş içerik yayınları ve URL göçü yapılmadı. [Google canonical rehberi](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [yapılandırılmış veri kuralları](https://developers.google.com/search/docs/appearance/structured-data/sd-policies).
