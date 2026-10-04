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

EU projesi `online-dershanem` (293919) içinde
[`website-analytics`](https://eu.posthog.com/project/293919/feature_flags/299675)
boolean flag'i oluşturuldu; sunucuda değerlendirilir ve %100 açık yapılandırıldı.
Açık olduğunda ziyaret/CTA ölçümü yapılır.
Henüz tanımlanmamışsa varsayılan `true`; yapılandırma yoksa veya sunucu tarafında
hata olursa izleme bileşeni oluşturulmaz, sayfa çalışmaya devam eder.
Kullanıcılar dahili kullanıcı kimliğinin SHA-256 değeriyle, ziyaretçiler UUID ile
değerlendirilir. Tüm ziyaretçiler aynı sahte kullanıcı ID'sini paylaşmaz.
Flag değişikliği bir sonraki sunucu render'ında uygulanır; açık sekmeyi yenileyin.

## PostHog panosu

[Total — onlinedershanem. Ekosistemi](https://eu.posthog.com/project/293919/dashboard/996884)
projenin varsayılan panosudur. Site genelinde benzersiz ziyaretçi, görüntüleme,
CTA ilgisi, üç ürünün birleşik benzersiz ilgisi ve ürün → CTA hunisini gösterir.
Ürünler arasında aynı analitik kimliği tekilleştirilir; ürün sayılarını toplamak
benzersiz site toplamını vermez. Tamamlanmış form ve satış ölçülmez.

[Genel Bakış — OD · ODK · OK](https://eu.posthog.com/project/293919/dashboard/996818)
karşılaştırma ekranıdır. Saat dilimi `Europe/Istanbul` olarak ayarlandı.
Sekiz grafik site genelini ve üç ürünün günlük ziyaret/CTA karşılaştırmasını gösterir.

Ürün başına ayrı, 12 grafik içeren panolar:

- [OD — onlinedershanem.](https://eu.posthog.com/project/293919/dashboard/996847)
- [ODK — Deneme Ligi](https://eu.posthog.com/project/293919/dashboard/996849)
- [OK — onlinekoçum.](https://eu.posthog.com/project/293919/dashboard/996850)

Her ürün panosu benzersiz ziyaretçi, sayfa görüntüleme, CTA tıklayan ziyaretçi,
günlük ilgi, paket/başvuru ve ön görüşme hunileri, buton türü, cihaz,
yönlendiren alan adı, kaydırma derinliği, SSS ve CTA bölümünü gösterir.
KPI kartları önceki dönemle karşılaştırılır. Pano içi bağlantılar ürünler arasında
geçiş sağlar. Bunlar tanıtım ölçümleridir; satış veya panel kullanım metrikleri değildir.
Her sorgu yalnız `onlinedershanem.com` ve `www.onlinedershanem.com` alanlarını
ölçer; localhost ve preview trafiği dışarıda kalır.

Huni aynı ziyaretçinin Deneme Ligi sayfasını görüp yedi gün içinde başvuru
butonuna tıklamasını ölçer. CTA tıklaması tamamlanmış Tally formu veya satış
değildir. Canlı siteden olay gelene kadar üretim grafikleri boş olabilir.

## Toplanan olaylar

- `$pageview`: ilk ziyaret ve Next.js sayfa geçişleri.
- `cta_clicked`: mevcut `data-analytics-id` taşıyan CTA'lar.
- Ürün sayfalarının ana içeriğindeki doğrulanmış paket, Tally başvuru,
  ön görüşme, nasıl işler ve diğer ürün bağlantıları da `cta_clicked` oluşturur.
- `product_scroll_depth`: ürün sayfasında kaydırılabilir mesafenin %25, %50,
  %75 ve %100 eşikleri; ziyaret başına her eşik bir kez. Okuma ölçümü değildir.
- `product_faq_opened`: ürün sayfasında SSS açılması; ziyaret başına her soru
  bir kez. `faq_index` sayfanın mevcut soru sırasıdır.

Üç ürünün tanıtım sayfalarında `product_code` OD/ODK/OK olarak gönderilir.
Ortak `/paketler` sayfasına bir ürün kodu atanmaz. CTA'nın `cta_kind` değeri
hedef türünü, `cta_position` header/main/footer konumunu, `cta_section` ana
içeriğin bölüm sırasını gösterir. Bağlantı sorguları ve buton metinleri gönderilmez.
Yeni olaylar ve alanlar kod yayınlandıktan sonra birikir; geçmişe doldurulmaz.

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
