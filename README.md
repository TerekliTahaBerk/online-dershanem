# Online Dershanem

[![CI](https://github.com/TerekliTahaBerk/online-dershanem/actions/workflows/ci.yml/badge.svg)](https://github.com/TerekliTahaBerk/online-dershanem/actions/workflows/ci.yml)
[![Lighthouse](https://github.com/TerekliTahaBerk/online-dershanem/actions/workflows/lighthouse.yml/badge.svg)](https://github.com/TerekliTahaBerk/online-dershanem/actions/workflows/lighthouse.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: Proprietary](https://img.shields.io/badge/license-proprietary-red.svg)](LICENSE)

Türkiye'deki çevrim içi eğitim operasyonlarını satıştan öğrenme çıktısına kadar tek üründe birleştiren, rol bazlı eğitim ve işletme platformu.

[Canlı site](https://onlinedershanem.com) · [Hata bildir](https://github.com/TerekliTahaBerk/online-dershanem/issues/new?template=bug_report.yml) · [Özellik öner](https://github.com/TerekliTahaBerk/online-dershanem/issues/new?template=feature_request.yml)

## Ürün alanları

| Alan | Kapsam |
| --- | --- |
| **Online Dershanem** | Dersler, ödevler, materyaller, gelişim takibi ve veli görünümü |
| **Online Deneme Kulübü** | Deneme sınavları, güvenli sınav akışı ve kazanım analizi |
| **İşletme Paneli** | Instagram CRM, aday hunisi, reklam performansı ve ortak finans defteri |

Yönetici, öğretmen, öğrenci ve veli deneyimleri ayrı navigasyonlara ve yatay erişim kontrollerine sahiptir. Panel hesapları yalnızca yönetici tarafından oluşturulur; public self-register bulunmaz. İşletme erişimi ise platform rolünden bağımsız olarak `BusinessRoleAssignment` ile verilir.

## Öne çıkan yetenekler

- Public satış sitesi, SEO uyumlu blog, lead formu, sepet ve PayTR ödeme akışları
- Ders programı, hızlı ders notu/yoklama, ödev ve materyal yönetimi
- Öğrenci gelişimi, veli raporları, takvim ve ödeme görünümü
- Deneme sınavı yaşam döngüsü, otomatik puanlama ve kazanım raporları
- Instagram mesaj kutusu, CRM, reklam ve finans operasyonları
- Denetlenebilir yetkilendirme, audit kayıtları, rate limiting ve güvenli rollout kapıları
- Sağlık kontrolleri, cron heartbeat'leri, yedekleme ve gözlemlenebilirlik iş akışları

## Teknoloji

- Next.js 16 App Router, React 18 ve TypeScript 5
- PostgreSQL ve Prisma 6
- Tailwind CSS 3
- Playwright, Node test runner ve Lighthouse CI
- Vercel, Vercel Blob, Resend, PayTR ve isteğe bağlı Meta/OpenAI entegrasyonları

## Lokal kurulum

Gereksinimler: Node.js 22+, npm ve PostgreSQL.

```bash
git clone https://github.com/TerekliTahaBerk/online-dershanem.git
cd online-dershanem
npm ci
cp .env.example .env.local
npm run prisma:generate
npm run prisma:deploy
npm run db:seed
npm run dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde açılır. `.env.example` güvenli varsayılanları ve entegrasyonların opt-in anahtarlarını belgeler; gerçek anahtarları repoya eklemeyin.

## Doğrulama

```bash
npm run lint
npm run lint:hygiene
npm run typecheck
npm run test:unit
npm run test:integration
npm run build
npm run e2e
```

Entegrasyon testleri `DATABASE_URL` gerektirir; değişken yoksa ilgili testler atlanır. Chromium, Firefox ve WebKit panel kabul paketi için:

```bash
npx playwright install chromium firefox webkit
npm run e2e:cross-browser
```

## Veritabanı ve yayın

Canlı veritabanında yalnızca sürümlenmiş migration'ları uygulayın:

```bash
npm run release:migrate
```

Tamamen boş bir veritabanı güvenli biçimde şu komutla hazırlanabilir:

```bash
ALLOW_FRESH_DB_BOOTSTRAP=true npm run db:bootstrap:fresh
```

Komut boş olmayan veritabanında çalışmayı reddeder. Ortam değişkenleri, e-posta politikası, yedek geri yükleme ve canlı kabul adımları için [operasyon kılavuzuna](docs/panel-operations.md) ve [yayın kontrol listesine](docs/deployment-checklist.md) bakın.

Sürümler `v*` biçimindeki etiketlerle yayımlanır. Etiket push edildiğinde release iş akışı kalite kontrollerini çalıştırır ve GitHub Release notlarını üretir. Değişiklikler [CHANGELOG.md](CHANGELOG.md) dosyasında tutulur.

## Dokümantasyon

- [Panel operasyonları](docs/panel-operations.md)
- [Güvenlik ve KVKK](docs/security-and-kvkk.md)
- [İşletme RBAC modeli](docs/business-rbac.md)
- [Meta / Instagram kurulumu](docs/meta-instagram-setup.md)
- [OpenAI destekli taslak kurulumu](docs/openai-assistant-setup.md)
- [ODK pilot kabul kontrol listesi](docs/odk-pilot-acceptance-checklist.md)

## Katkı ve güvenlik

Katkı süreci için [CONTRIBUTING.md](CONTRIBUTING.md), güvenlik açığı bildirimleri için [SECURITY.md](SECURITY.md) dosyasını okuyun. Hassas bir açığı herkese açık issue olarak paylaşmayın.

## Lisans

Bu depo açık kaynak değildir. Kaynak kodun tüm hakları saklıdır; kullanım ve dağıtım koşulları için [LICENSE](LICENSE) dosyasına bakın.
