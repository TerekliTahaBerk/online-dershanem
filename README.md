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
- `RESEND_API_KEY`
- `ADMIN_EMAIL`
- `LEAD_NOTIFICATION_EMAILS` (opsiyonel, virgulle birden fazla adres verebilirsiniz)
- `ADMIN_PASSWORD`
- `ADMIN_NAME`
- `PAYMENT_WEBHOOK_SECRET`

## Vercel Prisma Postgres

Prisma Postgres'i Vercel Storage uzerinden kullanacaksaniz repo artik
`STORAGE_DATABASE_URL`, `STORAGE_PRISMA_DATABASE_URL` ve `STORAGE_POSTGRES_URL`
degiskenlerini otomatik olarak `DATABASE_URL` / `DIRECT_URL` yerine kabul eder.

Onerilen kurulum:

```bash
vercel link
vercel env pull .env.local --yes
```

Ardindan migrasyon ve seed:

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

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
- Yeni bir `LeadSubmission` kaydı düştüğünde `LEAD_NOTIFICATION_EMAILS` tanımlıysa bu adreslere, yoksa `ADMIN_EMAIL` adresine bildirim maili gönderilir.
- Satın alma ön bilgi formu `/api/purchases` endpoint’ine yazılır.
- Ödeme sağlayıcısı callback’leri için `/api/purchases/webhook` zemini hazırdır.

## Vercel

Repo, Vercel üzerindeki `online-dershanem` projesine linklendi.

Deploy öncesi Vercel tarafında ya klasik Prisma degiskenlerini ya da Vercel
Storage'in otomatik ekledigi `STORAGE_*` degiskenlerini tanimlayin:

- `DATABASE_URL`
- `DIRECT_URL`
- `STORAGE_DATABASE_URL`
- `STORAGE_PRISMA_DATABASE_URL`
- `STORAGE_POSTGRES_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `RESEND_API_KEY`
- `ADMIN_EMAIL`
- `LEAD_NOTIFICATION_EMAILS`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`
- `PAYMENT_WEBHOOK_SECRET`

<!-- redeploy trigger -->
