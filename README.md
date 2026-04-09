# Online Dershanem

Landing-first Next.js uygulaması artık auth, admin paneli ve Prisma veri katmanı ile genişletildi.

## Kurulum

```bash
npm install
cp .env.example .env.local
```

`.env.local` içinde en az şu alanları doldurun:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`
- `PAYMENT_WEBHOOK_SECRET`

## Veritabanı

```bash
npx prisma generate
npm run db:push
npm run db:seed
```

Bu akış:

- Prisma tablolarını oluşturur
- Admin kullanıcısını seed eder
- Login/logout ve admin panelini aktif hale getirir

## Geliştirme

```bash
npm run dev
```

Kullanılabilir ekranlar:

- `/giris`: yönetici login
- `/admin`: lead ve satın alma kayıtlarını gösteren korumalı panel

## Form ve Satın Alma Akışı

- Lead funnel ve inline formlar artık `/api/leads` endpoint’ine yazılır.
- Satın alma ön bilgi formu `/api/purchases` endpoint’ine yazılır.
- Ödeme sağlayıcısı callback’leri için `/api/purchases/webhook` zemini hazırdır.

## Vercel

Repo, Vercel üzerindeki `online-dershanem` projesine linklendi.

Deploy öncesi Vercel tarafında aynı env değişkenlerini tanımlayın:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`
- `PAYMENT_WEBHOOK_SECRET`
