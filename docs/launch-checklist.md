# Production Launch Checklist

> 12 round'luk hardening sürecinin (R1-R11) sonunda canlıya alma öncesi
> doğrulama listesi. Her madde işaretlenmeden production'a deploy yapılmaz.

## 0. Build & Test
- [x] `npx tsc --noEmit` → `EXIT=0`
- [x] `npm run build` → tüm route'lar derlendi (panel, public, api/cron, api/v1)
- [ ] Manuel smoke test: `/`, `/yks`, `/lgs`, `/odk`, `/giris`, `/panel/admin`
- [ ] Mobil görünüm sanity check (Chrome DevTools, iPhone SE viewport)

## 1. Environment Variables (Vercel Dashboard → Settings → Environment Variables)

### Zorunlu (eksikse build patlar)
- [ ] `DATABASE_URL` — production Postgres bağlantısı
- [ ] `DIRECT_URL` — Prisma migrate için (Vercel Storage otomatik veriyorsa atla)
- [ ] `NEXTAUTH_URL` — `https://onlinedershanem.com`
- [ ] `NEXTAUTH_SECRET` — **min 32 char random** (`openssl rand -base64 48`)

### Zorunlu (özellik için)
- [ ] `RESEND_API_KEY` — email gönderimi
- [ ] `MAIL_FROM` — `Online Dershanem <noreply@onlinedershanem.com>`
- [ ] `PAYTR_MERCHANT_ID`, `PAYTR_MERCHANT_KEY`, `PAYTR_MERCHANT_SALT`
- [ ] `PAYMENT_WEBHOOK_SECRET` — webhook imza doğrulama
- [ ] `CRON_SECRET` — `/api/cron/*` rotalarını koruyan bearer token

### Önerilen
- [ ] `EXPO_ACCESS_TOKEN` — push notification
- [ ] `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER` — realtime
- [ ] `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`
- [ ] `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — cache backend
- [ ] `LOG_LEVEL` — production'da `info` öneriliyor

### Seed/Admin
- [ ] `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` — ilk admin seed için
- [ ] `LEAD_NOTIFICATION_EMAILS` — yeni lead bildirimi

## 2. Database
- [ ] Production DB üzerinde `prisma migrate deploy` çalıştırıldı
- [ ] `prisma db seed` (sadece ilk kurulumda) — admin kullanıcı oluşur
- [ ] Connection pool ayarları kontrol edildi (Prisma + serverless)
- [ ] Backup politikası aktif (Vercel Postgres / Neon otomatik / manuel cron)

## 3. Cron Jobs (`vercel.json`)
Tümünün route handler'ı **var** ve `CRON_SECRET` bearer kontrolüyle korunuyor:
- [x] `/api/cron/lesson-reminders` — `*/5 * * * *`
- [x] `/api/cron/assignment-reminders` — `0 9 * * *`
- [x] `/api/cron/parent-weekly-digest` — `0 5 * * 1` (Mon 08:00 TRT)
- [x] `/api/cron/email-retry` — `*/15 * * * *`
- [x] `/api/cron/notification-digest` — `0 8 * * *`
- [x] `/api/cron/audit-retention` — `0 3 * * *` (365d retention, PROTECTED actions hariç)
- [x] `/api/cron/rate-limit-prune` — `0 4 * * *`
- [ ] Vercel Dashboard → Cron Jobs sekmesinden ilk gün manuel trigger ile test

## 4. Security
- [x] Login brute-force: email-based (5/15dk) + IP-based (20/saat) — `lib/login-attempts.ts`
- [x] Audit log destructive aksiyonlarda aktif: lesson cancel/delete, student/classroom delete, ödeme, ODK access, KVKK export
- [x] Security headers (`next.config.ts`): HSTS, X-Frame-Options, Permissions-Policy, Referrer-Policy
- [x] `/api/v1/me/data-export` — KVKK 11. madde, kullanıcı başına 5/gün rate-limit
- [ ] Vercel domain'de HTTPS otomatik → `Strict-Transport-Security` aktif
- [ ] Admin paneline IP allowlist (opsiyonel — sadece ofis IP'leri)

## 5. SEO
- [x] `robots.txt` — `/panel`, `/api`, auth route'ları disallow + AI bot block
- [x] `sitemap.xml` — dynamic ODK paketleri dahil, saatlik ISR
- [x] JSON-LD: Organization, WebSite, FAQ (anasayfa) + Course (yks/lgs) + Article (blog)
- [x] OpenGraph + Twitter Card metadata her landing'de
- [ ] Google Search Console → sitemap submit
- [ ] PageSpeed Insights ≥ 90 (mobile + desktop)

## 6. Observability
- [x] `/api/health` — db latency + cache status + env validation + memory
- [x] Structured logger (`lib/logger.ts`) — prod'da JSON line
- [x] Cron jobs `cron.start/done/failed` event'leri loglar
- [x] Global error boundary (`app/global-error.tsx`)
- [ ] Uptime monitor kurulumu (BetterStack/UptimeRobot → `/api/health`, 5dk interval)
- [ ] İlk hafta Vercel Logs dashboard günlük kontrol

## 7. Performans
- [x] Cache wrapper (Upstash REST + in-memory fallback): admin analytics 30-60s, top-risky 5dk
- [x] Pagination utility (`lib/pagination.ts`)
- [x] Next.js Image otomatik optimization
- [x] `optimizePackageImports`: lucide-react, framer-motion
- [ ] Vercel Edge Network: tüm static assets cache'leniyor
- [ ] Web Vitals: Speed Insights dashboard ilk gün kontrol

## 8. KVKK / Hukuki
- [x] `/gizlilik`, `/kvkk`, `/iade` sayfaları yayında
- [x] Kişisel veri ihraç endpoint (`/api/v1/me/data-export`) audit'li
- [x] Audit log 365 gün retention, KVKK-critical action'lar (DELETE, LOCKOUT, PAYMENT) süresiz
- [ ] Cookie consent (gerekirse — Türkiye için zorunlu değil ama önerilir)
- [ ] Veri işleme sözleşmesi (DPA) — Resend, Vercel, Pusher, Expo, PayTR ile

## 9. İlk Hafta İzleme (post-launch)
- [ ] Gün 1: Her cron'un Vercel logs'tan ilk başarılı çalışmasını doğrula
- [ ] Gün 1: İlk gerçek lead → email → admin notification ucu uca doğrula
- [ ] Gün 1: İlk gerçek ödeme → webhook → entitlement → audit doğrula
- [ ] Gün 3: `/api/health` uptime ≥ 99.5%
- [ ] Gün 7: Audit log volume kontrolü, beklenmedik action var mı?
- [ ] Gün 7: Email outbox PENDING/FAILED ratio < %1

## 10. Rollback Planı
- [ ] Vercel önceki deployment'a "Promote to Production" tek tık
- [ ] DB migration geri alma scripti hazır (manuel SQL ile)
- [ ] Critical bug için "maintenance mode" planı (statik HTML fallback)

---

## Round-by-round özet

| Round | Konu | Status |
|---|---|---|
| R1 | Foundation hardening (env validation, logger, audit) | ✅ |
| R2 | Audit fan-out + email-based brute force | ✅ |
| R3 | Cache layer (Upstash + memory fallback) + pagination | ✅ |
| R4 | Teacher experience polish (auto-advance, risk badge) | ✅ |
| R5 | Parent experience rebuild (weekly digest + alerts) | ✅ |
| R6 | B2B foundation | ⏭️ Skipped (premature) |
| R7 | Background jobs & cron infra (KRİTİK: 3 cron 404 fix!) | ✅ |
| R8 | Security finalize (IP brute force, KVKK export, audit gaps) | ✅ |
| R9 | DevOps polish (security headers, global error, health++) | ✅ |
| R10 | Landing & SEO (robots, sitemap, JSON-LD helpers) | ✅ |
| R11 | UX polish (404, loading skeleton, more JSON-LD) | ✅ |
| R12 | QA & launch (this doc) | 🔄 |

**Toplam:** 11 round tamamlandı, 1 skip. Production-ready.
