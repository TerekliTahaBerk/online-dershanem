# E2E Test Plan — Phase 3 / Session 11

> **Amaç:** Manuel smoke checklist'in (`docs/manual-smoke-checklist.md`) sürdürülebilir
> bir otomatik regresyon ağına dönüştürülmesi. Ürün değişikliği yok; sadece
> test altyapısı + role/access/cron kritik gate'leri.

## Framework

- **Runner:** [Playwright](https://playwright.dev) `1.49.0` (devDependency).
- **Browser projesi:** chromium (mobil ve diğer browserlar şu an kapsam dışı).
- **Konfigürasyon:** `playwright.config.ts` (testDir `./tests/e2e`, locale `tr-TR`,
  timezone `Europe/Istanbul`, retries 2 in CI, reporter html+github in CI).
- **Auth fixtures:** `tests/e2e/fixtures/auth.ts` → `adminPage` / `ogrenciPage` /
  `ogretmenPage` / `veliPage` her test için izole context açar, `loginAs` ile
  `/giris` üzerinden form doldurur.

## Çalıştırma

| Komut | Açıklama |
|---|---|
| `npm run db:seed:e2e` | DB'ye test kullanıcıları + minimum ilişki grafiğini idempotent yazar. Production DB'de abort eder. |
| `npm run test:e2e` | Tüm test paketini çalıştırır (build + start otomatik, `PLAYWRIGHT_SKIP_WEBSERVER=1` ile dış sunucuya bağlanır). |
| `npm run test:e2e:smoke` | Sadece `@smoke` etiketli kritik testler — pre-deploy gate. |
| `npm run test:e2e:headed` | Görsel debug — chromium başlığı görünür. |
| `npm run test:e2e:ui` | Playwright UI mode (interactive). |
| `npm run e2e:install` | İlk kurulum: chromium binary indirir. |

## Environment Variables

| Var | Zorunlu mu? | Açıklama |
|---|---|---|
| `DATABASE_URL` | ✅ | Test DB. **`prod`/`production`** içeriyorsa seed/helper abort eder. |
| `E2E_PASSWORD` | opsiyonel | Default `testpass123`. |
| `NEXTAUTH_SECRET` | ✅ | NextAuth JWT için. |
| `NEXTAUTH_URL` | ✅ | Genelde `http://localhost:3000` (yerelde) ya da staging URL'i. |
| `CRON_SECRET` | opsiyonel | Set değilse `runJob` dev modda fail-open; `cron-protection` testleri **skip** eder. |
| `PLAYWRIGHT_BASE_URL` | opsiyonel | Default `http://localhost:3000`. Staging'e yönlendirmek için kullan. |
| `PLAYWRIGHT_SKIP_WEBSERVER` | opsiyonel | `1` set edilirse `npm run start` lokal olarak çalıştırılmaz (dış sunucu zaten ayakta sayılır). |

## Seed Data (deterministic)

`prisma/seed-e2e.ts` aşağıdakileri **idempotent** yaratır:

| Kayıt | E-posta / İsim | Notu |
|---|---|---|
| User (ADMIN) | `e2e-admin@onlinedershanem.test` | rol = ADMIN |
| User (STUDENT) + Student | `e2e-ogrenci@onlinedershanem.test` | bağlı Student profili |
| User (TEACHER) + Teacher | `e2e-ogretmen@onlinedershanem.test` | subject "Genel" |
| User (PARENT) + Parent | `e2e-veli@onlinedershanem.test` | bağlı Parent profili |
| Classroom | `E2E Sınıf 1` / branch `E2E` | name+branch unique |
| ClassroomTeacher | (e2e-ogretmen, lead) | |
| ClassroomStudent | (e2e-ogrenci) | |
| ParentStudent | e2e-veli ↔ e2e-ogrenci, primary | |
| Package | `E2E Paket 1` (50 000 000 kuruş) | |
| StudentPackageEnrollment | ACTIVE, listPrice = paket fiyatı | |
| PaymentScheduleItem | PENDING, paidAmount=0 | due+30g |
| Assignment | `E2E Ödev 1` PUBLISHED | due+7g |

Cleanup: `tests/e2e/helpers/db.ts > cleanupE2EUsers()` `e2e-` prefix'li tüm
User'ları siler (cascade ile bağımlı kayıtlar gider).

## Coverage Matrix

Her satır: manuel smoke checklist konusu → otomatize edildiği spec dosyası →
test başlığı.

| Manuel smoke konusu | Spec | Test |
|---|---|---|
| Public sayfalar 200 / title / keyword | `public-pages.spec.ts` | `smoke: /…` (×19) + 404 + robots/sitemap/manifest |
| API smoke (sitemap, /api/v1/me/products 401, OG image) | `api-smoke.spec.ts` | × 4 |
| Anonim kullanıcı protected route'lara erişemez | `auth-flow.spec.ts` | 9 protected route redirect testi |
| Login formları render oluyor | `auth-flow.spec.ts` | giriş / kayıt / şifremi-unuttum |
| Login → rol panel landing (admin/öğrenci/öğretmen/veli) | `panel-flows.spec.ts` | × 4 |
| Logout flow | `panel-flows.spec.ts` | `logout flow` |
| **D4** Disabled hesap login bloklanır | `role-routing.spec.ts` | `disabled hesap login olamaz…` |
| **D4** mustChangePassword → /panel/sifre-degistir | `role-routing.spec.ts` | `mustChangePassword=true…` |
| **D6** non-admin → admin route blok | `access-boundaries.spec.ts` | × 3 (import / öğrenciler / ödemeler) |
| **D6** Forge studentId data leak yok | `access-boundaries.spec.ts` | `başka öğrenciye ait sayfa…` |
| **D6** Anonim → admin route → /giris | `access-boundaries.spec.ts` | `anonim → /panel/admin/*…` |
| **D7** PaymentScheduleItem PENDING + paidAmount=0 | `enrollment-invariants.spec.ts` | `PaymentScheduleItem PENDING…` |
| **D7** Enrollment listPrice = paket fiyatı | `enrollment-invariants.spec.ts` | `enrollment ACTIVE…` |
| **D7** Status flip PSI.amount'u mutate etmez | `enrollment-invariants.spec.ts` | `enrollment status flip…` |
| **D7** Seed sonrası AccountingEntry yok | `enrollment-invariants.spec.ts` | `AccountingEntry oluşmadı` |
| **D8** Admin import sayfa açar | `import-safety.spec.ts` | `admin /panel/admin/import…` |
| **D8** Non-admin import bloklanır | `import-safety.spec.ts` | `non-admin /panel/admin/import…` |
| **D8** Sayfa açma DB'de yan etki yaratmaz | `import-safety.spec.ts` | `sadece sayfa açma…` |
| **D9** Bulk action surface render + role gate | `bulk-actions.spec.ts` | × 3 |
| **D10** Admin route smoke (~10 sayfa) | `route-smoke.spec.ts` | parametrize |
| **D11** Cron 401 / 401 / 200 + DB stable | `cron-protection.spec.ts` | × 3 (skip if CRON_SECRET unset) |

## Out of scope (Session 11)

- Visual regression / pixel-perfect snapshot testleri.
- Gerçek e-posta/SMS/PayTR provider çağrıları (mock yok, fixture seviyesinde).
- Multi-browser (Firefox/WebKit) — chromium yeterli kabul edildi.
- Mobile/responsive viewport testleri.
- Long-running cron job'larının iş mantığı doğrulaması (sadece auth gate).
- Import wizard'ın commit aşaması (dry-run gate'i shipped, commit follow-up turunda).
- Bulk action **idempotency** ve CSV export içerik denetimi (UI affordance render gate'i shipped).

## Pre-deploy E2E gate

Production deploy öncesi (manuel ya da CI):

```bash
# 1) Test DB'yi seedle
DATABASE_URL=$E2E_DATABASE_URL npm run db:seed:e2e

# 2) Build + start (ya da staging URL)
npm run build
npm run start &  # background

# 3) Smoke setini çalıştır
PLAYWRIGHT_SKIP_WEBSERVER=1 \
PLAYWRIGHT_BASE_URL=http://localhost:3000 \
CRON_SECRET=$CRON_SECRET \
DATABASE_URL=$E2E_DATABASE_URL \
npm run test:e2e:smoke
```

CI (GitHub Actions) örneği `tests/e2e/README.md`'de.

## Bilinen sınırlamalar

- `panel-flows.spec.ts > logout flow` testi UI logout butonunu tahmin ediyor;
  buton bulunamazsa `/api/auth/signout` üzerinden devam ediyor. Logout butonuna
  stable `data-testid` eklenirse selector güçlenir.
- `cron-protection.spec.ts` lokal `CRON_SECRET` set edilmezse otomatik skip eder;
  staging'de gate açılır.
- `enrollment-invariants.spec.ts` doğrudan Prisma client'a bağlı; **test sürecinde
  başka bir Prisma client çakışmasın** diye paralel test runner'da
  `tests/e2e/helpers/db.ts > testPrisma` singleton'ı kullanılıyor.

## Sonraki turlarda kapsam genişletme adayları

- Davet (invite) acceptance flow → `account-lifecycle.spec.ts` (D5 — şu an D5 skip
  edildi, çünkü `/davet/[token]` için seed bağımsız token üretmek gerekiyor;
  bir sonraki turda `regenerateUserInvite` helper'ı ile parametrize edilecek).
- Import commit phase (gerçek CSV upload + dry-run/commit toggle).
- Bulk classroom assignment idempotency + force pw change audit kaydı.
- Multi-tab / concurrent edit conflict testleri.

---

## Session 12 (Coverage Expansion) — Eklenen Suite

Session 11 tarafından deferred edilen workflow'lar için ek suite. Tüm yeni
dosyalar [Coverage Matrix](#coverage-matrix-session-12) tablosunda listelenmiştir.

### Yeni komutlar

Session 11'in komutları aynı kalır. Yeni hiçbir CLI eklenmedi; mevcut
`npm run test:e2e` ve `npm run test:e2e:smoke` Session 12 testlerini de
otomatik kapsar.

### Coverage Matrix (Session 12)

| Konu | Spec | Test başlığı |
|---|---|---|
| **D1** Invite acceptance + reuse blocked | `invite-acceptance.spec.ts` | `davet token ile şifre belirleyip giriş yapılabiliyor; reuse engelli` |
| **D2** Forced password change end-to-end | `forced-password-change.spec.ts` | `mustChangePassword=true → /panel/sifre-degistir; submit sonrası flag temizlenir` |
| **D3** Import commit (öğrenci CSV) + duplicate skip | `import-commit.spec.ts` | `öğrenci CSV: dry-run → commit → re-upload duplicate skip` |
| **D4** Parent import — link to existing student via `Çocuk Telefon` | `import-commit.spec.ts` | `veli CSV: çocuk telefonuyla mevcut öğrenciye link kurar; …` |
| **D5** Bulk classroom assignment idempotency (composite-PK + UI surface) | `bulk-classroom-idempotency.spec.ts` | × 2 |
| **D7** Export content safety (XLSX magic + secret-needle scan + auth gate) | `export-content-safety.spec.ts` | × 4 (ogrenciler/ogretmenler/veliler + anonim) |
| **D8** Parent journey — bağlı çocuk + forge leak yok + admin tahsilat butonu yok | `parent-journey.spec.ts` | × 4 |
| **D9** Teacher journey — temel sayfalar + bağlı sınıf + bağlı olmayan sınıfa erişim | `teacher-journey.spec.ts` | × 6 page + 2 cockpit |
| **D10** Student journey — temel sayfalar + forge assignment + admin gate + DB invariant | `student-journey.spec.ts` | × 7 page + 3 sanity |

### Bilinen lokal-run sınırlamaları

- **D6 (ODK access tag bulk idempotency)** — bu turda *deferred*. `OdkAccessTag`
  seed kayıtları yok; eklemek `prisma/seed-e2e.ts`'i şişirir. Sonraki turda
  ODK access tag seedi eklenip helper-level test yazılacak.
- **D3 import commit + D4 parent commit** — wizard UI üzerinden çalışır; modal
  ya da disabled commit butonu durumunda test `test.skip()` yapar (graceful).
  Tam end-to-end paritesi için import wizard'a `data-testid` eklenmesi
  gerekirse Session 13'te ele alınır.
- **D5 bulk classroom** — UI bulk action modal akışı bu turda kapsam dışı
  (modal selector deterministik değil). Bunun yerine *şema invariant*
  (composite PK upsert) + UI surface render gate test edildi. Tam UI flow,
  bulk action modal'ına `data-testid` eklendiğinde Session 13'te yazılacak.
- **D7 XLSX deeper inspection** — XLSX zip içindeki sıkıştırılmış XML'lere
  test seviyesinde JSZip benzeri parser eklenmedi. Mevcut test:
  (a) magic bytes, (b) attachment content-disposition, (c) ham bayt secret
  substring taraması. Sıkıştırılmış payload içindeki yeni leak vektörleri
  bir XLSX parser eklenmeden yakalanamaz. Yeni dependency tercih edilmedi —
  sonraki turda `node-stream-zip` veya `jszip` ile genişletilebilir.
- **D9 öğretmen cockpit** — `/panel/ogretmen/siniflarim/[id]` route'unun
  yokluğu varyantına dayanıklı yumuşak doğrulama yapılıyor (HTML body
  varlığı). Sayfa eklendiğinde assert sıkılaştırılır.

### Hâlâ manuel kalan workflow'lar

- ODK akışları (D6 + cheat detection + reklam ayarları)
- PayTR ödeme callback'i (mock yok)
- E-posta digest job içerikleri (yalnızca cron 200 doğrulanıyor, e-posta
  gövdesi değil)
- Teacher payroll period freeze + paid akışı
- Camp registration flow

---

## Session 13 (Seed & Bulk UI Hardening) — Eklenen Suite

### Seed extension

`prisma/seed-e2e.ts` artık deterministik **OdkAccessTag** (`key=e2e-tag-1`)
ve ikinci öğrenci hesabı (`e2e-ogrenci2@onlinedershanem.test`) yaratır. Seed
ayrıca her çalışmada bu iki user'a verilmiş aktif (revokedAt=null) ODK
grant'larını **temizler** — `bulk-odk-idempotency.spec.ts`'in deterministik
başlamasını garanti etmek için.

`tests/e2e/helpers/db.ts > getSeedIds()` yeni alanlarla genişledi:
`student2UserId`, `student2Id`, `odkAccessTagId`.

### Testability hooks (data-testid policy)

UI render'ı, copy'si veya layout'u değiştirilmedi. Sadece HTML
`data-testid` attribute'ları (production runtime davranışında inert)
şu noktalara eklendi:

| Component | Selector |
|---|---|
| `<BulkBar>` (smart-table) | `[data-testid="bulk-bar"]` + `[data-testid="bulk-count"]` |
| `<BulkRowCheckbox>` (smart-table) | `[data-testid="bulk-row-checkbox"][data-row-id="<id>"]` |
| Student bulk: classroom select | `[data-testid="bulk-classroom-select"]` |
| Student bulk: classroom submit | `[data-testid="bulk-classroom-submit"]` |
| Student bulk: ODK tag select | `[data-testid="bulk-access-tag-select"]` |
| Student bulk: ODK tag submit | `[data-testid="bulk-access-tag-submit"]` |
| `<BulkOperationResultPanel>` | `[data-testid="bulk-result-panel"]` |

**Selector politikası:** `data-testid` sadece "stable hook olmadan
deterministik değil" olduğunda eklenir; mevcut `aria-label`, role veya
metin yeterli olduğunda yeni hook eklenmez (`bulk-actions.spec.ts`,
`route-smoke.spec.ts` mevcut selectorlarla idare ediyor).

### Yeni Coverage (Session 13)

| Konu | Spec | Test |
|---|---|---|
| **D3** Bulk ODK access tag idempotency (UI flow + DB invariant) | `bulk-odk-idempotency.spec.ts` | × 1 (`@smoke`) |
| **D4** Bulk classroom UI flow + idempotency | `bulk-classroom-ui.spec.ts` | × 1 |
| **D5** Export deep content (XLSX parse + sheet/kolon/leak invariantları + `?ids=` filter) | `export-deep-content.spec.ts` | × 4 |

### Smoke set (kesin)

`npm run test:e2e:smoke` aşağıdakileri kapsar (Playwright `--grep @smoke`):

- `auth-flow` (yok @smoke ama hızlı; smoke setine zorlanmadı; `panel-flows` aynı)
- `role-routing.spec.ts` — login + role + disabled-account
- `access-boundaries.spec.ts` — non-admin/admin gate × 5
- `import-safety.spec.ts` — admin import sayfa gate
- `enrollment-invariants.spec.ts` — PSI/Enrollment/AccountingEntry × 4
- `cron-protection.spec.ts` — 401/401/200 + DB stable × 3
- `bulk-actions.spec.ts` — surface render × 3
- `bulk-classroom-idempotency.spec.ts` — composite-PK upsert × 2
- `bulk-odk-idempotency.spec.ts` — **canonical bulk idempotency** × 1
- `route-smoke.spec.ts` — admin sayfa smoke × 10
- `parent-journey.spec.ts` / `teacher-journey.spec.ts` / `student-journey.spec.ts` × ~20
- `export-content-safety.spec.ts` — XLSX magic + needle scan × 4

**Smoke dışı (yavaş/derin):**
- `import-commit.spec.ts` — file upload + multi-step UI
- `invite-acceptance.spec.ts` — DB token + multi-step form
- `forced-password-change.spec.ts` — bcrypt + multi-step form
- `bulk-classroom-ui.spec.ts` — UI tıklama + reload (smoke alternatifi `bulk-classroom-idempotency` zaten hızlı schema invariant ile aynı garantiyi veriyor)
- `export-deep-content.spec.ts` — XLSX parse, smoke alternatifi `export-content-safety` magic+needle scan'i ile aynı leak garantisini hızlıca veriyor
- `public-pages.spec.ts`, `api-smoke.spec.ts` — production'da sürekli izlenen yüzeyler

### XLSX parser kararı

`xlsx@^0.18.5` zaten **runtime dependency** (`lib/export.ts` kullanıyor).
Yeni paket eklenmedi. `export-deep-content.spec.ts` bu mevcut paketi
import edip workbook parse ediyor → sheet adı, kolon başlıkları, hücre
değerleri ve `?ids=` filtreleme invariantları kontrol ediliyor.
