# Online Dershanem — Phase 3 Release Notes

> Last updated: 2026-05-31 — Sessions 1 → 14 complete.
> Status: **GO** for production deploy (with caveats — see §Final Go/No-Go).

This document is the single short read a deployer needs. For per-session
technical depth see `docs/phase-3-operational-crud-audit.md` and the
session-specific change-log files in this folder.

---

## Overview

Phase 3 turned the "view-only" admin/operational panel into a fully
operational back-office:

- Admins can create, invite, disable, re-enable, force-pw-change, bulk
  manage and import students / parents / teachers without touching the DB.
- Parents and students get a self-service onboarding via single-use
  invite tokens (`/davet/[token]`) and a forced-password-change gate
  (`/panel/sifre-degistir`).
- Enrollment, package, and payment schedule rows have a deterministic,
  audited lifecycle.
- A safe CSV import wizard with mandatory dry-run, server-side
  re-validation on commit, and status taxonomy
  (READY / WARNING / ERROR / SKIPPED_DUPLICATE).
- A Premium Panel Redesign v2 ships across all admin/teacher/parent/
  student surfaces.
- An end-to-end test foundation: Playwright + deterministic seed +
  pre-deploy `@smoke` gate.

No Phase 2 capability was removed. Phase 3 is purely additive.

---

## Major capabilities shipped

### Operational onboarding (Sessions 1–4)
- Student creation wizard, duplicate detection, account modes
  (`none | invite | disabled`).
- Teacher creation wizard, duplicate detection, classroom assignment.
- Parent creation wizard with parent ↔ student linking inside the wizard.
- Shared `lib/panel/account-onboarding.ts` for invite/temp-password,
  disable/enable, force-pw-change.
- Audit log entries on every state change.

### Account lifecycle (Session 2)
- `/davet/[token]` invite acceptance — single-use, atomic consume,
  expiration honored.
- `/panel/sifre-degistir` — mandatory for `User.mustChangePassword=true`,
  enforced at middleware + `requirePanelSession()` in defense-in-depth.
- Login-attempt rate-limit (per email + per IP), `accountDisabledAt`
  blocked at NextAuth `authorize`.
- Audit actions: `LOGIN_BLOCKED_DISABLED`, `USER_INVITE_GENERATE`,
  `USER_INVITE_CONSUME`, `USER_PASSWORD_CHANGE`, etc.

### Enrollment / package / payment (Session 5)
- `lib/od/enrollment.ts` — `createStudentEnrollmentWithPaymentPlan`
  generates `StudentPackageEnrollment` + `PaymentScheduleItem` rows
  in a single audited operation.
- Status invariants:
  - `PaymentScheduleItem` defaults to `PENDING`, `paidAmount=0`,
    `accountingEntryId=null` at creation.
  - Enrollment status flips (`ACTIVE/PAUSED/CANCELLED`) **never**
    mutate `PaymentScheduleItem.amount`.
  - No `AccountingEntry` is created at enrollment time (income is
    booked only when payment lands).
- Premium v2 enrollment wizard at `/panel/admin/kayitlar/yeni`.

### Classroom + Course operational management (Sessions 6, 9)
- Classroom CRUD + ClassroomTeacher / ClassroomStudent management.
- Course CRUD + module/content management.
- Default teacher / classroom on Course = optional defaults for new
  enrollments.

### Bulk + import + export (Sessions 7, 8, 10)
- Bulk operations (`lib/panel/bulk-operations.ts`):
  - Generate invites, force pw change, disable, enable, classroom
    assign, ODK access tag grant.
  - Idempotent — re-running an action counts already-in-state rows
    as `skipped` not `failed`.
  - Hard cap `BULK_MAX_IDS = 500` per call.
- Export route `/api/panel/export/[entity]` — XLSX, no password
  hash / token / secret leak (Session 13 deep test enforces).
- Safe CSV import wizard `/panel/admin/import` — mandatory dry-run,
  server re-parses + re-validates on commit, AuditLog entries for
  both phases.

### Premium Panel Redesign v2
- New `od-*` design tokens, `<Card/>` / `<Badge/>` / `<SmartTable/>`
  / `<BulkBar/>` / `<BulkOperationResultPanel/>` primitives.
- Consistent admin / teacher / parent / student surfaces.
- Sidebar refactored under `components/panel/shell/sections.ts`.

### E2E test infrastructure (Sessions 11–13)
- Playwright 1.49.0, chromium-only project, `tr-TR` locale,
  `Europe/Istanbul` timezone.
- Deterministic seed `prisma/seed-e2e.ts` — production guard, idempotent.
- Pre-deploy `@smoke` set: ~13 specs, role/access/cron/idempotency.
- Full E2E suite: ~24 specs, including invite acceptance, forced pw
  change, import commit, parent linking, bulk ODK, XLSX deep parse.
- `data-testid` selector policy on `BulkBar` / `BulkRowCheckbox` /
  classroom + access-tag selects/submits / `BulkOperationResultPanel`.

---

## Schema migrations added in Phase 3

| Migration | Session | Purpose |
|---|---|---|
| `0034_payment_schedule_item` | Session 5 | `PaymentScheduleItem` (kuruş, status PENDING/PARTIAL/PAID), parent finance backbone |
| `0035_teacher_payroll_hub` | Session 4/11* | `TeacherCompensationRule`, `TeacherPayrollPeriod`, `TeacherPayrollItem` (Phase 2 hub formalized) |
| `0036_user_account_onboarding` | Session 1/2 | `User.userInviteToken`, `User.userInviteTokenExpiresAt`, `User.userInviteSentAt`, `User.mustChangePassword`, `User.accountDisabledAt` |

> *0035 was scaffolded under Phase 2 spec but materialized at the start
> of Phase 3 Session 4 to align teacher payroll with the new account
> lifecycle. It is **non-destructive**: only adds tables.

### Sessions with no schema change

Sessions 3, 6, 7, 8, 9, 10, 11, 12, 13, 14 added zero new migrations.
Most operational surfaces were unlocked by helpers + UI, not by new
columns.

---

## Security / account lifecycle changes

- New gates: `requirePanelRole(role)`, `requirePanelSession()` —
  return 403 / redirect for cross-role access.
- Middleware enforces `mustChangePassword=true` redirect to
  `/panel/sifre-degistir` for **any** authenticated request that is
  not on the allowlist (login, sifre-degistir itself, signout).
- Invite tokens never appear in any export; their hashes are stored
  as raw strings on `User` (single-use, atomically consumed).
- Bulk operations cannot rotate raw passwords (force-change-on-next-
  login is the only mass password operation).
- Rate-limit windows hardened in `lib/login-attempts.ts` —
  `LOGIN_LOCKOUT_MINUTES=15`, `LOGIN_LOCKOUT_THRESHOLD=5`.

---

## Enrollment / payment rules (canonical)

- **Income at enrollment:** none. `AccountingEntry` is created only
  on payment landing (PayTR callback or manual mark-paid by admin).
- **Schedule rows:** `PaymentScheduleItem` is the source of truth for
  parent finance. `paidAmount` accumulates across partial payments.
- **Status flips:** `ACTIVE → PAUSED → ACTIVE` and `→ CANCELLED` are
  **never** retroactive on schedule rows. Already-paid rows stay paid;
  pending rows can be voided manually if needed.
- **Parent visibility:** Parents see their own `paymentScheduleItems`
  via `/panel/veli/odemeler` and `/panel/veli/faturalar` only —
  they cannot see other students' rows.
- **No FK from PaymentScheduleItem → StudentPackageEnrollment yet.**
  Linkage is via `(studentId, packageId)`. Documented as a Phase 4
  hardening candidate (see Known limitations).

---

## Import / export / bulk capabilities

- Import wizard at `/panel/admin/import?entity=students|parents|teachers`.
- Templates served from `/api/panel/import-templates/[entity]` (UTF-8
  BOM + CRLF + always-quoted cells).
- Hard caps: `MAX_IMPORT_ROWS = 500`, `5MB` client file size.
- Status taxonomy: `READY / WARNING / ERROR / SKIPPED_DUPLICATE`.
- Server **re-runs** the dry-run on commit; never trusts the client
  classification.
- Export endpoint enforces `requirePanelRole("admin")` and supports
  `?ids=...` filtering for selected-row export.
- Bulk operations log a single `*_BULK_*` audit + per-row entries.

---

## E2E coverage

Full coverage matrix lives in `docs/e2e-test-plan.md`. Highlights:

- **Smoke set (`npm run test:e2e:smoke`):** ~13 specs covering login,
  role routing, access boundaries, import page gate, enrollment
  invariants, cron protection, bulk surface render + idempotency,
  admin route smoke, role journey smokes, export content safety.
- **Full set (`npm run test:e2e`):** adds slow flows — invite
  acceptance, forced password change, import commit (file upload),
  bulk classroom UI flow, XLSX deep content parse.
- **Seed:** `npm run db:seed:e2e` — deterministic, idempotent,
  production-DB guard. Creates 4 users + 2nd student + ODK access
  tag + classroom + package + enrollment + payment + assignment.

---

## Known limitations / deferrals (final)

These are Phase 3 conscious deferrals. None block Phase 3 GO.

- **Email / SMS / WhatsApp delivery** — invite URLs are surfaced in the
  admin UI for out-of-band copy; no provider integration shipped.
- **External payment provider callbacks (PayTR)** — flow exists from
  Phase 2; Phase 3 did not extend it.
- **Invoice / PDF generation** — finance reports are XLSX only.
- **Full XLSX import** — only CSV is accepted (XLSX export is shipped).
- **Bulk teacher → classroom assignment** — only student → classroom
  is bulk-assignable; teachers go through the per-classroom screen.
- **Teacher availability model** — scheduling assumes the existing
  Lesson model; no `TeacherAvailability` table.
- **`enrollmentId` FK on `PaymentScheduleItem`** — currently linked by
  `(studentId, packageId)`. Hardening candidate for Phase 4.
- **Deep dark-mode visual polish** — Premium v2 supports dark mode at
  the token level; some legacy panels still inherit Phase 2 colors.
- **Live Playwright run in this dev box** — not executed; needs running
  `next start` + Postgres test DB. Smoke is the deploy gate (manual
  on CI/staging).

---

## Deploy checklist

Authoritative checklist: `docs/production-deploy-checklist.md`.

Quick path:

```bash
# 1) Confirm env: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, CRON_SECRET
# 2) Build + migrate (Vercel runs npm run build = prisma migrate deploy + next build)
npm run build

# 3) On a *test* DB (not prod): seed + smoke
DATABASE_URL=$E2E_DATABASE_URL npm run db:seed:e2e
PLAYWRIGHT_BASE_URL=https://staging.onlinedershanem.com npm run test:e2e:smoke

# 4) Deploy. Post-deploy run docs/manual-smoke-checklist.md "Phase 3 RC Smoke Path".
```

---

## Rollback caution

- `0034_payment_schedule_item`, `0035_teacher_payroll_hub`,
  `0036_user_account_onboarding` are **additive only** (new tables
  and new columns with safe defaults). A code-level rollback to the
  Phase 2 release branch leaves orphaned tables/columns; data is not
  lost.
- Rolling back **after** users have consumed invites or changed
  passwords means the new password hashes persist (Phase 2 code
  reads `passwordHash` the same way). Acceptable.
- **Do not** run `prisma migrate reset` on production. There is no
  destructive Phase 3 migration to revert.

---

## Final Go/No-Go

| Gate | Status | Notes |
|---|---|---|
| `npx prisma format` | ✅ | No diff produced. |
| `npx prisma generate` | ✅ | Client generates clean. |
| `npx tsc --noEmit` | ✅ | Exit 0, no errors. |
| `npx tsc -p tests/e2e/tsconfig.json --noEmit` | ✅ | Exit 0. |
| `npm run lint` | ✅ | 0 errors, 3 pre-existing warnings (entity-search-combobox, smart-table aria-sort, toast useEffect ref capture). |
| `npm run build:nomigrate` | ✅ | Exit 0. DATABASE_URL warnings during static prerender are expected on this dev box (no DB). |
| `npm run scan:links` | ⚠️ | Requires running `next start`; not executed locally. To run pre-deploy on staging: `BASE_URL=https://staging.* npx tsx scripts/scan-broken-links.ts`. |
| Live Playwright run | ⚠️ | Not executed locally — needs running `next start` + Postgres seeded test DB. Suite typechecks (✅). Run on CI/staging: `npm run db:seed:e2e && npm run test:e2e:smoke`. |
| Manual smoke pass on staging | 🟡 pending | RC path in `docs/manual-smoke-checklist.md > Phase 3 RC Smoke Path`. |

**Decision: GO** for production deploy, conditional on:

1. Running `scan:links` against staging URL → exit 0.
2. Running `npm run test:e2e:smoke` against staging URL → exit 0.
3. Completing the **Phase 3 RC Smoke Path** in
   `docs/manual-smoke-checklist.md` post-deploy.

If any of (1)–(3) fail, hold deploy and triage; nothing in Phase 3
should require a database rollback.
