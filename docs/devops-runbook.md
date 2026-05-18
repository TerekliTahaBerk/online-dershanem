# DevOps Runbook — Production Operations

Bu doküman üretim ortamı yönetimi için pratik operasyon adımlarını içerir. Round 9 — DevOps polish çıktısıdır.

---

## 1. Database Backup & Restore (Neon / Supabase)

### 1.1 Otomatik snapshot durumu
Hem Neon hem Supabase yönetilen Postgres servisleri **otomatik günlük snapshot** alır:

| Sağlayıcı | Plan | Retention | RPO | RTO |
|-----------|------|-----------|-----|-----|
| Neon Free | — | 1 gün | 24 saat | ~5dk |
| Neon Pro | — | 7 gün (PITR) | 1 saniye | ~5dk |
| Supabase Free | — | 7 gün (günlük) | 24 saat | ~10dk |
| Supabase Pro | — | 7 gün + PITR | 1 dakika | ~10dk |

**Karar:** Production öncesi en azından Neon Pro veya Supabase Pro plana geçilmesi şart (PITR olmadan veri kaybı kabul edilemez).

### 1.2 Manuel backup (haftalık off-site arşiv)
Cron'a bağlı değil — `DATABASE_URL` ile lokal/CI'dan haftalık çağrılabilir:

```bash
# 1. Pg_dump (sıkıştırılmış custom format)
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="backup-$(date +%Y%m%d).dump"

# 2. Boyut kontrolü
ls -lh backup-*.dump

# 3. S3/R2 upload (örnek aws cli)
aws s3 cp backup-$(date +%Y%m%d).dump \
  s3://onlinedershanem-backups/db/ \
  --storage-class STANDARD_IA
```

**Saklama politikası:** Son 4 hafta + son 12 ay aylık (32 dosya max).

### 1.3 Restore prosedürü (felaket senaryosu)

**Senaryo A — Sağlayıcı dashboard üzerinden PITR:**
1. Neon/Supabase console → Branch / Restore noktası seç
2. Hedef zaman: olay öncesi 1-5 dk
3. Yeni branch oluştur (production'ı bozma)
4. Validate: `psql NEW_URL -c "SELECT MAX(created_at) FROM \"User\""`
5. Application için `DATABASE_URL` env'i güncelle, `vercel deploy --prod`
6. Eski branch'i 24 saat sakla (rollback için)

**Senaryo B — Manuel dump restore:**
```bash
# Yeni boş database oluştur
psql ADMIN_URL -c "CREATE DATABASE onlinedershanem_restore;"

# Restore et
pg_restore --dbname=onlinedershanem_restore \
  --no-owner --no-acl \
  --clean --if-exists \
  backup-YYYYMMDD.dump

# Vacuum + analyze (performans için)
psql onlinedershanem_restore -c "VACUUM ANALYZE;"

# Migration tablosunu kontrol et
psql onlinedershanem_restore -c "SELECT * FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5;"
```

**RTO hedefi:** 30 dakika içinde yeni DB ayağa kalkıp prod'a bağlanmalı.

### 1.4 Backup health check (haftalık manuel)
- [ ] Son 7 günde en az 7 otomatik snapshot var mı?
- [ ] Son manuel weekly dump > 50 MB ve restore edilebilir mi?
- [ ] PITR son 24 saat denenmiş mi? (Yeni branch, küçük query)
- [ ] `_prisma_migrations` tablosu prod ile aynı sayıda kayda sahip mi?

---

## 2. Staging / Preview Environment

### 2.1 Vercel Preview Deployments
Her `git push` (main hariç branch) için Vercel otomatik **preview deployment** üretir. Bu deployment'ları "staging" gibi kullanma standartı:

```bash
# Branch oluştur
git checkout -b feature/foo
git push -u origin feature/foo

# Vercel preview URL'i otomatik üretilir: https://onlinedershanem-feature-foo-...vercel.app
```

### 2.2 Staging-specific env değişkenleri
Vercel proje ayarlarında **Environment Variables** sekmesinde:

| Variable | Production | Preview | Development |
|----------|------------|---------|-------------|
| `DATABASE_URL` | prod Neon | **staging branch (Neon branching)** | local |
| `PAYTR_MERCHANT_ID` | gerçek | **PayTR test** | PayTR test |
| `PAYTR_TEST_MODE` | `0` | `1` | `1` |
| `RESEND_API_KEY` | prod key | **test domain** | test domain |
| `NEXTAUTH_URL` | https://onlinedershanem.com | $VERCEL_URL otomatik | http://localhost:3000 |
| `CRON_SECRET` | prod | dev_only | dev_only |
| `LOG_LEVEL` | `info` | `debug` | `debug` |

**Karar:** Production verisi preview'a sızmasın diye **Neon branching** kullanılarak preview için ayrı bir branch oluşturulmalı. Vercel-Neon integration bunu otomatik yapar.

### 2.3 Test verileri (preview)
Her preview build başında `prisma/seed.mjs` ile minimal test verisi yüklenir:
- 1 admin (admin@test.local / Test1234!)
- 3 öğretmen, 10 öğrenci, 5 veli
- 2 ODK paketi, 5 deneme
- 50 örnek attempt

### 2.4 Preview'da cron'ları durdur
`vercel.json` cron tanımları sadece production'da çalışır. Preview'da `runJob`'un CRON_SECRET kontrolü 401 döner — beklenen.

---

## 3. Monitoring & Alerts

### 3.1 Mevcut katmanlar (Round 1-8)
- **Vercel Analytics** — sayfa görüntüleme + Web Vitals
- **Vercel Speed Insights** — Real User Monitoring
- **Structured logger** (`lib/logger.ts`) — Vercel stderr → JSON parse-able
- **AuditLog** — kullanıcı/admin aksiyonları (DB)
- **EmailOutbox** — email delivery health
- **`lib/error-capture.ts`** — Sentry stub (henüz aktif değil)

### 3.2 Sentry kurulumu (önerilen — manuel adım)
Round 1'de stub kalmıştı; aktive etmek için:

```bash
# 1. Paket kurulumu
npm install --save @sentry/nextjs

# 2. Wizard çalıştır (otomatik config üretir)
npx @sentry/wizard@latest -i nextjs

# 3. Wizard 4 dosya oluşturur:
#    - sentry.client.config.ts
#    - sentry.server.config.ts
#    - sentry.edge.config.ts
#    - next.config.ts'e withSentryConfig wrap

# 4. lib/error-capture.ts'i güncelle:
#    captureError() içinden Sentry.captureException(err, { extra: context }) çağır
```

**Env değişkenleri:**
- `NEXT_PUBLIC_SENTRY_DSN` — projeden alınır
- `SENTRY_AUTH_TOKEN` — source map upload için
- `SENTRY_ORG`, `SENTRY_PROJECT`

**Sampling:** Server `tracesSampleRate: 0.1`, client `0.05` ile başla. Hata oranı yüksek olduğunda artırılabilir.

### 3.3 Alert kurulumu (Sentry sonrası)
Sentry → Alerts → Issues:
- **P0:** Aynı hata > 50/saat → Slack #alerts kanalına
- **P1:** Yeni issue (ilk 24 saat) → Email
- **P2:** Performance regression (P75 LCP > 2.5s) → Weekly digest

Vercel → Project Settings → Notifications:
- Build fail → Email
- Deployment ready → Slack webhook

### 3.4 Critical metrics dashboard
Manuel kontrol noktaları (haftalık):

| Metrik | Yer | Hedef |
|--------|-----|-------|
| LCP P75 (mobile) | Vercel Speed Insights | < 2.5s |
| CLS P75 | Vercel Speed Insights | < 0.1 |
| API 5xx oranı | Vercel logs / Sentry | < 0.5% |
| Email delivery rate | `EmailOutbox` SUCCESS/FAILED | > 98% |
| Failed login lockouts | AuditLog `LOGIN_LOCKOUT` | < 10/gün (anomali işareti) |
| ODK PayTR success | `OdkPayment` PAID/FAILED | > 95% |
| Cron job health | Vercel cron logs | 0 failed/gün |

---

## 4. Deployment Checklist (Production)

### 4.1 Pre-deploy
- [ ] `npx tsc --noEmit` — 0 hata
- [ ] `npx next build` — başarılı
- [ ] Yeni migration var mı? → `prisma migrate deploy` PR'da test edilmiş mi?
- [ ] Env değişkeni eklendi mi? → Vercel UI'da production'a girildi mi?
- [ ] Yeni cron var mı? → `vercel.json` güncellendi mi?
- [ ] Breaking change var mı? → Mobile app uyumlu mu?

### 4.2 Deploy
```bash
# Doğrudan main'e merge → Vercel otomatik deploy
git checkout main
git merge --no-ff test
git push origin main
```

### 4.3 Post-deploy (5 dk içinde)
- [ ] Vercel dashboard'da deployment ready
- [ ] `https://onlinedershanem.com/api/health` 200 dönüyor mu?
- [ ] Ana sayfa görsel doğrulama
- [ ] Login + öğrenci dashboard testi
- [ ] Test alışveriş (ödeme provider test mode varsa)
- [ ] Cron log: bir sonraki çalıştırmada hata yok mu?

### 4.4 Rollback (5 dk içinde mecburiyet halinde)
```bash
# Vercel CLI ile
vercel rollback

# Veya dashboard'dan: Deployments → önceki deployment → "Promote to Production"
```

**Migration rollback:** Geri alınamaz. Sadece forward-fix migration ile düzeltilir.

---

## 5. Sık Karşılaşılan Sorunlar

### 5.1 "Database connection pool exhausted"
- Vercel function concurrency'si Neon pool size'ı aşar
- Çözüm: `DATABASE_URL`'de `connection_limit=5&pool_timeout=20` parametreleri
- Veya: Neon connection pooler URL'i kullan (`-pooler.neon.tech`)

### 5.2 "PayTR callback timeout"
- Vercel function default 10s; PayTR callback uzun sürüyor
- Çözüm: `app/api/odk/paytr/callback/route.ts`'de `maxDuration = 60`

### 5.3 "Email outbox stuck PENDING"
- Cron `/api/cron/email-retry` çalışmıyor
- Kontrol: Vercel cron logs son 15dk
- Manuel: `curl -H "Authorization: Bearer $CRON_SECRET" https://onlinedershanem.com/api/cron/email-retry`

### 5.4 "Migration drift"
- `_prisma_migrations` tablosu local ile prod'da farklı
- Çözüm: `npx prisma migrate resolve --applied <migration_name>` (DİKKAT: production'da elle düzeltme)
- Önleme: Migration'ları her zaman test branch'inde PR review et

### 5.5 "Edge runtime cold start"
- OG image rotaları edge'de çalışır; ilk istek 500-800ms
- Beklenen davranış; CDN cache'lemesi 2. istekten itibaren <50ms

---

## 6. Acil Durum Kontakları

| Durum | Kim | Nasıl |
|-------|-----|-------|
| Vercel down | Vercel status | https://www.vercel-status.com |
| Neon down | Neon status | https://neonstatus.com |
| PayTR sorun | PayTR destek | destek@paytr.com |
| Resend sorun | Resend status | https://status.resend.com |
| Domain/DNS | Cloudflare dashboard | — |

---

## Değişiklik Geçmişi

- **2026-05-18:** İlk versiyon — Round 9 DevOps polish kapsamında oluşturuldu.
