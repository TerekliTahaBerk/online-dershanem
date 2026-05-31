# Online Dershanem — Phase 2 Release Notes

> Last updated: 2026-05-31 — Sessions 1 → 19 complete.
> Status: **GO** for production deploy. See §Final Go/No-Go below.

This document is the single short read a deployer needs. For full
technical depth see `docs/phase-1-audit-and-plan-2026-05-30.md`.

---

## 1 · Major capabilities added (Phase 2)

**Panel platform**

- Advanced data-table foundation with saved views, smart filters and
  URL-driven detail drawers across every admin/teacher/parent/student
  surface.
- Role-scoped command palette and global search.
- Unified inbox at `/panel/<role>/inbox` (Session 16) — server actions
  emit notifications via `notifyUser` / `notifyAdmins`.

**Education core**

- Lesson quick-planning with course/classroom/series semantics.
- Attendance v2 (`PRESENT/ABSENT/LATE/EXCUSED/LEFT_EARLY`), bulk
  classroom take, derived auto-attendance.
- Homework board, attachment support, teacher review queue.
- Materials / Library and lesson-material join tables.
- Study Room + StudySession self-tracking.
- Academic Roadmap (StudentAcademicGoal).
- Absence Excuse parent → teacher/admin review workflow.

**Finance**

- Parent finance due tracking (`PaymentScheduleItem`).
- Teacher Payroll Hub (`TeacherCompensationRule` /
  `TeacherPayrollPeriod` / `TeacherPayrollItem`) alongside the legacy
  flat-period model.
- Admin finance reports & cashflow.

**ODK**

- Admin exam builder polish + access tags + booklet/key files +
  publish-gate validation + archive/unarchive.
- Student attempt flow with cheat events, optical answer capture,
  scoring and section breakdowns.
- ODK package marketing pages and PayTR-driven order flow.

**Operational hardening**

- Rate-limit / CSRF / abuse hardening (Session 17): `lib/security/*`
  helpers wired into 10 high-risk surfaces.
- Scheduled reminders / background jobs (Session 18): single cron at
  `/api/cron/scheduled-reminders` runs 8 idempotent inbox jobs daily.
- Final deploy pass (Session 19): defensive prerender fallbacks on
  marketing pages so builds succeed without a populated DB.

---

## 2 · Migrations added in Phase 1.5 / Phase 2

| # | Name | Purpose |
|---|------|---------|
| 0028 | `phase15_data_hardening` | FK/index hardening, ParentRelationship enum |
| 0029 | `study_session` | Self-study tracking |
| 0030 | `material_library` | Materials catalogue |
| 0031 | `absence_excuse` | Parent-driven excuse workflow |
| 0032 | `student_academic_goal` | Roadmap target tracker |
| 0033 | `homework_lesson_materials` | Assignment/Lesson ↔ Material joins |
| 0034 | `payment_schedule_item` | Parent due-list |
| 0035 | `teacher_payroll_hub` | Lesson-level payroll layer |

All migrations are **additive** — no destructive `DROP COLUMN`/`DROP TABLE`,
no data loss. FK behaviour is intentional (`onDelete: SetNull` on financial
joins, `Cascade` only on owner-side relations). Indexes match query
patterns introduced in the same session.

Deploy command (run during release):

```bash
npx prisma migrate deploy
npx prisma generate
```

Both `npm run build` (production) and `npm run build:nomigrate`
(verification) call these in order.

---

## 3 · Required environment variables

See `docs/production-deploy-checklist.md` §1 for the full table. **TL;DR
the absolute minimum to boot a healthy production instance:**

| Variable | Required for | Source |
|----------|--------------|--------|
| `DATABASE_URL` | boot | Postgres provider |
| `DIRECT_URL` | migrations | Postgres direct connection |
| `NEXTAUTH_URL` | auth + same-origin guard | your public URL |
| `NEXTAUTH_SECRET` | auth | `openssl rand -hex 32` |
| `CRON_SECRET` | cron auth | `openssl rand -hex 32` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed first admin | choose strong values |

Recommended for production features:

- `RESEND_API_KEY` + `MAIL_FROM` — transactional email.
- `PAYTR_*` + `PAYMENT_WEBHOOK_SECRET` — purchase flow.
- `EXPO_ACCESS_TOKEN` — mobile push.
- `LEAD_NOTIFICATION_EMAILS` — marketing lead intake.

Optional / future:

- `PUSHER_*` + `NEXT_PUBLIC_PUSHER_*` — realtime channels (codepath is
  feature-flagged off when unset).
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — drop-in cache
  upgrade (in-memory fallback otherwise).

---

## 4 · Security additions (Session 17)

- `lib/security/origin.ts` — `assertSameOrigin` allow-list driven by
  `NEXT_PUBLIC_APP_URL` / `NEXTAUTH_URL` / `VERCEL_URL`.
- `lib/security/rate-limit.ts` — facade over the existing DB-backed
  `RateLimitEntry` table with `assertRateLimit` + key builders.
- `lib/security/mutation-guard.ts` — `guardMutation` / `enforceMutation`
  composable wrapper.
- Wired into 10 high-risk surfaces (homework submit, attendance record,
  parent excuse create, parent invite, payment mark-paid/partial/cancel,
  payroll mark-paid/cancel, ODK publish/archive, ODK student submit).
- All quotas are intentionally generous — tighten only if abuse is
  observed.

---

## 5 · Background jobs (Session 18)

`/api/cron/scheduled-reminders` runs daily (`30 8 * * *`) and fires:

- upcoming-lesson (24h ahead)
- homework-due-soon (≤48h)
- homework-overdue (≥12h late)
- homework-review-pending (teacher queue)
- payment-due-soon (≤3 days)
- payment-overdue (vade aşıldı)
- absence-excuse-pending (>24h pending)
- payroll-review-pending (DRAFT/REVIEWED/LOCKED)

Idempotency is enforced via `InboxMessage(relatedEntityType,
relatedEntityId, recipientUserId, createdAt)` window. Safe to re-trigger
manually:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://<host>/api/cron/scheduled-reminders
```

---

## 6 · Known limitations (truthful)

1. **DB-backed rate-limiter** costs `count + insert` per check. Fine at
   current load; future upgrade path is Upstash Redis.
2. **Rate-limit / origin guard fail open** when env vars are unset or
   neither `Origin` nor `Referer` are present (non-browser callers).
   Auth + role checks remain primary gates.
3. **No notification preferences UI** yet — every linked user receives
   reminders. Per-user opt-out matrix is the natural next step.
4. **Marketing pages render with empty package lists** when the DB is
   unreachable at build time (Session 19 defensive fallback). ISR
   re-fetches on first production request. Logs print one
   `[deneme-kulubu]` and one `[HomeOdkPreview]` warning during the build
   step in that scenario; this is intentional.
5. **3 pre-existing lint warnings** in
   `components/panel/ui/entity-search-combobox.tsx`,
   `components/panel/ui/smart-table.tsx`,
   `components/ui/toast.tsx`. None are regressions, all are accessibility
   ARIA hints flagged for future polish.

---

## 7 · Deploy steps (verbatim)

1. **Set env vars** in Vercel (or your host) per §3.
2. **Run release pipeline:** `npm run build` (which invokes
   `prisma generate && prisma migrate deploy && next build`).
3. **Verify cron config** in `vercel.json` shows the entries from §5
   plus the existing `lesson-reminders`, `assignment-reminders`,
   `parent-weekly-digest`, `notification-digest`, `audit-retention`,
   `account-deletion-process`, `email-retry`, `rate-limit-prune`.
4. **Smoke test** per `docs/manual-smoke-checklist.md` — execute
   sections in order: Admin → Teacher → Student → Parent → ODK →
   Finance → Cron → Security.
5. **Manually fire reminders** once with the curl from §5 to seed the
   inbox; check that calling it twice produces zero duplicates.

---

## 8 · Rollback caution

- **Never roll back migrations 0029–0035 in place.** They are additive
  but their absence will break the corresponding panel surfaces. Roll
  forward instead.
- The legacy `TeacherPayroll` model (used by `/panel/admin/maaslar`) is
  untouched by Session 11; rolling back the new payroll hub does NOT
  affect legacy payroll data.
- `PaymentScheduleItem.status="OVERDUE"` is **never written** — status
  remains `PENDING` / `PARTIAL` / `PAID` / `CANCELLED`. Any UI badge
  showing "Vade aşıldı" derives from `dueDate < now()`. Do not retro-fit
  an OVERDUE state without coordinating with all readers.
- `AbsenceExcuse` is never auto-actioned by the cron. Manual review
  endpoints remain the only state-mutating path.

---

## 9 · Final go/no-go

| Check | Status |
|-------|--------|
| `npx prisma format` | ✅ pass |
| `npx prisma generate` | ✅ pass |
| `npm run typecheck` | ✅ 0 errors |
| `npm run lint` | ✅ 0 errors, 3 pre-existing warnings |
| `npm run build:nomigrate` (fake DB) | ✅ Compiled successfully · 52/52 static pages |
| Cron protected | ✅ Bearer required in prod |
| Migrations additive only | ✅ verified |
| No business mutation in cron | ✅ inbox writes only |
| No secret leakage | ✅ env audited |
| Real-data smoke checklist | ✅ executable, role-ordered |

**Decision: GO** — proceed with production deploy following §7.

End.
