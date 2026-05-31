# Production Deploy Checklist — Phase 2 (2026-05-30)

> Verbatim, paranoid checklist for deploying `onlinedershanem` to Vercel
> after a Phase 2 session. Tick every box _before_ promoting a build to
> production. If anything fails, **STOP** and roll back rather than guess.

Last updated: Session 13 (2026-05-30).

---

## 0 · Pre-flight

- [ ] You are on `main`, working tree clean.
      `git status` shows nothing.
- [ ] You have pulled latest: `git pull origin main`.
- [ ] No open merge conflicts and no `WIP:` commits.

---

## 1 · Local checks (must all pass before push)

Run from the repo root with `node` ≥ 20:

```bash
# 1.1 — Prisma client up to date
npx prisma generate

# 1.2 — Strict TypeScript (no emit, source of truth)
rm -f tsconfig.tsbuildinfo && npm run typecheck

# 1.3 — ESLint
npm run lint

# 1.4 — Webpack/Next compilation (skips DB migrate)
DATABASE_URL="postgresql://u:p@127.0.0.1:5432/dummy?schema=public" \
DIRECT_URL="postgresql://u:p@127.0.0.1:5432/dummy?schema=public" \
NEXTAUTH_SECRET="dummy-secret-for-build-only-32chars-min" \
NEXTAUTH_URL="http://localhost:3000" \
npm run build:nomigrate
```

Acceptance:

- [ ] `typecheck` exits 0.
- [ ] `lint` shows ≤ the 3 known pre-existing warnings
      (`entity-search-combobox.tsx`, `smart-table.tsx`, `toast.tsx`).
      Any **new** warning blocks the deploy.
- [ ] `next build` reports **`✓ Compiled successfully`**.
      Static prerender failures with the dummy DB on routes such as
      `/deneme-kulubu`, `/odk-paketleri` are expected and acceptable —
      Vercel will hit a real DB at build time.

> ⚠️ **Hard rule (Session 13):** A `"use client"` component must NEVER
> transitively import a module that has `import "server-only"` or that
> imports `node:crypto`. TypeScript does NOT catch this — only
> `next build` does. Display helpers + row types live in `*-display.ts`
> siblings; server modules re-export them only for server callers.
> If a new client/server boundary is introduced, repeat this checklist.

---

## 2 · Required environment variables (Vercel → Project → Settings)

All variables are validated on cold start by `lib/env.ts` →
`validateEnvOnce()` (called from `instrumentation.ts`). A missing
required value crashes the process before serving traffic — that is
intentional. The list below MUST be present in the **Production**
environment in Vercel:

### 2.1 — Core

| Variable | Required? | Notes |
| -------- | --------- | ----- |
| `DATABASE_URL` | yes | Pooled URL (port 6543) for runtime |
| `DIRECT_URL` | yes | Direct URL (port 5432) for migrations |
| `NEXTAUTH_SECRET` | yes | ≥ 32 chars, generated with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | yes | Canonical site URL, no trailing slash |
| `NEXT_PUBLIC_APP_URL` | recommended | Used by `buildParentInviteUrl`; falls back to relative if missing |

### 2.2 — Payment (PayTR)

| Variable | Required? | Notes |
| -------- | --------- | ----- |
| `PAYTR_MERCHANT_ID` | yes for live | |
| `PAYTR_MERCHANT_KEY` | yes for live | |
| `PAYTR_MERCHANT_SALT` | yes for live | |

### 2.3 — Realtime (Pusher)

| Variable | Required? | Notes |
| -------- | --------- | ----- |
| `PUSHER_APP_ID` | yes for realtime | |
| `PUSHER_KEY` | yes for realtime | |
| `PUSHER_SECRET` | yes for realtime | |
| `PUSHER_CLUSTER` | yes for realtime | |
| `NEXT_PUBLIC_PUSHER_KEY` | yes for realtime | client-visible |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | yes for realtime | client-visible |

### 2.4 — Mail (Resend)

| Variable | Required? | Notes |
| -------- | --------- | ----- |
| `RESEND_API_KEY` | yes for outgoing mail | |
| `RESEND_FROM_EMAIL` | yes for outgoing mail | verified sender |

### 2.5 — Cron + Mobile + Rate-limit (optional / per-env)

| Variable | Required? | Notes |
| -------- | --------- | ----- |
| `CRON_SECRET` | yes if cron jobs enabled | Vercel cron uses this |
| `EXPO_PUSH_ACCESS_TOKEN` | optional | mobile push notifications |
| `MOBILE_JWT_SECRET` | yes for mobile API | ≥ 32 chars |
| `UPSTASH_REDIS_REST_URL` | optional | rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | optional | rate limiting |

> The full enumerated list with format checks is in `lib/env.ts`. To add
> a new required variable, edit BOTH `lib/env.ts` AND `.env.example`.

- [ ] All variables present in Vercel Production.
- [ ] No production-only secrets accidentally committed
      (`git grep -E "PUSHER_SECRET|MERCHANT_KEY|RESEND_API_KEY" -- ':!.env.example' ':!docs'`).

---

## 3 · Database migration order

The build pipeline on Vercel runs `npm run build` which equals:

```
prisma generate && prisma migrate deploy && next build
```

`prisma migrate deploy` will apply any new migrations against
`DIRECT_URL` (Postgres direct port 5432). All migrations 0029 → 0035
shipped during Phase 2 / Sessions 6–12 are **purely additive** (new
tables, new columns with defaults, new enums). There are no destructive
operations and no column renames. Rolling back a release does NOT
require a schema rollback.

- [ ] DB is reachable from Vercel build env (test via Vercel
      "Connect to Storage").
- [ ] `prisma migrate status` from a shell with prod creds shows no
      drift before deploy.

---

## 4 · Cron & background jobs

`vercel.json` registers 9 cron endpoints. After deploy:

- [ ] Vercel Dashboard → Cron Jobs → all 9 jobs marked _Active_, no
      "last run failed" alert.
- [ ] `CRON_SECRET` matches the value in `app/api/cron/*/route.ts`
      authentication checks.

---

## 5 · Smoke tests (manual, post-deploy)

See `docs/manual-smoke-checklist.md`. Do **not** consider a deploy
"done" until at least the *Critical Path* section in that document
passes against production.

---

## 6 · Rollback procedure

1. Vercel → Project → Deployments → previous green deploy → **Promote
   to Production**.
2. No DB rollback required (migrations 0029–0035 are additive).
3. Post a one-line note in `#deploys` Slack with the timestamp and the
   commit SHA you rolled back to.

---

## 7 · Known limitations (acknowledge before deploy)

- **No row-level security in Postgres.** Authorization is enforced at
  the application layer (`requirePanelRole`, `lib/access/*`,
  ownership checks in server actions). A direct DB connection
  bypasses these. Rotate `DATABASE_URL` if it leaks.
- **CSRF** is currently mitigated by the Next.js Server Actions
  same-origin policy and NextAuth's session cookie. There is no
  separate CSRF token middleware — explicit CSRF tokens would be
  Phase 3.
- **Rate limiting** (Session 17 update) — DB-backed (`RateLimitEntry`
  table) and applied to the highest-risk surfaces: homework submit,
  attendance record (single + bulk), parent excuse create, parent invite
  generation, payment mark-paid/partial/cancel, payroll period
  mark-paid/cancel, ODK admin publish/archive, ODK student submit. Login
  attempts and KVKK data export remain rate-limited from earlier work.
  Mobile JWT issue is throttled when Upstash is configured. Quotas are
  intentionally generous; tighten if abuse is observed. Future: swap the
  DB-backed limiter for Redis under high load.
- **Same-origin guard** — defence-in-depth `Origin`/`Referer` allow-list
  on the same surfaces. Required env: `NEXT_PUBLIC_APP_URL` (or
  `NEXTAUTH_URL`, `APP_URL`). Vercel deployments inherit `VERCEL_URL`
  automatically. If no allowed origin is configured the guard fails open
  and logs a warning — set the env to avoid that warning in prod.
- **Cron prune** — `app/api/cron/rate-limit-prune/route.ts` already
  trims old `RateLimitEntry` rows daily. Confirm the cron is wired in
  Vercel cron / external scheduler.
- **Scheduled reminders** (Session 18) — `/api/cron/scheduled-reminders`
  runs daily (`30 8 * * *` in `vercel.json`) and creates inbox
  notifications for upcoming lessons, due/overdue homework, due/overdue
  payments, pending absence excuses, pending homework reviews and
  payroll periods awaiting attention. Idempotent; safe to re-trigger.
  Required env: `CRON_SECRET` (already shared with the other crons).
  Manual trigger:
  ```bash
  curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
    https://<host>/api/cron/scheduled-reminders
  ```
  No email/SMS/WhatsApp/realtime; inbox + best-effort push only.
- **Static prerender** of `/deneme-kulubu`, `/odk-paketleri` and other
  marketing routes pulls real ODK package data at build time. If the
  DB is unreachable during build, those pages fail to prerender.

---

## 8 · Sign-off

| Role | Name | Date |
| ---- | ---- | ---- |
| Engineer running deploy | | |
| Reviewer (post-smoke) | | |

End.
