# E2E Testleri — Playwright

Bu klasör Playwright tabanlı end-to-end smoke testlerini içerir.

## Kurulum

```bash
npm install -D @playwright/test
npx playwright install chromium
```

`package.json` scripts (önerilen):

```jsonc
{
  "scripts": {
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui",
    "e2e:debug": "playwright test --debug",
    "e2e:install": "playwright install chromium"
  }
}
```

## Çalıştırma

```bash
# Prod build üzerinde (otomatik webServer ile)
npm run build && npm run e2e

# Mevcut sunucuya karşı (örn: dev/staging)
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run e2e

# Belirli bir testi çalıştır
npx playwright test public-pages.spec.ts

# UI modunda
npm run e2e:ui
```

## Test Dosyaları

| Dosya | Kapsam |
| --- | --- |
| `public-pages.spec.ts` | 19 public route smoke + 404/robots/sitemap/manifest |
| `auth-flow.spec.ts` | 9 korumalı route → giriş yönlendirme + login/kayıt/şifre forms |
| `api-smoke.spec.ts` | health/me/products/OG image endpoint smoke |
| `panel-flows.spec.ts` | 10 login-sonrası panel smoke (admin/öğrenci/öğretmen/veli + role gate + logout) |
| `fixtures/auth.ts` | Login helper + `adminPage`/`ogrenciPage`/`ogretmenPage`/`veliPage` fixture'ları |

## Test Kullanıcıları

Panel testleri için DB'de E2E kullanıcılarının seed edilmesi gerekir:

```bash
E2E_PASSWORD="testpass123" tsx prisma/seed-e2e.ts
```

Oluşturulan hesaplar:
- `e2e-admin@onlinedershanem.test` (ADMIN)
- `e2e-ogrenci@onlinedershanem.test` (STUDENT)
- `e2e-ogretmen@onlinedershanem.test` (TEACHER)
- `e2e-veli@onlinedershanem.test` (PARENT)

> **UYARI:** `seed-e2e.ts` script'i `DATABASE_URL` içinde `prod`/`production`
> kelimesi tespit ederse abort eder. Yine de yalnızca test/staging DB'lerde
> çalıştırın.

## CI Entegrasyonu

`.github/workflows/e2e.yml` tüm suite'i üç izole shard'a böler. Her shard kendi
PostgreSQL service container'ını, seed verisini ve tek Playwright worker'ını
kullanır; böylece testler paralel hızlanırken ortak DB yarışları oluşmaz.

- Bir hata en fazla bir kez retry edilir; ilk retry trace kaydını üretir.
- Shard'lar `fail-fast: false` ile tamamlanır, böylece tek hata diğer
  shard'lardaki teşhis bilgisini kaybettirmez.
- Blob raporları son `Playwright Tests` job'unda tek HTML raporuna çevrilir.
- PR'daki `playwright-report` artifact'ı hata adımları, screenshot, video ve
  trace ayrıntılarını içerir.
- Required check adı `E2E (Playwright) / Playwright Tests` olarak korunur.

## Bilinen Sınırlar

- Şu an yalnızca **chromium** projeksi aktif; mobil + Firefox ileride eklenebilir
- `webServer` lokal `npm run start` kullanır; staging'e karşı çalıştırmak için
  `PLAYWRIGHT_SKIP_WEBSERVER=1` ile bypass edilir
- Tüm testler `tr-TR` locale ve `Europe/Istanbul` TZ ile çalışır
