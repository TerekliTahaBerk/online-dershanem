# Website denetimi — 26 Ekim 2026

## Kapsam ve kanıt
Canlı ana sayfa, `/urunler`, üç ticari ürün, blog, robots.txt, sitemap ve bilinmeyen URL Chromium ile okundu. Kaynakta tüm public `app/**/page.tsx`, ortak başlık/altlık, iletişim, SSS, özel ders, uygulamalar, fiyat ve mevcut ödeme sınırları envanterlendi. Panel ve mobil uygulama yeniden tasarlanmadı. Başlangıç çalışma ağacı temizdi; çalışma dalı `test/marketing-audit-conversion`.

| Öncelik / bulgu | Kanıt / etkilenen yüzey | İş etkisi | Çözüm | Risk | Doğrulama |
|---|---|---|---|---|---|
| P0 Koçluk teklifi eski | Canlı koçluk ve karşılaştırma ₺3.000/ay; `lib/commerce/package-builder-pricing.ts` 300.000 kuruş | Onaylı teklif görünmüyor | Ayrı pazarlama teklifi; eski koçluk toplamlarını public kurucuda bastır | Orta: birleşik paket fiyatları iş kararı bekler | İlk ay 1.500, sonraki ay 2.000, yalnız ilk ay %25/500 TL; ödeme matematiği değişmez |
| P0 Ürünler masaüstünde açılır menü içinde | `site-header-client.tsx`, canlı üst menü | Doğrudan gelen ziyaretçi hizmetleri kaçırabilir (dönüşüm hipotezi) | Üç açık bağlantılı hizmet satırı; ana hero ürün kısayolları | Düşük: başlık yüksekliği | Masaüstü ve 320/390px mobil navigasyon |
| P1 Ders hero önce paket kurucuya gönderiyor | `online-dershanem/page.tsx` | Danışma başvurusuna ek karar adımı | Öncelikli Tally CTA, ders keşif bağlantısı, başvuru sonrası adımlar | Düşük | Ürün → mevcut form URL'si |
| P1 Pazarlama örnekleri statik | `yon-sections.tsx`, Deneme Ligi sayfası | Plan/analiz farkını anlamak zorlaşabilir | Açıkça temsili gün ve sınav seçimi | Düşük | Klavye, aria-pressed, canlı bölge, mobil taşma |
| P2 Güven kanıtları sınırlı | Ürün içeriklerinde doğrulanmış başarı istatistiği/yorum yok | Karar vermeyi etkileyebilir; ölçülmedi | Mevcut süreç ve koşulları açıkla; izni doğrulanmış kanıtlar sonra | Düşük | Uydurma başarı/yorum eklenmez |

## Korunanlar
Gerçek 404, sunucu HTML'si, kanonik ürün URL'leri, orijinal görseller, yeşil/mavi/mor ürün kimlikleri, mobil dialog odağı, PayTR, sepet, CRM, authentication ve üretim verileri. Değişiklikler yereldir; canlıya dağıtım yapılmadı.

Sonuç kanıtları: [QA raporu](../qa/final-verification-report.md). Bu çalışma tüm sistemi bitmiş sayan bir rapor değildir; kalan bağımlılıklar orada açıkça listelenir.
