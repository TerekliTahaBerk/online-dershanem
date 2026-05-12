# ODK – Faz 8 Notları (Polish)

Bu faz, ODK ürününün son halka cilalanmasıdır. Aşağıdaki teslim edildi; geri kalan
opsiyonel iyileştirmeler "kalan" başlığında listelendi.

## Teslim edildi

### Public katalog
- `/odk-paketleri/` — Aktif `OdkPackage` kayıtlarını fiyata göre sıralı listeler.
  - Fiyat (TRY), süre, deneme sayısı kartlarda gösterilir.
  - SEO meta + OpenGraph + canonical.
  - 5 dakika ISR (`revalidate = 300`).
  - Boş durumda iletişim CTA'sı.
- `/odk-paketleri/[slug]/` — Paket detayı.
  - Pakete dahil tüm yayında / hazırlanan denemeleri listeler.
  - "Satın Al" butonu → `/odk-paketleri/[slug]/satin-al`.
- `/odk-paketleri/[slug]/satin-al/` — Checkout placeholder.
  - Auth gerektirir; oturum yoksa `/giris?next=...` redirect.
  - PayTR/iyzico entegrasyonu eklenene kadar manuel onay akışı.
- `/odk` → `/odk-paketleri` redirect.

### Mobile / Solver
- Solver zaten `@media (max-width: 1024px)` altında PDF + optik form'u alt-üst
  bölecek şekilde yapılandırılmış (CSS satır 2700).
- Cheat warning toast mobilde de `max-width: 90vw` ile sığar.

## Kalan (opsiyonel)

### Ödeme
- PayTR webhook → `OdkPayment` + `OdkOrder` + `OdkEntitlement` oluşturma.
- iyzico alternatifi.
- KDV faturası (mevcut `Invoice` modelini ODK için genişletmek).

### PDF.js → canvas
- `iframe` yerine `pdfjs-dist` worker ile canvas render.
  - Avantaj: print/save UI'ı gizlenebilir, sayfa kontrolü solver'a alınır.
  - Dezavantaj: ~1MB worker, ilk yüklemede bandwidth.
- Geçiş için: `components/panel/odk/student/pdf-canvas.tsx` (yeni) oluşturulup
  `exam-solver.tsx`'in `<iframe>` bloğu yerine konulmalı.

### A11y
- Solver soru ızgarasında `aria-pressed` ve `aria-label="Soru 12, cevap C"`.
- Cheat warning'e `role="alert"`.
- Optical tab'larda `role="tablist"` / `role="tab"` / `aria-selected`.

### Test
- `lib/odk/scoring.test.ts` — ÖSYM net (4 yanlış = 1 doğru) için unit test.
- `lib/odk/teacher.test.ts` — scope helper (mock prisma).
- E2E: Playwright ile öğrenci start → autosave → submit → result akışı.

### Performans
- `dashboard-stats.ts` benzeri ODK için cached aggregate (`unstable_cache`).
- Admin attempts list 200+ kayıtta pagination.

### İçerik
- `/odk-paketleri` sayfasına FAQ accordion (mevcut FAQ patern'i ile).
- Footer'a "OnlineDenemeKulübü" linki.
- Navbar'a ODK menü item'ı.
