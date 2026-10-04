# PostHog EU bağlantısı

Tarayıcıda `posthog-js`, sunucuda `flags` ve `@flags-sdk/posthog` kullanılır.
Proje `.vercel/project.json` ile online-dershanem'e zaten bağlıdır. Genel ortam
değişkenlerini çekmek yerel veritabanı ayarlarını değiştirebileceğinden yalnız
PostHog değişkenleri `.env.local` dosyasına eklenir.

## Ortam değişkenleri

- `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`: PostHog proje ingestion anahtarı (`phc_`).
- `NEXT_PUBLIC_POSTHOG_HOST`: EU host; `https://eu.posthog.com` Marketplace
  değeri tarayıcıda `https://eu.i.posthog.com` olarak kullanılır.
- `POSTHOG_PROJECT_API_KEY`: Flags SDK için aynı proje anahtarı.
- `POSTHOG_HOST`: `https://eu.i.posthog.com`.

Kişisel API anahtarı gerekmez. Anahtarlar kaynak koduna eklenmez.
Production ve Preview değişkenleri Vercel'de ayarlanmalıdır. Yeni değişkenler
mevcut deployment'a uygulanmaz; bağlantı bir sonraki deployment ile devreye girer.

## Feature flag

PostHog → Feature flags → New feature flag: anahtar `website-analytics`,
boolean türünde oluşturulur. Açık olduğunda ziyaret/CTA ölçümü yapılır.
Henüz tanımlanmamışsa varsayılan `true`; yapılandırma yoksa veya sunucu tarafında
hata olursa izleme bileşeni oluşturulmaz, sayfa çalışmaya devam eder.
Kullanıcılar dahili kullanıcı kimliğinin SHA-256 değeriyle, ziyaretçiler UUID ile
değerlendirilir. Tüm ziyaretçiler aynı sahte kullanıcı ID'sini paylaşmaz.
Flag değişikliği bir sonraki sunucu render'ında uygulanır; açık sekmeyi yenileyin.

## Toplanan olaylar

- `$pageview`: ilk ziyaret ve Next.js sayfa geçişleri.
- `cta_clicked`: mevcut `data-analytics-id` taşıyan CTA'lar.

Panel, API ve kimlik doğrulama sayfaları ölçülmez. Form içerikleri, kullanıcı
adı/e-posta ve oturum token'ları gönderilmez. URL sorguları/hash'leri silinir.
Autocapture, Session Replay, anketler ve otomatik performans ölçümü kapalıdır.
Anonim ziyaretçi UUID'si `od_analytics_visitor` çerezinde bir yıl tutulur;
SDK persistence bellektedir. Bu çerezi mevcut çerez envanterine dahil edin.

## Doğrulama

`npm run typecheck`, değişen dosyalarda ESLint ve `lib/posthog-policy.test.ts`.
Canlı kontrol: public bir sayfayı açın; ağda EU ingestion isteğini ve PostHog
Activity'de `$pageview` olayını kontrol edin. Paket CTA'sını tıklayın;
`cta_clicked` beklenir. `website-analytics` false ise yenileme sonrası olay
beklenmez. `/giris` ve `/panel` ziyaretleri `$pageview` oluşturmamalıdır.

Kaynaklar: [Flags SDK PostHog](https://flags-sdk.dev/docs/providers/posthog),
[PostHog Next.js](https://posthog.com/docs/libraries/next-js).
