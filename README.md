# Online Dershanem

Next.js 15, PostgreSQL ve Prisma üzerinde çalışan; public satış sitesiyle rol bazlı eğitim panelini aynı üründe birleştiren uygulama.

## Instagram AI CRM, reklam ve finans merkezi

`/panel/yonetim/isletme` alanı Instagram mesaj kutusunu, aday hunisini, kampanya performansını ve OD/ODK ortak finans defterini birleştirir. Eğitim rolleri değişmez; işletme erişimi `BusinessRoleAssignment` ile iş birimi kapsamında verilir. `ADMIN` kullanıcıları süper yönetici kabul edilir.

`.env.example` içindeki işletme değişkenlerini `.env.local` dosyanıza alın; migration, generate ve seed adımlarını çalıştırın. Dış servisler kapalıyken development adapter’ları kullanılır. Webhook `/api/integrations/instagram/webhook`, kalıcı işleyici `/api/cron/business-jobs` adresindedir. Ayrıntılar `docs/meta-instagram-setup.md`, `docs/openai-assistant-setup.md` ve `docs/deployment-checklist.md` içindedir.

## Ürün alanları

- Public site, blog, lead formu, sepet ve PayTR ödeme akışları
- Yönetim paneli: kullanıcılar, veli bağlantıları, gruplar, dersler, raporlar, siparişler ve e-posta kuyruğu
- Öğretmen paneli: ders programı, hızlı ders notu/yoklama, ödev ve materyal yönetimi
- Öğrenci paneli: sıradaki ders, ödevler, materyaller ve gelişim görünümü
- Veli paneli: bağlı öğrenciye özel gelişim, takvim, ödev ve ödeme görünümü

Panel hesapları yalnızca yönetici tarafından oluşturulur; public self-register bulunmaz. Rol ve yatay erişim kontrolleri her sayfa ve API isteğinde uygulanır.

## Lokal kurulum

```bash
npm install
cp .env.example .env.local
npx prisma generate
npx prisma migrate dev
npm run dev
```

## Doğrulama

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run e2e
```

Firefox, WebKit ve Chromium panel kabul paketi:

```bash
npx playwright install chromium firefox webkit
npm run e2e:cross-browser
```

## Veritabanı ve yayın

Mevcut/canlı veritabanında yalnızca migration deploy kullanılır:

```bash
npm run release:migrate
```

Tamamen boş bir veritabanında güvenli başlangıç:

```bash
ALLOW_FRESH_DB_BOOTSTRAP=true npm run db:bootstrap:fresh
```

Komut boş olmayan veritabanında çalışmayı reddeder. Paneli canlıda açmak için Vercel Production ortamında `PANEL_ENABLED=true` ve `NEXT_PUBLIC_PANEL_ENABLED=true` tanımlanıp yeniden deploy edilmelidir.

Ortam değişkenleri, e-posta politikası, yedek geri yükleme ve canlı kabul adımları için [operasyon kılavuzuna](docs/panel-operations.md) bakın.

PayTR bildirim URL'si `/api/paytr/callback` olarak ayarlanmalıdır.
