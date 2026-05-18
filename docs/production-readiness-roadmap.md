# Production Readiness Roadmap

**Tarih:** 2026-05-17
**Bağlam:** FAZ 8 (analytics) sonrası, kullanıcının "Finalization & Production Hardening Master Prompt" talebine yanıt.

---

## Tamamlanan Tur — Round 1: Foundation Hardening (önceki commit)

| # | Çıktı | Dosya | Durum |
|---|---|---|---|
| 1 | Audit log helper | `lib/audit.ts` | ✅ NEW |
| 2 | Structured logger (dev pretty / prod JSON) | `lib/logger.ts` | ✅ NEW |
| 3 | Boot-time env validation | `lib/env.ts` + `instrumentation.ts` | ✅ NEW |
| 4 | Health check endpoint | `app/api/health/route.ts` | ✅ NEW (`GET /api/health` → 200/503) |
| 5 | `lib/notifications.ts notifyUser` → push da gönderir | `lib/notifications.ts` | ✅ MOD |
| 6 | ODK access grant/revoke/restore audit'li | `app/panel/admin/odk/erisim/_actions.ts` | ✅ MOD |
| 7 | ODK sipariş paid/cancel/refund audit'li | `app/panel/admin/odk/siparisler/_actions.ts` | ✅ MOD |

**Verify:**
- `npx tsc --noEmit` → 0 hata
- `/api/health` lokal → DB ping + boot info + Vercel SHA döner
- Audit logs `/panel/admin/audit` sayfasında görünecek
- Push `lib/notifications.ts`'i çağıran tek site (`odk/siparisler manual order`) artık mobile push gönderiyor

**Önceden zaten vardı (yanlış varsayım yapmamak için):**
- `lib/push.ts` (Expo Push, token cleanup, prefs filter)
- `lib/realtime.ts notifyUser` (Notification + Pusher + push — ana akış)
- `AuditLog` modeli + `/panel/admin/audit` viewer
- `lib/rate-limit.ts` (DB-backed, sliding window)
- Cron routes (lesson-reminders, assignment-reminders)
- `MobileDevice`, `NotificationPreference` modelleri
- Mobil app (Expo)
- Tüm CRUD + finance + analytics (FAZ 1-8)

---

## Master Prompt → Realist Faz Planı

Kullanıcının istediği 11 faz (A–K). Tek oturumda hepsi yapılamaz — boyutları:

| Faz | Başlık | Tahmini efor (dosya/saat) | Risk | Bağımlılık |
|---|---|---|---|---|
| **A** | Push notification infrastructure | ~3 dosya / 2sa | Düşük | — *(çoğu zaten var — Round 1'de tamamlandı)* |
| **B** | Performance & scale | ~15 dosya / 8sa | Orta (cache invalidation) | Redis kararı |
| **C** | Teacher experience polish | ~12 dosya / 6sa | Düşük | — |
| **D** | Parent experience rebuild | ~8 dosya / 5sa | Düşük | — |
| **E** | B2B / multi-tenant prep | ~6 dosya + migration / 4sa | **Yüksek** (mevcut sorgu pattern'lerini etkiler) | Karar: Institution model şimdi mi sonra mı? |
| **F** | Background jobs & system infra | ~10 dosya / 6sa | Orta (Vercel cron limit, dış queue) | Queue runtime kararı |
| **G** | Security / audit / compliance | ~10 dosya / 5sa | Düşük *(audit helper hazır — Round 1)* | — |
| **H** | DevOps / production readiness | ~5 dosya / 3sa | Düşük *(env validation + health hazır — Round 1)* | — |
| **I** | Landing / SEO / conversion | ~20 dosya / 8sa | Düşük | Tasarım kararları |
| **J** | Final UX / UI polish | ~30 dosya / 10sa | Düşük (görsel iterasyon) | — |
| **K** | Final testing & QA | manuel + ~5 e2e dosya / 4sa | Düşük | Tüm üst fazlar |

**Toplam:** ~120 dosya, ~60 saat. Bunu tek mesajda yapmak ürünü kırma riskine girer.

---

## Önerilen Uygulama Sırası (Round 2+)

### Round 2 — Audit log fan-out + production logging (1 oturum)
Round 1'de helper var; bu turda tüm yüksek-riskli action'lara wire:
- Bulk grant CSV (`bulk/_actions.ts`)
- Tüm ODK paket CRUD (`paketler/_actions.ts`)
- Muhasebe CRUD (`muhasebe/_actions.ts`)
- Manuel ödeme oluşturma
- Lesson cancel/delete
- Course delete
- Student delete
- Admin "view-as" başlangıç/bitiş

Ayrıca:
- `console.warn/error` → `log.warn/error` migrasyonu (10-15 kritik dosya)
- Webhook'larda structured logging
- `instrumentation.ts` Sentry init (opsiyonel — DSN varsa)

### Round 3 — Performance pass (FAZ B)
- Redis (Upstash) cache wrapper `lib/cache.ts`
- `getOdkAdminAnalytics(30)` 60s cache
- `getOdAdminAnalytics()` 30s cache
- `getTopRiskyStudents()` 5dk cache + arka planda yenile
- `StudentRiskSnapshot` materialized view (Prisma model) + 15dk cron
- Pagination standardı: `Pagination<T>` type + cursor-based helper
- N+1 audit: `panel-student.ts`, `panel-teacher.ts`, `panel-parent.ts` taraması
- `notification.count where unread` → DenormCounter pattern
- `prisma.$queryRaw` sınırı + EXPLAIN ANALYZE pratiği

### Round 4 — Teacher polish (FAZ C)
- Hızlı yoklama component (single-tap row, classroom view)
- Toplu yoklama (sınıf bazlı, default: present, exception: absent/late)
- Submission grade akışı → next-submission auto-advance
- Teacher inbox sticky filters
- Risk uyarısı widget (student list'te risk badge sıralı)

### Round 5 — Parent rebuild (FAZ D)
- `/panel/veli` yeniden ele alma — basit ama yüksek bilgi yoğunluğu
- Per-child collapsible cards (hâlâ kullanıcı insight'ı tek liste)
- Weekly digest email (`lib/email.ts`'a yeni template)
- Cron: pazartesi 08:00 weekly summary
- Critical alert notification rules (absent ≥3 in week / overdue ≥2)

### Round 6 — B2B foundation (FAZ E)
**ÖNEMLİ:** Bu faz mevcut sistemi etkileyebilecek tek faz. Karar gerekli:
- Option A (önerilen): Nullable `institutionId` ekle, default `null` = "OnlineDershanem" tenant. Tüm query'lere helper.
- Option B (riskli): Tüm tabloları institutionId ile partition et — büyük migration.
- Schema değişiklikleri: `Institution` modeli, kritik tablolara `institutionId String?`
- `lib/tenant.ts` — `getCurrentTenant()` middleware
- Tenant-scoped helper'lar: `tenantPrisma()` proxy düşünülebilir ama riskli

### Round 7 — Background jobs (FAZ F)
- Karar: Vercel Cron (mevcut) yeterli mi yoksa Trigger.dev / Inngest / BullMQ + Upstash Redis?
- `lib/jobs/queue.ts` abstraction
- Jobs: push retry, analytics refresh, insight generation, weekly digest, archive
- Job idempotency keys (DB unique constraint)

### Round 8 — Security finalize (FAZ G round 2)
- All mutations → audit log (Round 2'nin devamı)
- Rate limit middleware genişletme: login, password reset, signup, api keys
- Brute-force lock (5 fail → 15dk cooldown — tablo: `LoginAttempt`)
- KVKK: `/panel/ayarlar/veri-export` (kişisel veri JSON dump)
- KVKK: `/panel/ayarlar/hesap-sil` request akışı (24sa soft → admin onay → hard delete)
- CSRF: server action'lar default safe ama hassas POST'lara token

### Round 9 — DevOps polish (FAZ H round 2)
- Sentry SDK + DSN env (Round 2'den taşıma)
- `vercel.json` cron + region pinning audit
- DB backup runbook doc (Neon/Supabase otomatik snapshot)
- Restore procedure dokümantasyonu
- Staging env ayrımı (Vercel preview deployment'ı staging gibi davransın)

### Round 10 — Landing / SEO (FAZ I)
- Home, OD landing, ODK landing tasarım iterasyonu
- Pricing page A/B-ready yapı
- Blog: TOC, related articles, category, JSON-LD article schema
- Sitemap dinamik (blog + paketler)
- Open Graph image generator (`opengraph-image.tsx` per route)

### Round 11 — UX polish (FAZ J)
- Empty state'ler audit (her liste için "henüz yok" CTA'lı)
- Loading skeleton'lar (özellikle dashboard'lar)
- Spacing/typography token check
- Tablet/mobil responsive geçiş
- Animation pass (subtle transitions, no flicker)
- Form UX: inline validation, success toast

### Round 12 — QA & launch checklist (FAZ K)
- E2E happy-path (Playwright): login → öğrenci panel → ödev gönder → öğretmen değerlendirir → veli gördüğünü bildirir
- ODK flow: paket satın al → entitlement → exam başlat → submit → result
- Manuel grant → mobile push görüldü
- Console error grep (sıfır warning hedefi)
- Lighthouse mobile ≥90 hedef
- 404/broken link tarama
- Load test (k6 / artillery) — dashboard concurrent 50 user

---

## Karar Beklenen Konular

Devam etmeden önce kullanıcıdan netleştirilmesi gereken:

1. **Cache runtime:** Upstash Redis mi yoksa Vercel KV mi? (Round 3)
2. **Job queue:** Vercel Cron yeterli mi? (Round 7) — eğer ölçek gerçekleşirse Trigger.dev önerilir
3. **B2B timing:** Institution modelini Round 6'da mı yoksa müşteri talebi geldiğinde mi? (mevcut sistemi şimdi kırmamak için ertelemek mantıklı olabilir)
4. **Sentry:** Free tier kabul mu? DSN sağlanacak mı?
5. **Email provider:** Resend (mevcut env var) ile devam mı? Weekly digest hacmi 100k+ olursa SendGrid'e geçiş düşünülebilir
6. **Round sırası:** Önce performance (B) mi yoksa teacher polish (C) mi? Performance kullanıcı sayısı henüz ~50 ise C/D daha hızlı ROI verir

---

## Round 1 Sonrası Anlık Aksiyonlar (kullanıcı manuel)

1. `.env.production` (veya Vercel env panel) kontrol:
   - `NEXTAUTH_SECRET` ≥32 char
   - `CRON_SECRET` set
   - `DATABASE_URL` connection pool ayarı (`?pgbouncer=true&connection_limit=1` Neon için)
2. Vercel Logs → boot mesajını gör (`[env] Boot validation …`)
3. `https://<domain>/api/health` → 200 + `{ status: "ok", db: { ok: true, latencyMs: <100 } }`
4. Uptime monitor (BetterStack vs.) → `/api/health` 1dk interval

---

## "STOP" — Round 1 burada bitiyor

Round 2'ye geçmek için: **"Round 2 başla"** veya hedeflenmiş bir faz adı söylendiğinde devam edilecek. Her round bağımsız PR olmalı.

---

## Tamamlanan Tur — Round 2: Audit fan-out + Auth hardening (önceki commit)

| # | Çıktı | Dosya | Durum |
|---|---|---|---|
| 1 | Login brute-force koruma (5 fail / 15dk lockout) | `lib/login-attempts.ts` | ✅ NEW (62 LOC) |
| 2 | `authorize` rate-limit + structured log + audit | `lib/auth.ts` | ✅ MOD |
| 3 | Course delete/archive audit | `app/panel/admin/dersler/_actions.ts` | ✅ MOD |
| 4 | Accounting CRUD audit (create/update/delete) | `app/panel/admin/muhasebe/_actions.ts` | ✅ MOD |
| 5 | ODK package CRUD audit (create/update/toggle/delete) | `app/panel/admin/odk/paketler/_actions.ts` | ✅ MOD |
| 6 | ODK payment failed/refunded audit | `app/panel/admin/odk/odemeler/_actions.ts` | ✅ MOD |
| 7 | Access tag create/delete audit | `app/panel/admin/odk/erisim/_actions.ts` | ✅ MOD |
| 8 | Bulk grant audit (özet + per-row up to 200) | `app/panel/admin/odk/erisim/bulk/_actions.ts` | ✅ MOD |
| 9 | Webhook structured log + audit (`logAudit` SYSTEM actor) | `app/api/purchases/webhook/route.ts` | ✅ MOD |

**Verify:**
- `npx tsc --noEmit` → 0 hata
- Login flow: 5 hatalı şifre denemesi → 6. deneme reddedilir (15dk lockout). `/panel/admin/audit` → `LOGIN_LOCKOUT` görünür.
- Bir muhasebe kaydı sil → audit log'da `ACCOUNTING_DELETE` actor ile.
- PayTR webhook → log JSON line + `WEBHOOK_PURCHASE_CREATED` audit (SYSTEM actor).

**Round 2 sonrası audit coverage:**
- ✅ ODK siparişler (paid/cancel/refund) — Round 1
- ✅ Access grant/revoke/restore — Round 1
- ✅ ODK paket CRUD — Round 2
- ✅ ODK payment status — Round 2
- ✅ Access tag CRUD — Round 2
- ✅ Bulk grant — Round 2
- ✅ Muhasebe CRUD — Round 2
- ✅ Course archive/delete — Round 2
- ✅ Login success/failure/lockout — Round 2
- ✅ Webhook events — Round 2
- ⏳ Lesson cancel/delete — Round 8'e kaldı
- ⏳ Student delete + admin view-as — Round 8'e kaldı

**Önemli not — brute-force:**
- Şu anki implementasyon **e-mail bazlı**, IP bazlı değil (NextAuth `authorize` callback'i IP'ye erişim vermiyor).
- IP-bazlı koruma için custom `/api/auth/login` route + middleware gerekir (Round 8).
- Mevcut çözüm: hedefli account takedown saldırılarını engeller, distributed credential stuffing'i değil.

## "STOP" — Round 2 burada bitiyor

Round 3 (Performance pass) için: **"Round 3 başla"** veya **"Performance"** komutu.

---

## Tamamlanan Tur — Round 3: Cache layer + Pagination standardı (önceki commit)

| # | Çıktı | Dosya | Durum |
|---|---|---|---|
| 1 | İki-katmanlı cache (Upstash REST + in-memory fallback) | `lib/cache.ts` | ✅ NEW |
| 2 | Pagination tipi + helper (`parsePagination`, `paginateFindMany`, `Page<T>`) | `lib/pagination.ts` | ✅ NEW |
| 3 | `getOdkAdminAnalytics` 60s cache | `lib/analytics/odk-admin.ts` | ✅ MOD |
| 4 | `getOdAdminAnalytics` 30s cache | `lib/analytics/od-admin.ts` | ✅ MOD |
| 5 | `getTopRiskyStudents` 5dk cache | `lib/analytics/risk.ts` | ✅ MOD |
| 6 | Env validation'a Upstash key'leri (opsiyonel) | `lib/env.ts` | ✅ MOD |
| 7 | `/api/health` response'una `cache.backend` alanı | `app/api/health/route.ts` | ✅ MOD |

**Cache mimarisi:**
- L0: `CACHE_DISABLED=1` → tamamen bypass (dev debug için)
- L1: in-memory `Map` (max 500 entry, FIFO eviction, TTL ≤60s)
- L2: Upstash Redis (REST API, fetch-based, npm dep'siz)
- Upstash yoksa L1 tek başına çalışır — single-instance ortamda yeterli, multi-region prod için Upstash önerilir
- Hata durumunda her zaman compute path'e düşer (cache fail-open)
- API: `cacheGet`, `cacheSet`, `cacheWrap(key, ttlSec, fn)`, `cacheInvalidate(key)`, `cacheInvalidatePrefix(prefix)` (sadece L1), `cacheStatus()`

**Verify:**
- `npx tsc --noEmit` → 0 hata
- `/api/health` → `cache: { backend: "memory" | "upstash" | "disabled", memSize: N }`
- `/panel/admin` ikinci yüklemede analytics çağrıları cache'den döner (DB hit yok — log'da görülebilir)
- Cache invalidation manuel: `cacheInvalidate("analytics:odk:30")` (henüz yazma path'lerinde çağrılmıyor — TTL bazlı stale OK)

**Bu turda KAPSAM DIŞI bırakılanlar (bilinçli olarak — kendi turlarını hak ediyorlar):**
- ⏳ `StudentRiskSnapshot` materialized model + 15dk cron backfill → **Round 7** (queue/cron turu)
- ⏳ Pagination helper'ı mevcut liste sayfalarına wire etme (her sayfa 2-3 satır touch ama 15+ sayfa) → **Round 4-6** içinde, ilgili modül elden geçirildiğinde
- ⏳ N+1 audit (`panel-student.ts`, `panel-teacher.ts`, `panel-parent.ts`) → ilgili rebuild turlarında (R4 teacher / R5 parent)
- ⏳ Notification unread DenormCounter → **Round 7**

**Önemli not — cache invalidation:**
- Şu an pure TTL bazlı (60s / 30s / 5dk). Yeni `OdkExam` oluşturma → 60sn'ye kadar dashboard stale.
- Bu trade-off bilinçli: cache invalidation logic'i karmaşık (her admin mutation'a `cacheInvalidate` çağrısı eklemek = 20+ touch).
- Trade-off ters dönerse (admin dashboard "veri eski" şikayeti) Round 8'de yazma path'lerine targeted invalidation eklenebilir.

**Operasyonel: Upstash'i prod'a açmak için**
1. https://console.upstash.com → Redis database (free tier 10k req/gün yeterli)
2. Vercel env: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
3. Redeploy → `/api/health` `cache.backend === "upstash"` görünür
4. Geri almak için env sil → otomatik in-memory fallback

## "STOP" — Round 3 burada bitiyor

Round 4 (Teacher experience polish) için: **"Round 4 başla"** veya **"Teacher polish"** komutu.

---

## Tamamlanan Tur — Round 4: Teacher experience polish (önceki commit)

| # | Çıktı | Dosya | Durum |
|---|---|---|---|
| 1 | Teacher utility layer (risk map + next pending submission) | `lib/teacher-utils.ts` | ✅ NEW |
| 2 | Tek-tap toplu yoklama component (pill buttons + preset bar + live stats) | `components/panel/teacher/quick-attendance-form.tsx` | ✅ NEW |
| 3 | Yoklama sayfası refactor — risk badge + yüksek riskli sıralama | `app/panel/ogretmen/yoklama/yeni/page.tsx` | ✅ MOD |
| 4 | Submission grade auto-advance ("Kaydet & Sıradaki") | `app/panel/ogretmen/_actions.ts` + `odevler/[id]/page.tsx` | ✅ MOD |
| 5 | Öğrencilerim risk badge sütunu + yüksek riskliye göre sıralama | `app/panel/ogretmen/ogrencilerim/page.tsx` | ✅ MOD |

**UX kazanımları:**
- **Yoklama:** 30 öğrencilik sınıf için tıklama sayısı **30 select × 4 click ≈ 120 → ~5 click** ("Tümünü mevcut" + 3-5 istisna). Yüksek riskli öğrenci listenin üstünde, badge ile görünür → öğretmen "kim sürekli yok" görür.
- **Ödev puanlama:** "Kaydet" → otomatik sıradaki SUBMITTED gönderime gider. 20 gönderimlik ödev için: liste'ye dön → bir sonraki kart bul → tıkla pattern'i ortadan kalkar.
- **Öğrencilerim listesi:** Risk skoru sütunu + risk desc sıralama → en kritik öğrenci en üstte.

**Risk hesaplama:**
- `getTeacherStudentRisks(teacherId, studentIds)` — Round 3 cache layer ile 5dk TTL, key: `teacher:risk:<teacherId>:<hash>`.
- Sinyaller: 30g devamsızlık oranı (15%/30% eşik) + geciken ödev sayısı (2/5 eşik).
- Skor 0-100, level: low/medium/high (40/70 cutoff).
- Lightweight (full `computeStudentRisk`'in deneme/başarı sinyallerini içermez) — teacher view'da hız > detay.

**Verify:**
- `npx tsc --noEmit` → 0 hata
- `/panel/ogretmen/yoklama/yeni?classroomId=...` → pill buttons + "Tümünü mevcut" çalışır
- `/panel/ogretmen/ogrencilerim` → risk badge sütunu görünür, yüksek riskli üstte
- Ödev gönderim puanla → otomatik sıradakine navigate (URL'de `?focus=<id>` ile)
- Cache hit: aynı öğretmen 5dk içinde yeniden yüklerse risk hesabı DB'ye gitmez

**Bu turda KAPSAM DIŞI bırakılanlar:**
- ⏳ Inbox sticky filters → küçük diff, ihtiyaç doğarsa Round 11 polish'te
- ⏳ Auto-advance'da focus scroll (URL `?focus=` parametresini sayfada görsel highlight) → Round 11 UX polish
- ⏳ Bulk action: "Sınıfa toplu ödev gönder" → Round 4'ün dışında, kendi tasarım kararı gerekiyor

**Bilinçli karar notu:**
- Quick attendance client component'i mevcut server action (`recordClassroomAttendanceAction`) ile **bozulmadan** entegre edildi — hidden inputs ile `status_<studentId>` formatını koruyor.
- Eski "select"li yoklama UX'ini geri istersek tek satır revert yeterli.

## "STOP" — Round 4 burada bitiyor

Round 5 (Parent experience rebuild) için: **"Round 5 başla"** veya **"Parent rebuild"** komutu.

---

## Tamamlanan Tur — Round 5: Parent experience rebuild (önceki commit)

| # | Çıktı | Dosya | Durum |
|---|---|---|---|
| 1 | Parent insight aggregator + alert kuralları | `lib/parent-summary.ts` | ✅ NEW |
| 2 | Haftalık digest e-posta şablonu | `lib/email.ts` (`sendParentWeeklyDigestEmail`) | ✅ MOD |
| 3 | Pazartesi 08:00 (TRT) cron route | `app/api/cron/parent-weekly-digest/route.ts` | ✅ NEW |
| 4 | Vercel cron kaydı `0 5 * * 1` | `vercel.json` | ✅ MOD |
| 5 | Veli dashboard rebuild — per-child cards + critical alerts | `app/panel/veli/page.tsx` | ✅ MOD |

**Alert kuralları (`ParentAlert`):**
| Severity | Tetikleyici |
|---|---|
| 🚨 critical | Son 7 günde devamsızlık ≥3 |
| 🚨 critical | Geciken ödev ≥2 |
| ⚠ warning | Son 7 günde devamsızlık 2 |
| ⚠ warning | Geciken ödev 1 |
| ℹ info | Bekleyen ödev ≥3 (vade henüz dolmamış) |
| ℹ info | Son 30 günde hiç ODK denemesi yok (ODK erişimli ise) |

**Haftalık digest akışı:**
1. Vercel Cron `0 5 * * 1 UTC` → `GET /api/cron/parent-weekly-digest`
2. `Bearer ${CRON_SECRET}` kontrolü
3. `Parent.email != null AND students > 0 AND user != null` filtrelenir
4. Her veli için `getParentChildSummaries(parentId)` çağırılır
5. `sendParentWeeklyDigestEmail` → kart-benzeri HTML, kritik uyarılar üstte kırmızı blok
6. **Kritik alert** varsa ayrıca in-app + push notification (`notifyUser` PERFORMANCE)
7. Tüm send'ler `EmailOutbox`'a yazılır (Round 1'in retry mekanizması kapsar)
8. Sonuç JSON log: `{ parents, sent, skipped, critical, failed, durationMs }`

**Dashboard değişimi:**
- ÖNCE: 4 toplam KPI + basit per-child kart (telefon/şehir) + alttaki InsightList
- SONRA: Kritik uyarı kutusu üstte → 4 KPI → per-child rich card (7g devam %, bekleyen, geciken, bu hafta ders, son ödev puanı, son ODK net) + her child için alert listesi + detay link
- Eski analytics insight'lar kaldırıldı — yeni mimaride her metrik kendi context'inde gösteriliyor, ikinci kez "akıllı özet" göstermek tekrara düşüyordu

**Verify:**
- `npx tsc --noEmit` → 0 hata
- `/panel/veli` → 1 çocuklu test velisinde 6 metrik (varsa son ödev + ODK), alert kuralları tetiklenirse kırmızı/sarı şerit
- Manuel cron test: `curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/parent-weekly-digest`
- EmailOutbox tablosunda yeni satırlar görünür; Resend dashboard'da `Haftalık özet — N çocuk` subject

**Cron mimarisi:**
- Vercel Cron UTC: `0 5 * * 1` = Pazartesi 05:00 UTC = **08:00 TRT** (yaz/kış DST'siz, tutarlı)
- maxDuration: 300s (5dk) — 1000 veli için yeterli (~150ms/parent + email send)
- 1000+ veli ölçeğinde: queue (Round 7) — şu an basit foreach yeterli

**Bu turda KAPSAM DIŞI bırakılanlar:**
- ⏳ Veli child detail (`/panel/veli/cocuklarim/[id]`) sayfası rebuild → mevcut sayfa çalışıyor, dashboard rebuild'i yeterli ROI
- ⏳ Veli kendi bildirim tercihleri kontrolü (`weeklyDigest: false`) → Round 8 KVKK/preferences turu
- ⏳ Critical alert eşiklerinin admin tarafından konfigüre edilebilmesi → over-engineering, sabit değerler MVP için OK

## "STOP" — Round 5 burada bitiyor

Round 6 (B2B foundation) için: **"Round 6 başla"** veya **"B2B"** komutu.
**⚠ Uyarı:** Round 6 schema migration içerir (`Institution` model, nullable `institutionId`). Mevcut sistemi etkileyebilir. Karar gerekli: şimdi mi yoksa ilk B2B müşteri talebiyle mi? Eğer ertelemek istersen → **"Round 7 başla"** (Background jobs / queues) ile devam.

---

## Karar — Round 6 ertelendi

User "Devam" → varsayılan: **B2B foundation skipped** (premature optimization gerekçesi: ilk B2B müşteri talebi gelmeden Institution modeli tahmin üzerine inşa olur). Round 7'ye geçildi.

---

## Tamamlanan Tur — Round 7: Background jobs & cron infra (bu commit)

| # | Çıktı | Dosya | Durum |
|---|---|---|---|
| 1 | Cron job runner abstraction (auth + log + dur tracking) | `lib/jobs/runner.ts` | ✅ NEW |
| 2 | Email retry cron (önceden vercel.json'da yok'tu) | `app/api/cron/email-retry/route.ts` | ✅ NEW |
| 3 | Notification daily digest cron (önceden yok) | `app/api/cron/notification-digest/route.ts` | ✅ NEW |
| 4 | Audit retention cron (önceden yok) | `app/api/cron/audit-retention/route.ts` | ✅ NEW |
| 5 | Rate-limit prune cron (R2 brute force tablo cleanup) | `app/api/cron/rate-limit-prune/route.ts` | ✅ NEW |
| 6 | Vercel cron kaydı `0 4 * * *` | `vercel.json` | ✅ MOD |

**🔥 Düzeltilen kritik açık:**
`vercel.json` zaten 3 cron path'i listeliyordu (`email-retry`, `notification-digest`, `audit-retention`) ama **route handler'ları yoktu** — yani her Vercel cron tetiklemesi **404 dönüyordu**. Production'da bu sessiz fail:
- EmailOutbox FAILED kayıtları hiç retry edilmiyordu → kalıcı `EmailOutbox.status = FAILED` birikiyordu
- Daily notification digest hiç gönderilmiyordu
- AuditLog sınırsız büyüyordu (DB disk pressure riski)

Round 7'de hepsi implement edildi + Round 2'nin brute force tablosu için ek cleanup eklendi.

**`runJob(name, req, handler)` API:**
- `Bearer ${CRON_SECRET}` auth + Vercel `vercel-cron` UA fallback (header yoksa)
- `log.info("cron.start", { job })` → `log.info("cron.done", { job, durationMs, ...result })`
- Exception → default `200 + { ok: false }` (Vercel cron yeniden tetiklemez, monitor log'dan algılar). `errorAsHttp500: true` opt-in.
- Standart JSON response: `{ ok, job, durationMs, ...handlerResult }`

**Cron coverage matrix (sonuç):**
| Path | Schedule (UTC) | Handler | Durum |
|---|---|---|---|
| `/api/cron/lesson-reminders` | `*/5 * * * *` | ✅ var | Round 0 |
| `/api/cron/assignment-reminders` | `0 9 * * *` | ✅ var | Round 0 |
| `/api/cron/parent-weekly-digest` | `0 5 * * 1` | ✅ var | Round 5 |
| `/api/cron/email-retry` | `*/15 * * * *` | ✅ R7 | **Round 7 fix** |
| `/api/cron/notification-digest` | `0 8 * * *` | ✅ R7 | **Round 7 fix** |
| `/api/cron/audit-retention` | `0 3 * * *` | ✅ R7 | **Round 7 fix** |
| `/api/cron/rate-limit-prune` | `0 4 * * *` | ✅ R7 | **Round 7 NEW** |

**Audit retention politikası:**
- 365g'den eski AuditLog satırları silinir
- **PROTECTED actions** (LOGIN_LOCKOUT, PAYMENT_*, ACCESS_REVOKE, BULK_GRANT_APPLIED, ODK_PACKAGE_DELETE, COURSE_DELETE) silinmez — KVKK/regülatif denetim için süresiz tutulur (Round 8'de archive-to-cold-storage eklenebilir)

**Schema migration: YOK.** Round 7 fully migration-free. `JobRun` modeli **bilinçli olarak eklenmedi** — Vercel logs + structured logger output yeterli; ihtiyaç doğarsa Round 8'de eklenebilir.

**Verify:**
- `npx tsc --noEmit` → 0 hata
- Manuel test: `curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/email-retry` → `{ ok, job: "email-retry", durationMs, candidates, sent, failed, abandoned }`
- Auth fail: `curl .../api/cron/email-retry` (no auth, no Vercel UA) → `{ error: "Unauthorized" }` + `cron.unauthorized` warn log
- Vercel deploy sonrası ilk 24sa içinde tüm crons'un structured log'unu Vercel Logs panelinde görürsün

**Bu turda KAPSAM DIŞI bırakılanlar:**
- ⏳ `JobRun` Prisma modeli (idempotency key + history) → ihtiyaç doğarsa Round 9
- ⏳ Trigger.dev / Inngest entegrasyonu → Vercel Cron yeterli (ölçek geldiğinde)
- ⏳ Job retry policy (cron handler içi) → her cron kendi semantiği (email-retry zaten retry handler)
- ⏳ `pruneOldFailedAttempts` fonksiyonunun rate-limit-prune'a inline edilmesi → şu an direct `prisma.rateLimitEntry.deleteMany` kullandık, R2'deki helper kullanılmadı (duplikasyon kabul edilebilir, semantik açık)

## "STOP" — Round 7 burada bitiyor

Round 8 (Security finalize) için: **"Round 8 başla"** veya **"Security"** komutu.
**Round 8 kapsamı:** Lesson cancel/delete audit, student delete audit, admin "view-as" audit, **IP-based brute force** (Round 2'nin email-only mekanizmasını süpresede eden custom `/api/auth/login` + middleware), KVKK data export/delete request flows, hassas POST'lara CSRF token.

---

## Tamamlanan Tur — Round A.1 (R-A.1): Critical Infrastructure Fix (2026-05-18)

> Master audit'ten (R-A) çıkan kritik altyapı düzeltmeleri.

| # | Çıktı | Dosya | Durum |
|---|---|---|---|
| 1 | Build script `prisma db push` → `prisma migrate deploy` | `package.json` | ✅ MOD |
| 2 | `build:nomigrate` escape hatch (deploy fail durumunda) | `package.json` | ✅ NEW |
| 3 | Middleware admin API guard (`/api/v1/admin/*`, `/api/admin/*`, `/api/v1/odk/admin/*`) — ADMIN değilse 403 JSON | `middleware.ts` | ✅ MOD |
| 4 | Middleware matcher genişletildi (panel + admin API) | `middleware.ts` | ✅ MOD |

**Önceki audit'in keşfettiği gerçekler (planlama sırasında):**
- ✅ `AccountingEntry.service` kolonu **zaten var** (migration `0020_accounting_service`)
- ✅ ODK finance helper `service: "ODK"` yazıyor
- ✅ Muhasebe manuel entry action `service` form alanı kullanıyor
- ❌ OD `/api/purchases/webhook` AccountingEntry yazmıyor (yorum: "paneller sökülürken kaldırıldı") → R-E'de düzeltilecek

**Bilinçli kapsam dışı:**
- ⏳ B-04 `Lesson.studentId` nullable → 13+ kod path'i etkilenir (yoklama, mobil API, parent-summary, lesson-reminders cron). Kendi round'una alındı (R-A.X).
- ⏳ B-08 Pagination wire (20+ sayfa hardcoded `take: 100/200/500/1000/2000/5000`) → R-I (Performance pass).

**Verify:**
- `npx tsc --noEmit` → 0 hata
- ADMIN olmayan kullanıcı `/api/v1/admin/*`'a istek atarsa middleware'de `{ error: { code: "FORBIDDEN" } }` 403 dönüyor; handler-level `requireAdminApi` ikinci katman olarak devam ediyor.

---

## Tamamlanan Tur — Round 8 / R-B: Security Finalize (2026-05-18)

> Round 7'nin sonunda planlanan Round 8'in alt kümesi. Planda olan ama
> **zaten yapılmış** olan işler atlandı.

| # | Çıktı | Dosya | Durum |
|---|---|---|---|
| 1 | Content Security Policy (pragmatic baseline + PayTR/Meet/PDF iframe whitelisting) | `next.config.ts` | ✅ MOD |
| 2 | HSTS `max-age=63072000` + `preload` (1 yıl → 2 yıl) | `next.config.ts` | ✅ MOD |
| 3 | COOP `same-origin-allow-popups` (Spectre koruması) | `next.config.ts` | ✅ MOD |
| 4 | `Permissions-Policy: interest-cohort=()` (FLoC opt-out) | `next.config.ts` | ✅ MOD |
| 5 | Logger PII masking (email/phone/token/secret otomatik mask) — `LOG_PII_MASK=0` ile kapatılabilir | `lib/logger.ts` | ✅ MOD |
| 6 | KVKK Privacy Rights kartı (veri indir + hesap silme talebi `mailto:` + KVKK linki) | `components/panel/privacy/privacy-rights-card.tsx` | ✅ NEW |
| 7 | Kart 4 panele monte edildi (öğrenci/öğretmen/veli profilim + admin ayarlar) | 4 sayfa | ✅ MOD |

**Round 8 kapsamında zaten YAPILMIŞ olduğu için atlanan işler:**
- ✅ Lesson cancel audit — `LESSON_CANCEL` `app/panel/admin/ders-programi/_actions.ts` (Round 4-5 civarı)
- ✅ Lesson hard delete audit — `LESSON_HARD_DELETE`
- ✅ Student delete audit — `STUDENT_DELETE` + `kvkkHardDelete: true` payload
- ✅ KVKK data export endpoint — `/api/v1/me/data-export` (5/gün rate-limit, audit, JSON download)

**Bilinçli kapsam dışı (sonraki round):**
- ⏳ IP-bazlı brute force koruma — Custom `/api/auth/login` route + IP middleware gerekir (NextAuth `authorize` callback'i IP'ye erişim vermiyor). Round 2'nin email-only mekanizması yetersiz.
- ⏳ Account deletion request akışı (24h soft → admin onay → hard delete) — `AccountDeletionRequest` modeli + admin onay UI + cron hard-delete. Şu an kullanıcı `mailto:` ile destek e-postasına yönlendiriliyor.
- ⏳ CSRF token — Next.js 15 server actions origin check zaten yapıyor; ek token sadece dış POST'larda gerekli.
- ⏳ "View-as" audit — view-as feature mevcut değil; gelirse audit eklenir.

**CSP test notu:**
- PayTR iframe, Google Meet iframe, ODK solver PDF iframe whitelist'te
- Inline script/style kullanan eski component varsa (özellikle 3rd party widget) CSP raporlama modu (`Content-Security-Policy-Report-Only`) ile önce test edilebilir
- Strict CSP (nonce-based) Round 11 UX polish'ten önce kurulabilir

**Verify:**
- `npx tsc --noEmit` → 0 hata
- `curl -I https://<domain>/` → `Content-Security-Policy`, `Strict-Transport-Security: max-age=63072000…`, `Cross-Origin-Opener-Policy` header'ları görünür
- `/panel/ogrenci/profilim` → en altta "Gizlilik ve veri haklarınız" kartı, "Verilerimi indir (JSON)" butonu çalışıyor → JSON dosyası iniyor
- Test: log'a `log.info("test", { email: "ali@x.com", phone: "+905551234567" })` yaz → çıktıda `email: "a**@x.com"`, `phone: "+9055****4567"` görünür

## "STOP" — R-B (Round 8 subset) burada bitiyor

Sonraki: **R-C — ODK ödeme entegrasyonu (PayTR webhook → OdkPayment + OdkOrder + OdkEntitlement)** veya master backlog'tan farklı bir round seçilebilir.


---

# R-C — ODK PayTR Ödeme Entegrasyonu (TAMAMLANDI ✓)

ODK paket satın alma akışı PayTR iFrame API ile uçtan-uca bağlandı. `markOdkOrderPaid()` zaten idempotent olduğundan callback bu fonksiyona delege eder — entitlement + access tag + accounting tek bir kaynaktan yönetilir.

## Akış

1. Kullanıcı `/odk-paketleri/<slug>/satin-al` sayfasına gider.
2. Sunucu `createOdkCheckoutSession()` çağırır: `OdkOrder` (PENDING) + `OdkPayment` (provider=PAYTR, providerRef=merchant_oid) oluşturur ya da son 30 dakikadaki PENDING siparişi yeniden kullanır (idempotent).
3. PayTR `get-token` endpoint'i HMAC-SHA256 hash ile çağrılır → token alınır.
4. Sayfa PayTR iframe'ini (`https://www.paytr.com/odeme/guvenli/<token>`) gömer.
5. Banka onayı sonrası PayTR `POST /api/odk/paytr/callback` endpoint'imizi çağırır:
   - Hash doğrulanır (`crypto.timingSafeEqual`)
   - `status=success` → ödeme `SUCCEEDED` + `markOdkOrderPaid()` → Order PAID + Entitlement + AccessTag + AccountingEntry (service=ODK)
   - `status=failed` → ödeme `FAILED` + failure_reason
   - Her durumda plain `"OK"` döner (PayTR retry'larını önler); kötü hash'te 400.
6. Kullanıcı `?status=success|failed` ile `sonuc/page.tsx` sayfasına yönlenir (gerçek onay webhook'tan gelir).

## Değişiklikler

| Dosya | Tip | Not |
|---|---|---|
| `prisma/schema.prisma` | MOD | `OdkPaymentProvider` enum'una `PAYTR` eklendi |
| `prisma/migrations/0022_odk_paytr_provider/migration.sql` | NEW | `ALTER TYPE … ADD VALUE IF NOT EXISTS 'PAYTR'` |
| `lib/odk/paytr.ts` | NEW | `createPaytrIframeToken`, `verifyPaytrCallbackHash`, `buildMerchantOid`, `getClientIp`, `isPaytrConfigured` |
| `lib/odk/checkout.ts` | NEW | `createOdkCheckoutSession` (idempotent PENDING reuse, OdkOrder + OdkPayment yazımı) |
| `app/api/odk/paytr/callback/route.ts` | NEW | Webhook: hash verify → markOdkOrderPaid; tüm sonuçlar audit log'a yazılır |
| `app/odk-paketleri/[slug]/satin-al/page.tsx` | REWRITE | "Yakında" yerine PayTR iframe; ödeme yapılandırılmadıysa açıklayıcı mesaj |
| `app/odk-paketleri/[slug]/satin-al/sonuc/page.tsx` | NEW | Başarılı/başarısız ödeme dönüş sayfası |

## Güvenlik Notları

- Callback **kimlik doğrulaması yok** — güvenlik tamamen HMAC hash karşılaştırması ile sağlanır.
- Hash karşılaştırması `timingSafeEqual` ile yapılır (timing attack koruması).
- Idempotency iki katmanlı: (1) checkout'ta 30dk PENDING penceresi, (2) callback'te `payment.status === SUCCEEDED && order.status === PAID` early return.
- `merchant_oid` formatı: `ODK<orderId-alphanumeric>` (max 32 char, PayTR sınırı).
- Tüm callback olayları `AuditLog`'a yazılır (`PAYTR_CALLBACK_BAD_HASH`, `PAYTR_PAYMENT_SUCCESS`, `PAYTR_PAYMENT_FAILED`, `PAYTR_PAYMENT_ORPHAN`).

## Operasyonel Adımlar (Production'a Çıkmadan Önce)

1. **`.env` dosyasına ekle:**
   ```
   PAYTR_MERCHANT_ID=683619
   PAYTR_MERCHANT_KEY=k14fnazC23XQhfeC
   PAYTR_MERCHANT_SALT=kWz9m97zyHtqq7mM
   ```

2. **Migration uygula:**
   ```sh
   npx prisma migrate deploy
   ```

3. **PayTR Mağaza Panelinde callback URL'ini kaydet:**
   - URL: `https://onlinedershanem.com/api/odk/paytr/callback`
   - Method: POST

4. **Test (PayTR test modu):** `lib/odk/checkout.ts` içindeki `createPaytrIframeToken` çağrısına `testMode: "1"` parametresi geçici olarak eklenebilir; canlıya geçerken kaldırılmalı.

## Verify

- `npx tsc --noEmit` → 0 hata ✓
- Giriş yapmış kullanıcı `/odk-paketleri/<slug>/satin-al` → PayTR iframe yükleniyor
- Test kartıyla başarılı ödeme → callback → `OdkPayment.status=SUCCEEDED`, `OdkOrder.status=PAID`, `OdkEntitlement` aktif, `OdkUserAccessTag` veriliyor, `AccountingEntry(service="ODK")` yazılıyor
- Aynı `merchant_oid` ile ikinci callback geldiğinde idempotent: hiçbir alan değişmez, "OK" döner
- Bozuk hash ile çağrı → 400 + AuditLog `PAYTR_CALLBACK_BAD_HASH`

## Bilinen Sınırlar / Gelecek Round

- **Refund/Chargeback** akışı henüz yok — manuel olarak `OdkPayment` ve `OdkEntitlement` revoke edilmeli.
- **Taksit** (max_installment) şu an `0` (taksit yok). Banka taksit desteği eklemek isterse `checkout.ts` parametrik hale getirilmeli.
- **Test mode toggle** environment ile kontrol edilmiyor; `PAYTR_TEST_MODE=1` env eklenebilir.
- **Email bildirimi** (ödeme başarılı/başarısız) henüz yok — `lib/notifications.ts` ile bağlanabilir.

## "STOP" — R-C burada bitiyor

Sonraki önerilen: **R-D — ODK öğrenci erişim UI'ı** (panel/ogrenci/odk altında aktif paket/kalan gün/erişim listesi) veya **R-E — OD ödeme entegrasyonu** (aynı PayTR altyapısını OD paketler için yeniden kullan).
