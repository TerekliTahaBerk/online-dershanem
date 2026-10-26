# Son doğrulama — 26 Ekim 2026

## Teslim edilen kapsam
Mevcut Next.js uygulamasında pazarlama iyileştirmeleri. Dal: `test/marketing-audit-conversion`. Üç ürünün hero/fiyat/başvuru deneyimi ve metadata'sı geliştirildi; mevcut görseller ve kanonik adresler korundu. Tamamen yeni tasarım, üretim yayını, yeni ödeme/CRM/form backend'i veya veri değişikliği yapılmadı.

## Başlangıç bulguları
- Canlı beş ana sayfa 200, tek H1 ve doğru canonical; robots ve sitemap 200; bilinmeyen URL 404.
- Koçluk reklamı 3.000 TL; fiyat kaynağı mevcut ödeme/teklif matematiğiyle ortak.
- Tally QK6MYp ve 0QpdQB yayında/açık. Ana formda source/UTM var; ayrı product/exam hidden alanı yok.
- Ürünler desktop menü içinde gizli; temel içerik SSR, framework/URL göçü gereksiz.

## Değişen dosyalar
- `app/page.tsx`, `app/paketler/page.tsx`, `app/urunler/{online-dershanem,online-kocum,online-deneme-kulubum}/page.tsx`: keşif, ürün kapsamı, başvuru ve metadata.
- `components/site/{site-header-client,mobile-menu,branded-product-menu-item}.tsx`: doğrudan ürün erişimi ve kampanyalı gezinti.
- `components/home/{hero,product-compare,product-trio-view}.tsx`: üç hizmete giriş, güncel koçluk teklifi.
- `components/product/{yon-sections,product-sections,consultation-steps,learning-examples}.tsx`: fiyat, temsili etkileşimler, başvuru sonrası beklenti.
- `components/forms/{marketing-application-link,campaign-link}.tsx`, `lib/{marketing-application,marketing-offers}.ts`: mevcut form, doğrulanmış alanlar, merkezi pazarlama teklifi.
- `lib/seo/jsonld.ts`, `lib/commerce/public-pricing-copy.ts`: Service kimlikleri ve tutarlı pazarlama fiyat metni. Commerce fiyat hesapları değiştirilmedi.
- `lib/marketing-application.test.ts`, `lib/commerce/public-pricing-copy.test.ts`, `tests/e2e/public-marketing-audit.spec.ts`, `tests/e2e/public-pricing-copy.spec.ts`: odaklı kapsam.
- İstenen 13 audit/plan/design/SEO/growth/QA belgesi eklendi.

## Kontroller ve sonuçlar
| Kontrol | Sonuç / kanıt |
|---|---|
| `npm run build` | Başarılı üretim derlemesi; validate-deploy-env, Prisma client generate ve Next build. Migration yok. DATABASE_URL/DIRECT_URL yalnız 127.0.0.1:1 test adresiyle geçersiz kılındı. |
| `npm run typecheck` | Başarılı. İlk dev/type üretimi sırasında geçici Next generated route hataları oluştu; route türleri tamamlandıktan sonraki kontrol temiz. |
| `npm run lint` | Başarılı, son çalıştırmada hata/uyarı yok. |
| Odaklı unit | 27/27 geçti: teklif matematiği, commerce korunması, Tally alan izinleri/PII biçimleri, Service, fiyat metni. |
| Tüm unit | 1.116 test: 1.115 geçti, 1 kaldı. `lib/vendor-patches.test.ts`: kurulu sprintf-js 1.0.3, beklenen yerel yama 1.1.4-od.1. Bu çalışma bağımlılık/lock/vendor değiştirmedi. |
| Yeni Playwright | Geliştirme sunucusunda 13/13 geçti. Ürün, UTM, SEO/SSR, etkileşim, mobil odak, robots/sitemap/redirect/404, responsive ve axe. |
| Mevcut fiyat testleri | 7 geçti. Ek bir mevcut test kaynakta bulunmayan “Ana ekrana ekle” metnini bekliyor; ayrı başarısızlık olarak korundu. |
| Üretim Playwright | Son üretim çıktısında 20/20 geçti (16,9 s): yeni 13 test + 7 fiyat testi. Kaynakta olmayan yükleme yönergesi testi ayrı raporlanarak bu komutta dışlandı. İlk çalıştırmanın geçici streamed SSR kopya locator sorunu tek H1 yerleşmesini bekleyerek düzeltildi. |
| İç bağlantı taraması | 12 temel public girişten keşfedilen 38 iç yol GET ile kontrol edildi; ≥400 yanıt yok. Tüm olası dynamic/veri tabanlı URL'ler taranmış sayılmaz. |
| Görsel / console | Ana sayfa ve üç ürün 1440×1000 ve 390×1000 tam sayfa; 390×844 ilk ekranlar ayrıca incelendi. Sekiz page kaydında uncaught pageerror yok; framework overlay yok. |
| Erişilebilirlik | Üç ürün main üzerinde axe WCAG 2 A/AA, 2.1 AA, 2.2 AA otomatik kuralları geçti; tam WCAG sertifikası veya ekran okuyucu testi değildir. |
| Gerçek Tally açılışı | Üretim derlemesindeki koçluk CTA tıklandı: QK6MYp, source=website_yon-kocluk, utm_source=instagram. Gerçek form başlığı ve ilk “Öğrenciyim” seçeneği görüldü. Alan doldurulmadı, gönderim yapılmadı. |

Browser plugin/skill oturumda yoktu; mevcut Playwright Chromium kullanıldı. macOS Chromium için sandbox dışı yerel çalıştırma gerekliydi. Üretim sunucusu yerelde `npm run start` ile doğrulandı; Next standalone dağıtımı için `node .next/standalone/server.js` uyarısı üretir. Bu çalışma deployment biçimini değiştirmez.

## Fiyat güvenliği
Tek başına koçluk ilk ay 1.500 TL, standart/sonraki ay 2.000 TL; tasarruf 500 TL/%25 yalnız ilk ay. Ürün, karşılaştırma, SSS ve paket kartında ortak teklif kullanılır. Koçluk seçili public kurucuda eski toplam/indirim rakamları gösterilmez; birleşik teklif görüşmede netleşir. Ders/deneme hesapları korunur. `lib/commerce/package-builder-pricing.ts` ve işlem/ödeme/sözleşme verileri değiştirilmedi; eski 300.000 kuruş commerce değeri birim testte korunuyor.

## Görsel karşılaştırma kaydı
Kaynak tasarım canlı `/urunler/online-kocum` screenshot'ı `/tmp/od-before-coaching.png`; yeni desktop `/tmp/od-after-online-kocum-1440.png`. Her ikisi view_image ile okundu. Mobil hero ve fiyat ekranları da view_image ile incelendi.

| İncelenen nokta | Kanıt / karar |
|---|---|
| Tipografi | Büyük Manrope başlıklar ve mevcut vurgu korundu; mobil başlıklar okunuyor. |
| Renk / marka | Yeşil ders, mavi-sarı koçluk ve mor deneme korunuyor; orijinal sanat kullanılıyor. |
| Hero / CTA | Vaad ve dekoratif oklar korunuyor; öncelikli CTA artık doğru mevcut Tally formu. |
| Fiyat | Eski 3.000 TL yerine aynı kart dilinde ilk ay/sonraki ay ve sarı tasarruf açıklaması. |
| Bölüm ritmi | Mevcut kart/boşluk düzeni korunuyor; açıklayıcı başvuru bölümü eklendi. |
| Mobil / etkileşim | 320, 390, 768, 1440 px taşma testleri; plan günü ve sınav örneği gerçek durum değiştiriyor. |

Bu çalışma kabul edilmiş yeni bir ImageGen konseptinin birebir uygulaması değildir; mevcut tasarım üzerinde hedefli iyileştirmedir. Geçici görseller `/tmp` içinde, repoya eklenmedi. Tam sayfa ekranları otomatik ölçeklenebildiği için mobil ilk ekranlar ayrıca doğal çözünürlükte kontrol edildi.

## Yerel üretim laboratuvar ölçümü
Ağ/CPU throttling yok, localhost, yeni page; 1440/390 genişliklerde LCP sırasıyla home 516/496 ms, ders 476/464 ms, koçluk 476/468 ms, deneme 468/460 ms; ölçüm anında CLS 0. Script transferi 272.269–273.774 byte. Bunlar yerel tek örneklerdir; canlı baseline ile hızlanma yüzdesi çıkarılamaz. INP/CrUX/mobile field sonuçları yok.

## Kalan işler / onay sınırları
1. P1: Mevcut analitik pixel yüklemesinin consent kapısını doğrulama; güvenilir gönderim teyidiyle lead ölçümü. Yeni takip/başarı olayı eklenmedi.
2. P1: Tally product/exam hidden alanları ve kısa form attribution için ayrıca yetkili yapılandırma/yayın; bu oturum formları değiştirmedi.
3. P1: Birleşik koçluk teklifinin ticari kapsamı ve mevcut backend ücret kuralları için açık onay gerekir. Tek başına teklif güvenli pazarlama katmanında uygulanmıştır.
4. P1: Bağımlılık kurulumunu repodaki yerel sprintf-js yamasıyla hizala; tüm birim testlerini yeniden çalıştır.
5. P2: Eski mobil yükleme yönergesi beklentisini ürün kararıyla çöz; hedefli test başarısızlığı gizlenmedi.
6. P2: Search Console URL Inspection/sorgu raporları, gerçek mobil throttled performans, uzun dönem CWV, izinli gerçek müşteri/öğretmen kanıtları ve editör içerik geliştirmeleri.
7. P2: 404 canonical mirasını temizleme; 404 ve noindex şimdiden çalışır.

Üretim yayını ve ödeme iş kuralı değişiklikleri için onay gerekir. Mevcut kod iyileştirmeleri yereldir; push veya deploy yapılmadı. Tam master prompt'un tüm büyüme/ölçüm kabul kriterleri tamamlanmış sayılmaz; yukarıdaki bağımlılıklar açık kalır.

## Tekrarlanabilir komutlar

```sh
npm run lint
npm run typecheck
node --import tsx --test lib/marketing-application.test.ts lib/commerce/public-pricing-copy.test.ts lib/commerce/package-builder-pricing.test.ts
npm run test:unit
# Local-only database overrides; no migration or production connection:
DATABASE_URL='postgresql://audit:audit@127.0.0.1:1/audit?connect_timeout=1' DIRECT_URL='postgresql://audit:audit@127.0.0.1:1/audit?connect_timeout=1' npm run build
PLAYWRIGHT_BASE_URL=http://localhost:3102 PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test tests/e2e/public-marketing-audit.spec.ts tests/e2e/public-pricing-copy.spec.ts --workers=2 --grep-invert 'ana ekrana ekleme yönergesi'
```

Test ve ekran görüntüsü çıktıları `/tmp/od-*.log`, `/tmp/od-*.json`, `/tmp/od-*.png` içinde tutuldu; geçicidir, temizlenebilir. Yeni test dosyaları ve sonuç özeti repoda kalıcıdır. Üçüncü taraf form ayarlarına salt okunur erişim kullanıldı; bu çağrılar tekrar gerçek başvuru üretmez. Browser eklentisi bu oturumda yoktu; ileride uygulama içi görsel QA için kurulabilir.
