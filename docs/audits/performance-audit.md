# Performans denetimi

## Gerçek başlangıç ölçümü
26 Ekim 2026, canlı HTTPS, Playwright Chromium headless, 1440×1000, ağ/CPU yavaşlatması yok, her sayfa için yeni page; aynı browser cache etkisi mümkündür. LCP/CLS PerformanceObserver, script transferi Resource Timing ile ölçüldü; networkidle anında okundu. Sonraki etkileşim/scroll ölçüme dahil değildir. Tek örnek; Lighthouse puanı veya CrUX saha ölçümü değildir.

| Route | LCP ms | CLS | Script transfer byte | TTFB ms |
|---|---:|---:|---:|---:|
| / | 1456 | 0 | 292297 | 253 |
| /urunler | 832 | 0 | 285745 | 146 |
| /urunler/online-dershanem | 724 | 0 | 285745 | 148 |
| /urunler/online-kocum | 592 | 0 | 285745 | 141 |
| /urunler/online-deneme-kulubum | 992 | 0 | 285745 | 203 |

| Öncelik / bulgu | Kanıt / dosya | Etki | Çözüm | Risk | Kabul |
|---|---|---|---|---|---|
| P1 Mobil saha verisi yok | Yukarıdaki örnekler masaüstü | Instagram/TikTok düşük cihaz etkisi bilinmiyor | Mobil throttled Lighthouse + izinli CWV ölçümü | Yok | p75 LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1 saha hedefleri |
| P2 Home paket kurucu yükü | `app/page.tsx`, client PackageBuilder | İlk girişte gereksiz seçim/JS | Home kurucu yerine server başvuru açıklaması; /paketler korunur | Düşük | Ürün keşfi ve kurucu ayrı route'ta çalışır |
| P2 Analitik betikleri | pixels.tsx, posthog.tsx, layout.tsx | Üçüncü taraf maliyeti ve onay yönetimi | Yeni analitik betiği eklenmedi; onay incelemesi ayrıca gerekli | Orta | İzin öncesi veri iletimi ayrıca denetlenmeli |

Orijinal görseller Next Image boyut/sizes ile kullanılıyor, fontlar yerel, PostHog idle sonrası yükleniyor. Yeni örnekler ağ isteği, grafik kütüphanesi veya animasyon eklemez; sunucu metinleri korunur. INP ölçülmedi; sıfır gibi raporlanmaz. Yerel QA sonuçları geliştirme/üretim bağlamı belirtilerek final raporda tutulur; canlı önce/sonra karşılaştırması yayın olmadan yapılamaz.
