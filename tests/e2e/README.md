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

## CI Entegrasyonu

`.github/workflows/e2e.yml` (öneri):

```yaml
- run: npm ci
- run: npx playwright install --with-deps chromium
- run: npm run build
  env:
    DATABASE_URL: ${{ secrets.E2E_DATABASE_URL }}
- run: npm run e2e
```

## Auth Gerektiren Senaryolar (TODO)

Şu anki testler sadece smoke seviyesinde. Tam akış için:

1. Test kullanıcıları için `prisma/seed-e2e.mjs` yazılmalı
2. `tests/e2e/fixtures/auth.ts` ile `storageState` cache'lensin
3. Login → panel navigasyon → ödev gönderme → log out senaryosu eklensin

## Bilinen Sınırlar

- Şu an yalnızca **chromium** projeksi aktif; mobil + Firefox ileride eklenebilir
- `webServer` lokal `npm run start` kullanır; staging'e karşı çalıştırmak için
  `PLAYWRIGHT_SKIP_WEBSERVER=1` ile bypass edilir
- Tüm testler `tr-TR` locale ve `Europe/Istanbul` TZ ile çalışır
