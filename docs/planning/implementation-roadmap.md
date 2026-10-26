# Pazarlama iyileştirme planı — 26 Ekim 2026

## Doğrulanan mimari
Next.js 16.3 App Router, React 19, Tailwind 4, CSS Modules; Manrope/Geist/JetBrains yerel fontları. Public sayfalar Server Components, etkileşimler küçük client bileşenleri. İçerik `lib/content.ts`, ürün kimlikleri `lib/product-architecture.ts`; marka varlıkları `public/yon`, `public/deneme-ligi`, `public/design`. Prisma ürün görünürlüğü ve deneme kataloğunu okur; hata durumunda çekirdek ürünler korunur. PayTR, sepet, sözleşmeler, CRM, kimlik doğrulama ve mobil uygulama mevcut. Bu çalışma bu sistemlerin iş kurallarını değiştirmez.

## Uygulama sırası
1. P0: Onaylı koçluk pazarlama teklifini ödeme hesaplarından bağımsız tanımla; ürün sayfası ve karşılaştırmada göster.
2. P0: Masaüstünde üç doğrudan ürün bağlantısı; mobil menüyü koru. Ana sayfada ürünlere hızlı erişim ve başvuru odaklı kapanış.
3. P0: Mevcut Tally formlarını hesap üzerinden salt okunur denetle. Desteklenen `source` ve UTM alanlarını kullan; form gönderme veya değiştirme.
4. P1: Ürün hero/fiyat/kapanış CTA'larını mevcut başvuruya bağla; ücretsiz ön görüşme ile ücretli hizmeti ayır. Ders seçeneklerini ve başvuru sonrasını açıkla.
5. P1: Her ürün için Service şeması, açıklayıcı metadata; mevcut kanonik URL'leri koru.
6. P2: Açıkça temsili ve klavyeyle erişilebilir plan/analiz örnekleri; odaklı Playwright ve birim testleri; masaüstü/mobil görsel kontrol.
7. Tüm talep edilen raporları gerçek test sonuçları ve kalan bağımlılıklarla tamamla.

## Onay gerektiren sınır
`lib/commerce/package-builder-pricing.ts` koçluk için 300.000 kuruş ve birlikte alım indirimleri kullanır. Bu kaynağı değiştirmek ödeme/teklif hesaplarını etkiler. Pazarlama teklifinin birleşik paketlere uygulanması için ticari kapsam ve backend değişikliği ayrıca onaylanmalı. Üretim yayını ve üçüncü taraf form değişiklikleri yapılmaz.

## Kabul
Sunucu HTML'sinde üç bağımsız hizmet, tek H1, doğru canonical ve Service; üç görünür menü bağlantısı; form URL'sinde yalnız doğrulanmış alanlar; 1.500/2.000 TL ve ilk aya özel %25/500 TL koşulu; typecheck/lint/build ve odaklı test kanıtı. Laboratuvar ölçümleri saha CWV veya dönüşüm artışı kanıtı olarak sunulmaz.
