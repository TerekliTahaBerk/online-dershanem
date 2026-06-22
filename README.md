# Online Dershanem - Test

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

## Panel Feature Flag

Eski panel (öğrenci / öğretmen / veli / admin) geçici olarak kapalıdır. Yeni
panel geliştirilirken public site (landing, paketler, blog, ödeme/lead akışları)
çalışmaya devam eder.

```env
PANEL_ENABLED=false
NEXT_PUBLIC_PANEL_ENABLED=false
PUBLIC_REGISTER_ENABLED=false
```

### Public Self-Register Kapalı (yeni ürün kuralı)

Public tarafta kullanıcı **kendi kendine kayıt olmaz**. Akış:

1. Kullanıcı public siteden paket satın alır (**guest checkout** — login zorunlu
   değil). Öğrenci/veli bilgileri ödeme kaydıyla (`PurchaseIntent`) saklanır.
2. Ödeme başarılı olunca kayıt "ödemesi alınmış, hesap açılacak" olarak admin/
   onboarding kuyruğunda kalır (mevcut DB modelinde; yeni tablo eklenmedi).
3. Admin daha sonra öğrenci/veli hesabını oluşturur ve kullanıcıya geçici şifre
   veya tek kullanımlık davet linki verir (mevcut `User.userInviteToken` /
   `mustChangePassword` alanları kullanılır).
4. Kullanıcı `/giris` ile giriş yapar; ilk girişte zorunlu şifre değişimi
   (`mustChangePassword`) korunur.

`PUBLIC_REGISTER_ENABLED=false` (default) iken `/kayit`, `/api/auth/send-code`
(REGISTER) ve `/api/auth/complete-registration` self-register'ı kapatır.
`PASSWORD_RESET` / davet / ilk giriş akışları **etkilenmez**. Eski self-register'ı
test için `PUBLIC_REGISTER_ENABLED=true` ile geri açabilirsiniz.

> Not: Canlı PayTR iframe checkout'u (`OdOrder`/`OdkOrder`) şu an login gerektirir
> (`/paketler/satin-al`, `/odk-paketleri/[slug]/satin-al` → `/giris`). Guest
> checkout'a tam geçiş ödeme-kritik kodu (`userId` nullable migration,
> `markOdOrderPaid`, callback `notifyUser`) etkilediğinden ayrı bir adıma
> bırakıldı. Mevcut guest `PurchaseIntent` akışı (`/api/purchases`) bozulmadı.

- Varsayılan: kapalı. Panel kapalıyken `/panel/*`, `/giris`, `/kayit`,
  `/sifremi-unuttum` → `/panel-yenileniyor` sayfasına yönlenir; panel/admin
  API'leri `503` JSON döner.
- İleride eski paneli test etmek için `PANEL_ENABLED=true` (ve client linkleri
  için `NEXT_PUBLIC_PANEL_ENABLED=true`) yapılabilir; eski davranış aynen döner.

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
