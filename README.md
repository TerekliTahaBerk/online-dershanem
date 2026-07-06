# Online Dershanem

Landing-first Next.js uygulaması. Public pazarlama sayfaları, blog, lead formu, guest paket satın alma, PayTR iframe ve callback akışlarını içerir. Kullanıcı hesabı, rol bazlı panel ve self-register sistemi yoktur.

## Kurulum

```bash
npm install
cp .env.example .env.local
npx prisma generate
npx prisma migrate dev
npm run dev
```

## Public akışlar

- `/`, ders/deneme landing sayfaları ve `/blog`
- `/paketler`, `/sepet`, `/paketler/satin-al`
- `/odk-paketleri/[slug]/satin-al`
- `POST /api/leads`
- `POST /api/od/checkout/start`
- `POST /api/odk/checkout/start`
- `POST /api/paytr/callback`

Checkout guest olarak çalışır. Alıcı bilgileri siparişin `buyerInfo` alanında tutulur; başarılı ödemede sipariş güncellenir ve müşteri/operasyon e-postaları gönderilir.

## Ortam değişkenleri

`DATABASE_URL`, `DIRECT_URL`, PayTR anahtarları, `RESEND_API_KEY`, `LEAD_NOTIFICATION_EMAILS` ve `CRON_SECRET` gereklidir. Ayrıntılar `.env.example` içindedir.

## Doğrulama ve deploy

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
npx prisma migrate deploy
```

PayTR bildirim URL'si `/api/paytr/callback` olarak ayarlanmalıdır.
