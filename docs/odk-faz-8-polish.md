# ODK – Faz 8 Notları (Polish) — TAMAMLANDI# ODK – Faz 8 Notları (Polish)



ODK ürününün son halka cilalanması bitti. Aşağıdaki teslim edildi; geri kalanBu faz, ODK ürününün son halka cilalanmasıdır. Aşağıdaki teslim edildi; geri kalan

opsiyonel iyileştirmeler "kalan" başlığında listelendi.opsiyonel iyileştirmeler "kalan" başlığında listelendi.



## Teslim edildi## Teslim edildi



### Public katalog### Public katalog

- `/odk-paketleri/` — Aktif `OdkPackage` kayıtlarını fiyata göre sıralı listeler.- `/odk-paketleri/` — Aktif `OdkPackage` kayıtlarını fiyata göre sıralı listeler.

  - Fiyat (TRY), süre, deneme sayısı kartlarda gösterilir.  - Fiyat (TRY), süre, deneme sayısı kartlarda gösterilir.

  - SEO meta + OpenGraph + canonical.  - SEO meta + OpenGraph + canonical.

  - 5 dakika ISR (`revalidate = 300`).  - 5 dakika ISR (`revalidate = 300`).

  - Boş durumda iletişim CTA'sı.  - Boş durumda iletişim CTA'sı.

  - **FAQ accordion** (5 soru: erişim, süre, gizlilik, mobil, iade) — site- `/odk-paketleri/[slug]/` — Paket detayı.

    geneliyle aynı `<details>` patern'i.  - Pakete dahil tüm yayında / hazırlanan denemeleri listeler.

- `/odk-paketleri/[slug]/` — Paket detayı.  - "Satın Al" butonu → `/odk-paketleri/[slug]/satin-al`.

- `/odk-paketleri/[slug]/satin-al/` — Checkout placeholder (auth gerekir).- `/odk-paketleri/[slug]/satin-al/` — Checkout placeholder.

- `/odk` → `/odk-paketleri` redirect.  - Auth gerektirir; oturum yoksa `/giris?next=...` redirect.

  - PayTR/iyzico entegrasyonu eklenene kadar manuel onay akışı.

### Site IA entegrasyonu- `/odk` → `/odk-paketleri` redirect.

- **Navbar** ana menüsüne `ODK Paketleri` linki eklendi.

- **Footer** "Ürün" sütununa `ODK Paketleri` eklendi.### Mobile / Solver

- Solver zaten `@media (max-width: 1024px)` altında PDF + optik form'u alt-üst

### Mobile / Solver  bölecek şekilde yapılandırılmış (CSS satır 2700).

- Solver `@media (max-width: 1024px)` altında PDF + optik form'u alt-üst- Cheat warning toast mobilde de `max-width: 90vw` ile sığar.

  bölecek şekilde yapılandırılmış.

- Cheat warning toast mobilde de `max-width: 90vw` ile sığar.## Kalan (opsiyonel)



### A11y (öğrenci solver)### Ödeme

- Optical tab'lar: `role="tablist"` / `role="tab"` / `aria-selected`.- PayTR webhook → `OdkPayment` + `OdkOrder` + `OdkEntitlement` oluşturma.

- Cheat warning: `role="alert"`.- iyzico alternatifi.

- Soru bubble button'ları: `aria-pressed` + `aria-label="Soru 12, cevap C- KDV faturası (mevcut `Invoice` modelini ODK için genişletmek).

  (seçili)"`.

### PDF.js → canvas

### Test- `iframe` yerine `pdfjs-dist` worker ile canvas render.

- `lib/odk/scoring.test.ts` — bağımsız (Jest/Vitest gerekmez) test runner.  - Avantaj: print/save UI'ı gizlenebilir, sayfa kontrolü solver'a alınır.

  - **21 test, hepsi geçiyor.**  - Dezavantaj: ~1MB worker, ilk yüklemede bandwidth.

  - ÖSYM standardı (4Y=1D), boş cezasızlık, negatif net engeli, bölüm bazlı- Geçiş için: `components/panel/odk/student/pdf-canvas.tsx` (yeni) oluşturulup

    net dağılımı, özel ceza katsayısı (LGS=3Y).  `exam-solver.tsx`'in `<iframe>` bloğu yerine konulmalı.

  - Çalıştırma: `npx tsx lib/odk/scoring.test.ts`

### A11y

## Kalan (opsiyonel)- Solver soru ızgarasında `aria-pressed` ve `aria-label="Soru 12, cevap C"`.

- Cheat warning'e `role="alert"`.

### Ödeme- Optical tab'larda `role="tablist"` / `role="tab"` / `aria-selected`.

- PayTR webhook → `OdkPayment` + `OdkOrder` + `OdkEntitlement` oluşturma.

- iyzico alternatifi.### Test

- KDV faturası (mevcut `Invoice` modelini ODK için genişletmek).- `lib/odk/scoring.test.ts` — ÖSYM net (4 yanlış = 1 doğru) için unit test.

- `lib/odk/teacher.test.ts` — scope helper (mock prisma).

### PDF.js → canvas- E2E: Playwright ile öğrenci start → autosave → submit → result akışı.

- `iframe` yerine `pdfjs-dist` worker ile canvas render.

  - Avantaj: print/save UI'ı gizlenebilir, sayfa kontrolü solver'a alınır.### Performans

  - Dezavantaj: ~1MB worker, ilk yüklemede bandwidth.- `dashboard-stats.ts` benzeri ODK için cached aggregate (`unstable_cache`).

- Admin attempts list 200+ kayıtta pagination.

### Gelişmiş test

- `lib/odk/teacher.test.ts` — scope helper (mock prisma).### İçerik

- E2E: Playwright ile öğrenci start → autosave → submit → result akışı.- `/odk-paketleri` sayfasına FAQ accordion (mevcut FAQ patern'i ile).

- Test runner'ı projeye eklemek (Vitest tercih).- Footer'a "OnlineDenemeKulübü" linki.

- Navbar'a ODK menü item'ı.

### Performans
- `dashboard-stats.ts` benzeri ODK için cached aggregate (`unstable_cache`).
- Admin attempts list 200+ kayıtta pagination.
