# Analitik olayları ve sınırlar

Mevcut `components/analytics/posthog.tsx`: `$pageview`, `cta_clicked`, `product_scroll_depth`, `product_faq_opened`; product code sabit OD/OK/ODK, URL query/hash ve başlıklar temizlenir. Autocapture/session replay kapalı, paket idle sonrası yükleniyor. `lib/tracking.ts` ayrı console/noop olay katmanı; gerçek GA lead aktarımı değildir. `pixels.tsx` env ile GA4/Meta/TikTok yükleyebilir.

| İstenen olay | Tanım | Bu çalışma durumu |
|---|---|---|
| product_view | Ürün sayfası görünümü | Mevcut `$pageview` + product_code ile eşlenebilir; yeni olay eklenmedi |
| product_cta_click | Ürün sayfasından ilgili eylem | Mevcut `cta_clicked` + application hedef sınıflandırması kullanılır; yeni a href mevcut hedefi korur |
| tally_form_open | Formun gerçekten açıldığının teyidi | Dış sayfada teyit yok; CTA tıklamasına bu ad verilmez |
| confirmed_lead_submission | Güvenilir gönderim teyidi | Uygulanmadı; browser click veya URL üzerinden üretilmez |

## Neden yeni takip eklenmedi?
Repoda pazarlama çerez onayı kapısının pixel yüklenmesini yönettiği doğrulanamadı. İzin ve üçüncü taraf teyidi olmadan yeni event/pixel veya lead sayımı eklemek kapsamı aşar. Mevcut analitik entegrasyonları değiştirilmedi; uyumlu oldukları iddia edilmiyor. Bu, kalan P1 işi olarak takip edilmelidir.

Gelecek yapılandırma: izinli consent gate → yalnız sabit event/product/page türleri → form iframe teyidinde origin + iframe source + formId doğrulaması → duplicate submission önleme veya yetkili Tally webhook. İsim, e-posta, telefon, öğrenci numarası, form cevapları ve account ref analitiğe taşınmaz. Kampanya slug'ları bu çalışmada Tally'ye gider; mevcut PostHog temizleme kuralı değiştirilmez.

GA4/Search Console yeni hesap veya bağlantı oluşturulmadı. Search Console sorgu ve URL Inspection ayrı yetkili erişimle yapılmalı. Mevcut olay adları değiştirilmediği için rapor sürekliliği korunur; yeni ölçümün yayına alındığı iddia edilmez.
