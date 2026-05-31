# Phase 3 — Operational CRUD & Onboarding Audit

> Created: 2026-06 (Phase 3 / Session 1).
> Owner: panel team.
> Scope: turn the Phase 1/2 admin shell into something a real online education
> business can run day-to-day. This document is the source of truth for the
> 6-session Phase 3 plan and tracks per-session deliverables.

## 0. TL;DR — current state

The admin panel built in Phases 1, 1.5 and 2 is structurally sound (router,
auth, RBAC, audit, notifications, smart-tables, drawers, command palette, ODK,
ÖDK, accounting, reports, observability) but **operationally incomplete** at
the CRUD layer. Onboarding a new student today requires:

1.  Admin enters name + phone in `/panel/admin/ogrenciler/yeni`. Student row is
    created **without** a `User` account, **without** a parent relation,
    **without** a package, **without** a classroom and **without** ODK/OD
    access tags.
2.  Admin then walks five other pages (`/duzenle`, `/veliler/yeni`, …) to wire
    the rest by hand. There is no checklist showing what is missing.
3.  The student/parent has no way to log in — no invite link, no temporary
    password, no first-login flow. Only the parent invite token primitives
    exist (Phase 1.5 / Session 13) and even those have no consumer page yet.

Phase 3 closes those gaps without redesigning the shell.

## 1. Existing assets (do **not** rebuild)

| Concern              | Where                                                   | Status |
|----------------------|---------------------------------------------------------|--------|
| RBAC + session       | `lib/panel-access.ts`, `lib/auth.ts` (NextAuth/JWT)     | ✓ keep |
| Audit log            | `lib/audit.ts` (`logAudit`)                             | ✓ keep |
| Notifications        | `lib/notifications.ts` (`notifyUser`, `notifyAdmins`, …)| ✓ keep |
| Mutation guard       | `lib/security/mutation-guard.ts`                        | ✓ keep |
| Brute-force lockout  | `lib/login-attempts.ts`                                 | ✓ keep |
| Phone normalization  | `lib/auth-utils.ts` (`normalizePhone`)                  | ✓ keep |
| Parent invite token  | `lib/parent-invites.ts` + `Parent.parentInviteToken`    | ✓ keep, mirror onto User |
| Parent onboarding    | `lib/parents.ts` (`deriveParentOnboardingState`)        | ✓ keep, mirror for Student |
| Smart table + views  | `components/panel/ui/smart-table.tsx`                   | ✓ keep |
| Quick drawers        | `components/panel/students/student-quick-drawer.tsx`    | ✓ keep |
| Detail tabs          | `components/panel/students/student-360-tabs.tsx`        | ✓ keep |
| Toast forms          | `components/ui/toast-form.tsx`                          | ✓ keep |
| Bulk pattern         | none yet on students                                    | ✗ build (Session 4) |

## 2. Gaps mapped to Phase 3 sessions

### 2.1 Session 1 — Student creation + account + parent linking + enrollment **(THIS SESSION)**

Specific gaps closed in Session 1:

| # | Gap                                                                | Fix                                            |
|---|--------------------------------------------------------------------|------------------------------------------------|
| 1 | `/yeni` form is a flat 13-field grid. Sections / wizard absent.    | `/yeni` rewritten as a sectioned single-page wizard (identity / education / hesap / veli / paket / etiket / notlar) with anchor TOC. |
| 2 | No duplicate detection — admin can create two students with same phone. (`phoneKey` is unique → 500 error.) | Server-side check on POST + warning surface on the form. |
| 3 | No User account is created for the student.                        | `lib/panel/account-onboarding.ts::createUserAccountForStudent` with three modes: `none` / `invite` / `tempPassword`. |
| 4 | User table has no first-login / invite columns.                    | Migration `0036_user_account_onboarding` adds: `userInviteToken`, `userInviteTokenExpiresAt`, `userInviteSentAt`, `mustChangePassword`, `passwordChangedAt`, `lastLoginAt`, `accountDisabledAt`. All additive, all nullable (or boolean default-false). |
| 5 | Parent onboarding helper assumed `User.lastLoginAt` exists. It didn't — `ACTIVE` state could never resolve. | Same migration adds the column; `lib/auth.ts` writes it on each successful `authorize`. |
| 6 | Student detail page has no onboarding checklist.                   | New `StudentOnboardingCard` rendered above the 360 tabs on `/panel/admin/ogrenciler/[id]`. |
| 7 | No bidirectional parent linking.                                   | `linkChildAction` already exists on `veliler/_actions.ts`; we extend `ogrenciler/_actions.ts` with audit/notification parity and unify both actions through a single helper. |
| 8 | No notifications fire on critical onboarding events.               | `notifyUser` / `notifyAdmins` calls added to: STUDENT_CREATE, STUDENT_USER_CREATE, STUDENT_INVITE_GENERATE, STUDENT_PARENT_LINK, STUDENT_ACCOUNT_DISABLE, STUDENT_ACCOUNT_ENABLE. |
| 9 | First-login password flow is absent.                               | **Partial in Session 1.** Invite-token primitives shipped on `User` (mirrors Parent). The consumer page (`/davet/[token]`) and the `mustChangePassword` middleware redirect are deferred to Session 6 (alongside the still-missing `/veli-davet/[token]` page). Documented below. |

### 2.2 Sessions 2-6 — deferred (out of scope for THIS session)

| Session | Focus                                                                                              |
|---------|----------------------------------------------------------------------------------------------------|
| 2       | Parent CRUD parity (`veliler/yeni` rewritten as sectioned wizard; bulk invite; duplicate detection on phone & email). |
| 3       | Teacher CRUD + payroll-rule onboarding (`ogretmenler/yeni` wizard; default rate; payable-from date). |
| 4       | Bulk actions on student list (assign tag/classroom, generate invites, disable accounts, ODK access); 17 advanced filter facets; saved views. |
| 5       | Package & order onboarding (admin can sell a package to a student inside the panel with full audit + accounting entry). |
| 6       | Operational QA: invite-consumer pages (`/davet/[token]` for users, `/veli-davet/[token]` for parents); first-login `mustChangePassword` middleware; account recovery flow; smoke + load test. |

## 3. Schema decisions for Session 1

### 3.1 What we **add** (`prisma/migrations/0036_user_account_onboarding`)

```prisma
model User {
  // … existing fields unchanged …

  // ── Phase 3 / Session 1 — account onboarding state ─────────────────────
  /// Davet token'ı (ogrenci/öğretmen). Veli için ayrı kolonlar Parent'ta.
  userInviteToken           String?   @unique
  userInviteTokenExpiresAt  DateTime?
  userInviteSentAt          DateTime?
  /// İlk girişte zorunlu şifre değişimi. Geçici şifre verildiyse `true`.
  mustChangePassword        Boolean   @default(false)
  passwordChangedAt         DateTime?
  /// `lib/auth.ts::authorize` her başarılı girişte günceller.
  lastLoginAt               DateTime?
  /// Hesap operasyonel olarak devre dışı (silinmedi). Loginu engellemek için
  /// `lib/auth.ts` bu kolonu okur ve null döndürür.
  accountDisabledAt         DateTime?
}
```

All additive, all nullable / boolean-default. Zero data risk. SQL is plain
`ALTER TABLE … ADD COLUMN …`.

### 3.2 What we **don't** add

We deliberately do NOT introduce a separate `AccountStatus` enum; the four
existing booleans/dates already encode the state machine, and we expose a
derived helper instead (`getStudentAccountState`).

We don't add `Student.onboardingCompletedAt` either — `User.onboardingCompletedAt`
already exists, and onboarding completeness for the admin's workflow is purely
**derived** from existing relations (parent link, classroom assignment,
package assignment, ODK access, account status). This keeps the source of
truth in one place.

## 4. Onboarding state machine (derived, no schema)

`lib/panel/account-onboarding.ts::deriveStudentOnboardingChecklist(s)`
returns an array of `{ id, label, done, severity, hint? }` with these checks:

| ID                  | Done when                                                          |
|---------------------|--------------------------------------------------------------------|
| `identity`          | `fullName` and (`phone` or `email`) present                        |
| `account`           | `userId` exists and not disabled                                   |
| `password-or-invite`| `passwordChangedAt` set OR active invite token                     |
| `parent`            | at least one `ParentStudent` row                                   |
| `classroom`         | at least one `ClassroomStudent` row                                |
| `package`           | at least one `studentPackage` (StudentPackage) or active enrollment |
| `access`            | OD or ODK access tag granted (or explicitly opted out)             |
| `goal`              | `targetGoal` or `targetSchool` filled                              |

The **header status** of the card is `complete` if all `severity:"required"`
checks are done, otherwise `incomplete` and shows the count.

## 5. Permissions

All Session 1 mutations require `requirePanelRole("admin")`. We do not relax
this; the panel has only one privileged role today and adding a second
("operator with no delete") is explicitly Phase 4 scope.

`enforceMutation` (Session 17 of Phase 2) is applied to:

* `createStudentAction` — `studentLifecycle.create`, 60 / 10 min.
* `regenerateStudentInviteAction` — `student-invite.generate`, 30 / 60 min,
  same-origin enforced (mirror of parent invite).
* `disableStudentAccountAction` / `enableStudentAccountAction` — `student-account.toggle`, 20 / 60 min.

## 6. Notifications

| Event                       | Audience                                  | Channel                |
|-----------------------------|-------------------------------------------|------------------------|
| `STUDENT_CREATE`            | admins                                    | inbox                  |
| `STUDENT_USER_CREATE`       | the new user (if created)                 | inbox welcome message  |
| `STUDENT_INVITE_GENERATE`   | admins (audit-only — token returned to UI; no email yet) | inbox               |
| `STUDENT_PARENT_LINK`       | parent user (if has account), admins       | inbox                  |
| `STUDENT_ACCOUNT_DISABLE`   | the user, admins                          | inbox                  |
| `STUDENT_ACCOUNT_ENABLE`    | the user, admins                          | inbox                  |
| `STUDENT_PASSWORD_FORCE`    | the user                                  | inbox                  |

Email/WhatsApp delivery is intentionally **not** wired up yet — the panel
returns the invite URL for the admin to copy/paste, identical to the
existing parent flow. Email delivery is Session 6 / Phase 4.

## 7. Smoke checklist (Session 1)

See `docs/manual-smoke-checklist.md` §"Phase 3 — Session 1 — Student
Onboarding". 14 cases.

## 8. Out-of-scope for Session 1

* Bulk actions toolbar on student list — Session 4.
* 17 advanced filter facets + 9 saved views — Session 4.
* `/davet/[token]` consumer page (user invite consumer)  — Session 6.
* `/veli-davet/[token]` consumer page (parent invite consumer) — Session 6.
* `mustChangePassword` middleware redirect — Session 6.
* Email/SMS delivery of invite links — Phase 4.
* Soft-delete / recovery — Phase 4.

## 9. Verification gates (must hold at end of Session 1)

* `npm run typecheck` → 0 errors.
* `npm run lint` → no new warnings (3 pre-existing tolerated).
* `npm run build:nomigrate` (fake DATABASE_URL) → `✓ Compiled` and 52/52 (or
  more) static pages. **Note:** wizard page must remain a server component.
* `npx prisma format` clean; `npx prisma migrate diff --from-empty` lists the
  new migration only.

---

# Phase 3 — Session 2 — Invite Acceptance + First Login Password Enforcement (2026-06)

Closes the consumer side of the account lifecycle. After Session 1 admins
could *issue* invites + temp passwords; with Session 2 the end-user can
*accept* them, set a password, and is forced through a change flow if their
account was created with a temp password.

## §1 Deliverables (shipped)

* **D1 — `/davet/[token]`** consumer page (server component) +
  `consumeInviteAction` server action. Validates token, derives error code
  from `validateInviteToken`, shows reusable password setup form for the
  happy path, shows Turkish error + "yeni davet isteyin" CTA for
  `EXPIRED|NOT_FOUND|DISABLED`. On success redirects to
  `/giris?callbackUrl=<role-dashboard>`.
* **D2 — Reusable `PasswordSetupForm`** at
  `components/auth/password-setup-form.tsx`. Optional "current password"
  field. Client-side: required, min 8, confirm matches. Server-side
  re-validation via `validateNewPassword`.
* **D3 — `/panel/sifre-degistir`** page + `changePasswordAction`. Reachable
  by any authenticated user. Reads `getServerAuthSession()` directly (not
  `requirePanelSession()`) to avoid the loop.
* **D4 — `mustChangePassword` enforcement** (see §2 architecture).
* **D5 — Legacy `/veli-davet/[token]`** — does NOT exist in the codebase
  today; no consumer was ever shipped. No redirect needed. Parent-user
  invite tokens (`Parent.parentInviteToken*`) currently sit unused; their
  consumer is deferred to a future session when we decide whether to
  merge them into the unified `/davet/[token]` flow.
* **D6 — `lib/panel/account-onboarding.ts` helpers**:
  * `MIN_PASSWORD_LENGTH = 8`.
  * `validateInviteToken(token)` — read-only, returns discriminated result.
  * `validateNewPassword(pw)` — Turkish error or null.
  * `consumeUserInviteToken({ token, newPassword, ip?, userAgent? })` —
    atomic single-use via `updateMany({ where: { id, userInviteToken, ... } })`.
    Hashes with bcrypt rounds 12, sets `passwordChangedAt`,
    clears `mustChangePassword`, audits `USER_INVITE_ACCEPT`,
    notifies admins + the user.
  * `changePasswordForUser({ userId, currentPassword, newPassword, ip? })`
    — verifies current, rejects `SAME_AS_OLD`, audits `USER_PASSWORD_CHANGE`.
  * `getPostLoginRedirectForRole(role)` — `/panel/<segment>` mapping.
* **D7 — UI status surfaces.** All `UserAccountState` values already had
  Turkish labels + tones in Session 1 (`INVITE_PENDING`, `INVITE_EXPIRED`,
  `MUST_CHANGE_PASSWORD`, `ACTIVE`, `DISABLED`, `NO_ACCOUNT`). The
  existing `StudentAccountActions` widget already exposes "Davet linki
  yeniden üret" on `INVITE_EXPIRED`. No code change required.
* **D8** — see `docs/manual-smoke-checklist.md` "Phase 3 — Session 2".
* **D9** — this section + cross-reference in
  `docs/phase-1-audit-and-plan-2026-05-30.md`.

## §2 Architecture decision — where to enforce `mustChangePassword`

**Chosen layout:** **JWT-cached flag + server-guard primary + middleware
defense-in-depth.**

* `lib/auth.ts` JWT callback already re-reads the DB every request; we
  added `mustChangePassword + accountDisabledAt` to that `SELECT`. Disabled
  accounts have their `token.role` deleted (next panel hit redirects to
  `/giris`).
* `Session.user.mustChangePassword` is exposed in `types/next-auth.d.ts`.
* `requirePanelSession()` reads request pathname from `headers()` and
  redirects to `/panel/sifre-degistir` whenever the flag is true and the
  current path is not the change-password page itself. This is the **primary**
  gate; every panel server-component already calls it.
* `middleware.ts` also reads `token.mustChangePassword` and redirects, as
  a cheap **defense-in-depth** layer. It also whitelists
  `/panel/sifre-degistir` from the role-segment-mismatch redirect so
  STUDENT/PARENT/TEACHER users can reach it.

**Why not put it in middleware only?** Middleware can read the JWT cheaply
but can't easily re-read the DB; the JWT can be stale up to one request.
The server-guard hits the DB anyway, so it's the authoritative check.

**Why not put it in server-guard only?** Some API routes also check
`session.user.role` directly; middleware short-circuits panel page loads
before any RSC runs.

**Token refresh after change-password:** the JWT callback in `lib/auth.ts`
re-reads `mustChangePassword` from the DB on every request. So as soon as
the user finishes the change-password flow, the next request issues a
fresh JWT with the flag cleared and the role-redirect works normally.

## §3 Single-use invariant

`consumeUserInviteToken` uses a single `prisma.user.updateMany({ where: {
id, userInviteToken: <token>, accountDisabledAt: null, OR: [
expiresAt: null, expiresAt > now ] } })`. The token is part of the WHERE,
so the database guarantees a single winner across concurrent requests.
`count !== 1` → reject with `"Davet bağlantısı geçersiz veya başka bir
sekmede kullanıldı."`

## §4 Files touched in Session 2

* `lib/panel/account-onboarding.ts` — appended `validateInviteToken`,
  `validateNewPassword`, `consumeUserInviteToken`,
  `changePasswordForUser`, `getPostLoginRedirectForRole`,
  `MIN_PASSWORD_LENGTH`.
* `lib/auth.ts` — JWT/session expose `mustChangePassword`; disabled
  accounts get `token.role` cleared.
* `types/next-auth.d.ts` — `mustChangePassword: boolean` on Session.user
  and JWT.
* `lib/panel-access.ts` — `requirePanelSession()` reads pathname from
  `headers()` and redirects to `/panel/sifre-degistir` when flag set
  (exempts the change-password path); exports
  `FORCED_PASSWORD_CHANGE_PATH`.
* `middleware.ts` — whitelist `/panel/sifre-degistir`; defense-in-depth
  redirect when `token.mustChangePassword` is true.
* `components/auth/password-setup-form.tsx` — NEW reusable client form.
* `components/auth/login-form.tsx` — reads `mustChangePassword` after
  login, redirects to `/panel/sifre-degistir` directly (skip extra hop).
* `app/davet/[token]/page.tsx` + `_actions.ts` — NEW.
* `app/panel/sifre-degistir/page.tsx` + `_actions.ts` — NEW.

## §5 Verification gates (must hold)

* `npx tsc --noEmit` → 0 errors.
* `npm run lint` → 3 pre-existing warnings tolerated, no new ones.
* `npm run build:nomigrate` → static page count ≥ 52 (Session 1 baseline).
  Both new routes are dynamic (`ƒ`):
  * `/davet/[token]` — `export const dynamic = "force-dynamic"`.
  * `/panel/sifre-degistir` — `export const dynamic = "force-dynamic"`.

## §6 Out of scope (deferred)

* Email/SMS delivery of invite links — Phase 4.
* `/veli-davet/[token]` legacy redirect — no legacy page exists; merging
  parent-user invites into the unified flow is a future call.
* "Resend invite via email" UI affordance — needs email delivery first.
* Password strength meter / breach check (HIBP) — Phase 4 hardening.


---

# Session 3 — Parent operational onboarding & management

> Created: 2026-06 (Phase 3 / Session 3).
> Status: shipped (D2/D3/D4/D5/D6/D8/D9). Deferred: parent list bulk
> actions, Student 360 inline parent-create polish (D7).

## §1 Deliverable matrix

| ID  | Item                                                            | Status   |
|-----|-----------------------------------------------------------------|----------|
| D1  | This audit doc                                                  | ✓ shipped |
| D2  | Parent creation wizard (`/panel/admin/veliler/yeni`)            | ✓ shipped |
| D3  | Parent detail cockpit (`/panel/admin/veliler/[id]/duzenle`)     | ✓ shipped |
| D4  | Parent list filters + saved views (`/panel/admin/veliler`)      | ✓ shipped |
| D5  | Duplicate detection (phoneKey + email)                          | ✓ shipped |
| D6  | Link / unlink / change-relationship for ParentStudent           | ✓ shipped |
| D7  | Student 360 inline parent create (polish)                       | ☐ deferred |
| D8  | Reuse shared helpers (no duplicated `where` builders)           | ✓ shipped |
| D9  | Centralized onboarding helpers in `lib/panel/account-onboarding.ts` | ✓ shipped |
| D10 | Smoke checklist additions (this doc § + manual-smoke-checklist) | ✓ shipped |

## §2 D4 — Parent list filters + saved views

### Filters (server-side, all URL-driven)

* `q`               — full-text contains on `fullName` / `email` / `phone`.
* `access`          — `yes` (`userId not null`) / `no` (`userId null`).
* `state`           — 7 onboarding states (NO_ACCOUNT / INVITE_PENDING /
  INVITE_EXPIRED / NEEDS_PASSWORD / MUST_CHANGE_PASSWORD / ACTIVE / DISABLED).
* `child`           — `yes` (has at least one ParentStudent row) / `no`.
* `missing`         — `email` / `phone` (field is null).
* `mustChange`      — `yes` / `no` (mirrors User.mustChangePassword).
* `lastLogin`       — `never` / `7d` / `30d` / `older30`.
* `created`         — `today` / `7d` / `30d`.
* `relType`         — ParentRelationship enum (any matching ParentStudent row).

All filters compose under a single `Prisma.ParentWhereInput.AND`, so
combinations work. `parsePagination(sp, { pageSize: 50, maxPageSize: 200 })`
provides `skip` / `take` and the count query runs in parallel with findMany.

### Saved views (10 presets via `SavedViewsBar` scope=`parents`)

1. Tüm veliler — `{}`
2. Hesabı olmayan veliler — `{ access: "no" }`
3. Davet bekleyenler — `{ state: "INVITE_PENDING" }`
4. Daveti süresi dolanlar — `{ state: "INVITE_EXPIRED" }`
5. Hiç giriş yapmayanlar — `{ access: "yes", lastLogin: "never" }`
6. Şifre değiştirmesi gerekenler — `{ state: "MUST_CHANGE_PASSWORD" }`
7. Çocuğu bağlanmamış veliler — `{ child: "no" }`
8. Aktif veliler — `{ state: "ACTIVE" }`
9. Devre dışı hesaplar — `{ state: "DISABLED" }`
10. İletişim bilgisi eksik — `{ missing: "email" }`

### Table columns

* `Veli` — name + email/phone subline; row links to `[id]/duzenle`.
* `Hesap durumu` — derived state badge (via `deriveUserAccountState`)
  with a contextual hint line ("Son giriş: N gün önce", "Davet:
  DD.MM.YYYY sonuna kadar", "Devre dışı: DD.MM.YYYY", "Email gerekli", …).
* `Bağlı çocuklar` — up to 3 teal chips, then `+N` overflow.
* `İletişim` — warn badges "Email yok" / "Telefon yok" or `Tam`.
* `Oluşturuldu` — TR-formatted date.

### Empty states

Distinct copy for "no parents at all" vs "no results matching filter"
to avoid the new-tenant confusion we saw on the student list.

## §3 D4 — Known limitations / deferred

* **Bulk actions** (mass invite-resend, mass disable, CSV bulk-create)
  are **deferred**. The server actions exist (`regenerateParentUserInviteAction`
  etc.) but a multi-select UI surface + confirmation modal is a session
  on its own and was explicitly cut to keep scope.
* **Cross-relation filter** ("velileri olmayan öğrenciler") lives on the
  student list; not duplicated here.
* **Saved view persistence** uses the existing localStorage scope —
  no DB-backed personal views yet.

## §4 Files touched in Session 3

* `lib/panel/account-onboarding.ts` — added `parentId?` to invite/account
  helpers, `findParentDuplicates`, `createUserAccountForParent`.
* `lib/parents.ts` — `ParentOnboardingState` extended with `DISABLED` +
  `MUST_CHANGE_PASSWORD`; priority order documented in `deriveParentOnboardingState`.
* `app/panel/admin/veliler/_actions.ts` — Session 3 actions consolidated
  (createParent / updateParent / deleteParent / linkChild / unlinkChild /
  updateRelationship / createParentAccount / regenerateParentUserInvite /
  revokeParentUserInvite / disableParentAccount / enableParentAccount /
  forceParentPasswordChange / resetParentTempPassword /
  createParentWithAccount / lookupParentDuplicates).
* `components/panel/parents/parent-create-wizard.tsx` — D2 wizard with
  live duplicate detection (350 ms debounce) + `ResultPanel` post-submit.
* `app/panel/admin/veliler/yeni/page.tsx` — server shell for D2.
* `components/panel/parents/parent-account-card.tsx` — D3 account
  lifecycle card with copy-once secret reveal.
* `components/panel/parents/parent-children-manager.tsx` — D3 link/unlink
  + inline relationship editor (prop name: `items`, **not** `children`).
* `app/panel/admin/veliler/[id]/duzenle/page.tsx` — D3 cockpit (two-column
  layout, sticky right rail, "Sonraki adım" guidance, last 20 audit rows).
* `app/panel/admin/veliler/page.tsx` — D4 list with 8 filter groups + 10
  saved view presets.

## §5 Verification gates (must hold)

* `npx tsc --noEmit` → 0 errors.
* `npx next lint --dir app/panel/admin/veliler` → 0 warnings.
* No new pages added; route count unchanged.


---

# Session 3 — D7 Student 360 inline parent management

> Created: 2026-06 (Phase 3 / Session 3, D7).
> Status: shipped. Closes the last code-change deliverable of Session 3.

## §1 What changed

The student edit page (`/panel/admin/ogrenciler/[id]/duzenle`) "Veliler"
section was rewritten from the prior simple table + `ParentLinkCard`
pair into a single operational unit `StudentParentSection`.

Admins can now, without leaving the student profile:

* See each linked parent as a rich card with name, relationship label,
  phone/email, account/onboarding badge, last-login or invite hint,
  child count and a "Birincil iletişim" marker.
* Edit the relationship type + primary flag inline (uses the existing
  `linkParentToStudentAction` upsert path — no new server action).
* Remove the link with a confirm dialog.
* Click into the parent detail cockpit (heavy account lifecycle —
  rotate invite, force password change, disable — lives there, not
  duplicated here).
* Open an inline "Veli ata" panel that has two modes:
  * **Mevcut veliyi bağla** — search any parent (combobox), set
    relationship + primary, link via `linkParentToStudentAction`.
    Already-linked parents are detected and a warning is shown
    instead of a duplicate row.
  * **Yeni veli oluştur ve bağla** — full parent create form with
    account options (`none` / `invite` / `tempPassword`). On submit
    runs `createParentWithAccountAction` with `studentIds=[studentId]`
    so the create + link is one atomic admin action. Result panel
    shows the invite URL or temp password with copy buttons + a
    "Veli detayına git" button.

Live duplicate detection (`lookupParentDuplicatesAction`, 350 ms
debounce) runs while typing phone/email. Blocking duplicates (Parent
phoneKey or email match) surface a yellow card with the existing
parent name + a "Mevcut veliyi seç" button that flips the panel back
into pick mode. Soft duplicates (User-only matches) render as a quiet
"Benzer kayıtlar: …" hint.

## §2 Files touched

* `app/panel/admin/ogrenciler/[id]/duzenle/page.tsx` —
  enriched the parent fetch (`user.lastLoginAt`,
  `userInviteToken*`, `_count.students`), pre-derived account state
  server-side, replaced the parent table + `ParentLinkCard` block
  with `<StudentParentSection />`. Removed unused
  `createParentAndLinkAction` import.
* `components/panel/students/student-parent-section.tsx` — NEW
  client component (~815 lines).

## §3 Server actions reused (none added)

| Concern                        | Action used                                |
|--------------------------------|--------------------------------------------|
| Link existing parent           | `linkParentToStudentAction` (upsert)       |
| Update relationship inline     | `linkParentToStudentAction` (upsert)       |
| Unlink                         | `unlinkParentFromStudentAction`            |
| Create new + link              | `createParentWithAccountAction` (`studentIds[]` field) |
| Live duplicate detection       | `lookupParentDuplicatesAction`             |

`_actions.ts` (both `app/panel/admin/ogrenciler/_actions.ts` and
`app/panel/admin/veliler/_actions.ts`) was **not modified** in D7.

## §4 Deferred / not in scope

* Inline rotate-invite / force-password-change / disable from the
  student profile — these live on the parent detail cockpit and the
  card has a "Veli detayı →" link. Surfacing them inline would
  duplicate the full account-lifecycle UI from D3 with no clear
  win.
* Removing the legacy `ParentLinkCard` component file — kept on disk
  in case external pages still import it; verified not imported any
  longer by the student edit page. Can be deleted in a later
  cleanup once a workspace-wide search confirms no other consumer.

## §5 Verification gates (must hold)

* `npx tsc --noEmit` → 0 errors.
* `npx next lint --dir app/panel/admin/ogrenciler --dir components/panel/students`
  → 0 warnings.
* No schema change; no new server action; no new page route.


---

# Session 4 — Teacher operational onboarding & management (2026-06)

> Created: 2026-06 (Phase 3 / Session 4).
> Status: shipped (D1–D10). No new schema; reuses Session 1–2 helpers.

## §1 Pre-Session-4 state — what existed

Before this session the admin teacher surface was the thinnest of all panel
entities:

| Concern                | Where                                              | State |
|------------------------|----------------------------------------------------|-------|
| Teacher CRUD           | `/panel/admin/ogretmenler` (3 routes)              | flat 13-field form, no wizard, no breadcrumbs in detail |
| Account onboarding     | none                                               | a teacher could not log in unless an admin manually inserted a `User` row in the DB |
| Invite link            | none                                               | the `User.userInviteToken*` columns existed but no teacher UI consumed them |
| Temp password          | none                                               | `generateTemporaryPassword` existed but no teacher caller |
| Disable / enable       | none                                               | only available for parents/students |
| Force password change  | none                                               | only available for parents/students |
| Classroom assignment   | inline form on detail page                         | upsert worked, no audit log, no role granularity exposed |
| Compensation rule      | `/panel/admin/ogretmen-hakedisleri/kurallar`       | exists (Phase 2 / Session 11), but unreachable from the teacher detail |
| Availability           | no model                                           | `TeacherAvailability` does not exist; no plan to add yet |
| List filters           | only `q`                                           | no saved views, no operational state filters |
| Duplicate detection    | none                                               | duplicate email crashed via Prisma `@unique` violation |
| Audit                  | only the bare CRUD paths, not classroom/account    | gaps in operational visibility |

## §2 Schema reality (read before coding)

* `Teacher.email` is `@unique`; `Teacher.phone` is **not** unique (no `phoneKey`).
* `Teacher.subjects` is a single free-text string. We treat it as the primary
  branch label.
* `ClassroomTeacher` has `(isLead: boolean, subject: string?)`. No richer role
  enum is available; the wizard exposes "Lider" + free-text subject and
  honestly documents the limitation.
* `TeacherCompensationRule` exists with optional `(courseId, classroomId)`,
  `(startsAt, endsAt)`, `isActive`, `note`, `hourlyRate` (kuruş). Phase 2
  payroll helpers already use it.
* **No `TeacherAvailability` model.** Adding one is out of scope for Session 4
  per the user's "no schema unless trivial and clearly needed" constraint.
  The wizard and detail surfaces show an honest **deferred** card.
* No `secondaryPhone` field on Teacher. The wizard ships a single `phone` +
  `bio` (used as internal note). Secondary phone is documented as deferred.

## §3 D1 — Audit summary (this section)

Documents the pre-Session-4 state above plus the recommended implementation
order, which we executed as: helpers → actions → wizard → cockpit cards →
list → docs.

## §4 D2 — Teacher creation wizard

* Route: `/panel/admin/ogretmenler/yeni` (replaced the prior 6-field flat form).
* Server shell fetches active classroom + course options and delegates to
  `TeacherCreateWizard` (client component).
* Sections: **1.** Kimlik · **2.** Hesap erişimi · **3.** Sınıf / ders ataması ·
  **4.** Müsaitlik (deferred) · **5.** Hakediş (optional) · **6.** Önizleme.
* Live duplicate detection via `lookupTeacherDuplicatesAction` (350 ms debounce).
* On submit calls `createTeacherWithAccountAction` which atomically:
  Teacher.create → optional `createUserAccountForTeacher` → optional
  `disableUserAccount` (if "create disabled") → `classroomTeacher.upsert` ×
  N → optional `teacherCompensationRule.create`. All steps audited.
* Result panel reveals invite URL or temp password once with copy-once UX,
  identical to the parent wizard.

## §5 D3 — Duplicate detection

`findTeacherDuplicates({ phone, email, fullName, excludeTeacherId? })` checks:

* Teacher with same email (`@unique`) → **block**.
* User with same email (would block account creation) → **block** when
  `accountMode !== "none"`.
* Teacher with same phone substring (≥ 6 chars) → **soft warn**.
* Teacher with identical full name (case-insensitive, ≥ 3 chars) → **soft warn**.

Returned through `lookupTeacherDuplicatesAction` (admin-only, no rate limit
since it's a read).

## §6 D4 — Teacher detail cockpit

Route: `/panel/admin/ogretmenler/[id]/duzenle`.

Server-side fetch joins `user`, `classrooms.classroom`,
`compensationRules.{course,classroom}`, plus the latest 15 `auditLog` rows
scoped to `entityType=Teacher`. Pre-derived `accountState` server-side via
`deriveUserAccountState`.

Layout: two-column with sticky right rail (status/quick KPIs + section TOC).

Sections:

1. **Kimlik** — inline edit form bound to `updateTeacherAction(id)`.
2. **Hesap durumu** — `<TeacherAccountCard />` (mirrors `ParentAccountCard`):
   create-with-invite, create-with-temp-password, regenerate invite, revoke
   invite, reset temp password, force password change, disable / enable.
   All wired to the same Session 1–2 `User`-flow primitives — no duplicate
   token logic.
3. **Sınıf / ders ataması** — `<TeacherClassroomManager />`: inline edit
   (subject + isLead), remove (with confirm), add (combobox + subject + lead).
4. **Müsaitlik** — deferred card (no model).
5. **Hakediş kuralları** — `<TeacherCompensationCard />`: list active +
   inactive rules with kuruş→TRY formatting; inline create form (rate, optional
   course/classroom scope, dates, note); deactivate button (preserves history,
   never deletes payroll items). Link to `/panel/admin/ogretmen-hakedisleri/kurallar`.
6. **Bordro özeti** — read-only mini-KPIs (lessons / assignments / payroll
   items count) + link to bordro hub filtered by teacher.
7. **Son aktivite** — last 15 audit rows.
8. **Tehlike bölgesi** — destructive delete (preserved verbatim from prior
   page), with a notice that **Pasif** status is generally preferable.

## §7 D5 — Teacher list with advanced filters + saved views

Route: `/panel/admin/ogretmenler` (list rewrite).

URL filters (single-value, "" = all):

* `q`           — name / email / phone / subjects substring
* `status`      — `ACTIVE` | `INACTIVE`
* `access`      — `yes` | `no` (`teacher.userId`)
* `state`       — 7 onboarding states (NO_ACCOUNT / INVITE_PENDING /
  INVITE_EXPIRED / NEEDS_PASSWORD / MUST_CHANGE_PASSWORD / ACTIVE / DISABLED)
* `classroom`   — `yes` | `no` (has any ClassroomTeacher)
* `classroomId` — specific classroom id (top 8 active classrooms surfaced as quick chips)
* `subject`     — substring on `Teacher.subjects`
* `compRule`    — `yes` | `no` (has any active TeacherCompensationRule)
* `missing`     — `email` | `phone`
* `mustChange`  — `yes` | `no`
* `lastLogin`   — `never` | `7d` | `30d` | `older30`
* `created`     — `today` | `7d` | `30d`

Saved-view presets (10) under `SavedViewsBar scope="teachers"`:

1. Tüm öğretmenler — `{}`
2. Hesabı olmayan öğretmenler — `{ access: "no" }`
3. Davet bekleyenler — `{ state: "INVITE_PENDING" }`
4. Hiç giriş yapmayanlar — `{ access: "yes", lastLogin: "never" }`
5. Şifre değiştirmesi gerekenler — `{ state: "MUST_CHANGE_PASSWORD" }`
6. Sınıf atanmamış öğretmenler — `{ classroom: "no" }`
7. Hakediş kuralı eksik — `{ compRule: "no" }`
8. Aktif öğretmenler — `{ status: "ACTIVE" }`
9. Devre dışı hesaplar — `{ state: "DISABLED" }`
10. İletişim bilgisi eksik — `{ missing: "email" }`

Columns: Öğretmen (name + contact subline) · Hesap durumu (state badge +
"Email gerekli" hint when missing) · Branş · Sınıf (count badge) · Hakediş
(active rule count or warn) · Son giriş (relative) · Oluşturuldu · Aç.

## §8 D6 — Account lifecycle reuse

Every teacher account action delegates to `lib/panel/account-onboarding.ts`:

| Teacher action                              | Reuses                                       |
|---------------------------------------------|----------------------------------------------|
| `createTeacherAccountAction`                | `createUserAccountForTeacher` (new)          |
| `regenerateTeacherUserInviteAction`         | `regenerateUserInvite`                       |
| `revokeTeacherUserInviteAction`             | `revokeUserInvite`                           |
| `disableTeacherAccountAction`               | `disableUserAccount`                         |
| `enableTeacherAccountAction`                | `enableUserAccount`                          |
| `forceTeacherPasswordChangeAction`          | `forceUserPasswordChange`                    |
| `resetTeacherTempPasswordAction`            | `generateTemporaryPassword` + bcrypt + audit |

The shared `consumeUserInviteToken` powers `/davet/[token]` for teachers
identically to students/parents — no teacher-specific consumer page exists
or is needed. After password set, `getPostLoginRedirectForRole("TEACHER")`
sends them to `/panel/ogretmen`.

`requirePanelSession()` already redirects `mustChangePassword=true` users to
`/panel/sifre-degistir` and `accountDisabledAt != null` users out of the
panel — no teacher-specific gate needed.

## §9 D7 — Assignment actions

* `assignClassroomToTeacherAction(teacherId, fd)` — upsert ClassroomTeacher
  (no duplicate row possible thanks to the `@@id([classroomId, teacherId])`
  composite primary key). Audit `TEACHER_CLASSROOM_ASSIGN`.
* `updateClassroomAssignmentAction(teacherId, classroomId, fd)` — update
  `(isLead, subject)`. Audit `TEACHER_CLASSROOM_UPDATE`.
* `removeClassroomFromTeacherAction(teacherId, classroomId)` — delete the
  ClassroomTeacher row (does **not** touch lessons or attendance history;
  Lesson.teacherId is independent). Audit `TEACHER_CLASSROOM_REMOVE`.
* `assignTeacherCourseAction` — **not added**; ClassroomTeacher.subject is
  the existing course/branch slot, and surfacing a separate Course assignment
  here would conflict with `Course.defaultTeacherId` semantics. Documented
  as deferred.

## §10 D8 — Compensation rule integration

* `createTeacherCompensationRuleAction(teacherId, fd)` — guards against an
  obviously-identical active rule (same teacher + course + classroom + rate
  + isActive). Audit `PAYROLL_RULE_CREATE`.
* `deactivateTeacherCompensationRuleAction(teacherId, ruleId)` — sets
  `isActive=false`; never deletes (preserves linkage to existing payroll
  items). Audit `PAYROLL_RULE_DEACTIVATE`.
* The richer rule editor (start/end dates, batch ops) continues to live at
  `/panel/admin/ogretmen-hakedisleri/kurallar`; the detail card links there.
* "Missing rate" warning fires in the list (warn badge) and on the detail
  card (soft alert) when the teacher has zero active rules.
* No payroll generation in this session — Phase 2 / Session 11's
  `generatePayrollPeriodItemsAction` continues to be the single producer.

## §11 D9 — Audit + notifications

| Event                              | Audit action                          | Notification                         |
|------------------------------------|---------------------------------------|--------------------------------------|
| Teacher created                    | `TEACHER_CREATE`                      | —                                    |
| Account created via invite         | `USER_CREATE_VIA_INVITE`              | inbox welcome (the new user)         |
| Account created via temp password  | `USER_CREATE_VIA_TEMP_PASSWORD`       | inbox welcome (the new user)         |
| Invite regenerated                 | `USER_INVITE_GENERATE`                | —                                    |
| Invite revoked                     | `USER_INVITE_REVOKE`                  | —                                    |
| Temp password reset                | `USER_TEMP_PASSWORD_RESET`            | inbox (the user)                     |
| Account disabled                   | `USER_ACCOUNT_DISABLE`                | inbox (user) + admins                |
| Account enabled                    | `USER_ACCOUNT_ENABLE`                 | inbox (the user)                     |
| Force password change              | `USER_PASSWORD_FORCE_CHANGE`          | inbox (the user)                     |
| Classroom assigned                 | `TEACHER_CLASSROOM_ASSIGN[/_BATCH]`   | —                                    |
| Classroom updated                  | `TEACHER_CLASSROOM_UPDATE`            | —                                    |
| Classroom removed                  | `TEACHER_CLASSROOM_REMOVE`            | —                                    |
| Compensation rule created          | `PAYROLL_RULE_CREATE`                 | —                                    |
| Compensation rule deactivated      | `PAYROLL_RULE_DEACTIVATE`             | —                                    |

Notifications are deliberately quiet for routine assignment changes; the
admin uses the audit feed instead. Email/SMS delivery of invite links is
still Phase 4 scope.

## §12 D10 — Files touched

* `lib/panel/account-onboarding-shared.ts` — extended `DuplicateMatch` to
  include `entity: "Teacher"` and `field: "phone" | "fullName"`.
* `lib/panel/account-onboarding.ts` — extended same union; appended
  `findTeacherDuplicates` + `createUserAccountForTeacher`.
* `app/panel/admin/ogretmenler/_actions.ts` — full rewrite (CRUD +
  classroom triple + 7 account actions + 2 compensation actions +
  `lookupTeacherDuplicatesAction` + `createTeacherWithAccountAction`).
* `app/panel/admin/ogretmenler/yeni/page.tsx` — server shell for the wizard.
* `app/panel/admin/ogretmenler/[id]/duzenle/page.tsx` — full cockpit rewrite.
* `app/panel/admin/ogretmenler/page.tsx` — list with filters + saved views.
* `components/panel/teachers/teacher-create-wizard.tsx` — NEW (~595 lines).
* `components/panel/teachers/teacher-account-card.tsx` — NEW.
* `components/panel/teachers/teacher-classroom-manager.tsx` — NEW.
* `components/panel/teachers/teacher-compensation-card.tsx` — NEW.
* `docs/phase-3-operational-crud-audit.md` — this section.
* `docs/manual-smoke-checklist.md` — appended Session 4 cases (15).

## §13 Out of scope (deferred)

* `TeacherAvailability` model (weekly slots / blocked times). Wizard +
  detail show honest deferred cards.
* Secondary phone field on Teacher. Use `bio` for now.
* Granular role enum on `ClassroomTeacher` (lead / branch / mentor /
  guidance). Current model exposes only `(isLead, subject)`; the wizard
  documents this and keeps the simple shape.
* `assignTeacherCourseAction` (separate from `subject` on ClassroomTeacher).
  The Phase-2 rationale was: "course = ClassroomTeacher.subject" within a
  classroom; introducing a side-table now would duplicate intent.
* Email/SMS delivery of invite links — Phase 4.
* Bulk teacher actions (mass disable, mass invite-resend, CSV import) —
  consciously deferred, mirrors Session 3's deferral.

## §14 Verification gates (must hold)

* `npx tsc --noEmit` → 0 errors. ✓
* `npx eslint app/panel/admin/ogretmenler components/panel/teachers
  lib/panel/account-onboarding.ts lib/panel/account-onboarding-shared.ts`
  → exit 0, 0 warnings. ✓
* No new `prisma migrate` required.
* Build: no new static-page change; the rewritten routes were already
  dynamic (`force-dynamic`).


---

# Session 5 — Package / Enrollment / Payment operational flow (2026-06)

> Created: 2026-06 (Phase 3 / Session 5).
> Status: shipped (D1–D10). **No new schema** — reuses
> `StudentPackageEnrollment` (Phase 1) + `PaymentScheduleItem`
> (Phase 2 / Session 10) + `OdkUserAccessTag` (Phase 2 ODK).

## §1 D1 — Pre-Session-5 state audit

| Concern                                  | Where                                              | State |
|------------------------------------------|----------------------------------------------------|-------|
| Package model                            | `Package` (Phase 1)                                | full: name/type/price/lessonCount/subjects/isActive |
| Active package per student               | `StudentPackageEnrollment` (Phase 1)               | EXISTS — has status enum LEAD/TRIAL/ACTIVE/PAUSED/COMPLETED/CANCELLED, source, startsAt/endsAt, listPrice, discountAmount, billingPeriodLabel |
| Legacy package link                      | `StudentPackage`                                   | KEPT untouched; the student wizard still upserts a `StudentPackage` for backwards compat. We do **not** write `StudentPackage` from the new enrollment flow |
| Payment schedule item                    | `PaymentScheduleItem` (Phase 2 / Session 10)       | full: studentId/parentId/packageId/purchaseIntentId/title/amount/dueDate/status/paidAmount/note/createdById |
| Schedule mutations                       | `app/panel/admin/odemeler/_actions.ts`             | already supports create/markPaid/markPartial/cancel — admin-only, never called by parents |
| Parent finance read                      | `lib/panel/parent-finance.ts`                      | already scopes by `parentId` OR `studentId IN childIds`; OVERDUE derived at read-time |
| Existing admin lists                     | `/panel/admin/odemeler/vadeler`                    | full filter+table, but **no enrollment-level grouping** |
| ODK access tags                          | `OdkAccessTag` / `OdkUserAccessTag`                | grant per `User`, not per Enrollment — unique on `(userId, accessTagId)` with `revokedAt` for soft revoke |
| Classroom assignment                     | `ClassroomStudent`                                 | composite-PK upsert idempotent |
| Parents (payer) link                     | `ParentStudent`                                    | composite-PK; isPrimary boolean |
| Onboarding checklist (Session 1)         | `lib/panel/account-onboarding.ts` derivations      | already reads packages count + parents count + classrooms count off the Student row — no new probe needed |
| Gaps                                     |                                                    | (a) no guided enrollment+payment-plan flow, (b) admin had to navigate three pages to: assign package, assign classroom, create vades, attach payer parent; (c) no admin enrollment list view |

## §2 D2 — Data model decision

**No schema change required.** The existing trio is sufficient:

* `StudentPackageEnrollment` — canonical enrollment row.
* `PaymentScheduleItem` — payment plan items, linked back to
  `(studentId, packageId)` for joinless lookup.
* `OdkUserAccessTag` — per-user ODK grants.

Heuristic linking between an enrollment and its payment-plan items: query
items by `(studentId, packageId)` (the enrollment carries both). We do
**not** introduce an `enrollmentId` FK on `PaymentScheduleItem` because:
(a) parent-finance code already groups by student+package, (b) FK would
require a migration that breaks Phase 2 / Session 10 invariants, (c) the
list page does the join client-side at acceptable cost (≤200 rows).

## §3 D3 — Enrollment helper module

`lib/panel/enrollment.ts` (new). Exports:

* `getEnrollmentOptions()` — active packages + classrooms + ODK access tags
* `getStudentEnrollmentState(studentId)` — full snapshot (active rows,
  parent count, classroom count, pending/overdue PaymentScheduleItem counts)
* `getStudentActiveEnrollments(studentId)`
* `getAvailablePackagesForEnrollment(studentId)` — flags packages that
  already have an active enrollment for this student
* `getRecommendedPayerParents(studentId)` — student-linked parents only,
  sorted primary-first, with `hasUserAccount` flag
* `calculatePaymentPlanPreview(plan, packageName)` — pure; supports
  NONE / ONE_TIME / INSTALLMENTS; remainder allocated to the LAST
  installment so the visible sum equals total exactly
* `getPaymentPlanSummary(items)`
* `createStudentEnrollmentWithPaymentPlan(input)` — atomic mutation
* `getEnrollmentStatusLabel(s)` / `getEnrollmentStatusTone(s)` — uses
  Badge `Tone` union (`accent | ok | warn | bad | purple | teal | neutral`)

Rules enforced in `createStudentEnrollmentWithPaymentPlan`:

* Student + package existence checked.
* Selected payer parent must be linked to the student (FK check).
* Payment plan amounts must be > 0; due dates must parse.
* PaymentScheduleItem rows always start at status=PENDING.
* OVERDUE remains derived (read-time, not stored).
* No AccountingEntry rows are written at create time — collection is a
  separate admin action (`markPaymentScheduleItemPaidAction`).
* ODK tags only granted if `student.userId` exists; missing-account
  emits a warning, not an error.
* Identical-active-package soft-warn (admin override allowed) — does not
  block create because legitimate "second batch" / "renewed" cases exist.

## §4 D4 — Enrollment wizard

* Route: `/panel/admin/kayitlar/yeni`
* Server shell: pre-loads snapshot if `?student=…` query is supplied.
* Sections (6): **Öğrenci** · **Paket** · **Sınıf ve erişim** · **Ödeyici
  veli** · **Ödeme planı** · **Önizleme**.
* Live preview table for installment plans (recomputes on every keystroke).
* Submit returns a `ResultPanel` with cross-links: student 360,
  finance tab, vadeler list, "yeni kayıt".

## §5 D5 — Student detail integration

Added compact "+ Kayıt / Paket" button on the Student 360 right-side
action cluster (next to "Düzenle"). Linking convention:
`/panel/admin/kayitlar/yeni?student={id}` so the wizard pre-loads the
snapshot. The existing finance tab already renders enrollments and
schedule items — no changes to its output were needed.

## §6 D6 — Parent detail integration

The existing parent detail cockpit (Session 3) already surfaces linked
children's `paymentScheduleItem` aggregates via `parent-finance.ts`. No
duplicate widget added in Session 5; the wizard cross-links to
`/panel/veli/odemeler` and `/panel/admin/veliler/{id}/duzenle` so the
parent flow remains the canonical destination for finance reads.

## §7 D7 — Admin enrollment list

* Route: `/panel/admin/kayitlar`
* Filters: `q` (student/package), `status`, `source`, `plan` (yes/no).
* Each row shows: student · package (+ COURSE/EXAM) · status badge ·
  source · startsAt · payment-plan summary (count + total + pending count) ·
  list price.
* Plan summary is computed by joining
  `paymentScheduleItem.findMany({ OR: [(studentId, packageId)…] })` once
  per page — single round-trip, ≤200 rows scope.

## §8 D8 — Safeguards

| Concern                          | Behaviour                                        |
|----------------------------------|--------------------------------------------------|
| Student already has active row for the same package | Soft-warn in wizard "Önizleme"; submit allowed (admin override). |
| Student has 0 linked parents     | Warning + CTA "Veli bağla →" inside the payer section. |
| ODK tags but no `student.userId` | Warning surfaced both pre-submit and in result panel; tags simply not granted. |
| Plan amount ≤ 0                  | **Hard block** — wizard disables "Kaydı oluştur"; server action also rejects. |
| Plan due date invalid            | Hard block server-side. |
| Payer parent not linked to student | Hard block server-side (FK lookup). |
| Identical-active package         | Soft-warn (allowed, e.g. renewals). |
| Plan kind = INSTALLMENTS         | Min 2, max 36 installments enforced. |

## §9 D9 — Audit + notifications

| Event                                   | Audit action                            | Notification |
|-----------------------------------------|-----------------------------------------|--------------|
| Enrollment created                      | `ENROLLMENT_CREATE`                     | admin inbox  |
| Classroom assigned via wizard           | `STUDENT_CLASSROOM_ASSIGN` (source=enrollment-wizard) | — |
| ODK access tag batch grant              | `ODK_ACCESS_TAG_GRANT_BATCH`            | —            |
| Payment plan rows created (1..N items)  | `PAYMENT_SCHEDULE_CREATE_BATCH`         | payer parent inbox |
| Enrollment status update (post-create)  | `ENROLLMENT_STATUS_UPDATE`              | —            |

Notifications are intentionally minimal — admins use the audit feed for
operational visibility.

## §10 D10 — Files touched

* `lib/panel/enrollment.ts` — NEW (~520 lines).
* `app/panel/admin/kayitlar/_actions.ts` — NEW (server action + lifecycle).
* `app/panel/admin/kayitlar/yeni/page.tsx` — NEW server shell.
* `app/panel/admin/kayitlar/page.tsx` — NEW list page.
* `components/panel/enrollment/enrollment-create-wizard.tsx` — NEW client wizard.
* `app/panel/admin/ogrenciler/[id]/page.tsx` — added "+ Kayıt / Paket" CTA on the right rail.
* `docs/phase-3-operational-crud-audit.md` — this section.
* `docs/manual-smoke-checklist.md` — Session 5 smoke cases (15).

## §11 Out of scope (deferred)

* External payment provider integration (PayTR callback wiring) — Phase 4.
* Invoice / PDF generation.
* AccountingEntry write-on-collection — already handled by the existing
  `markPaymentScheduleItemPaidAction`; not duplicated.
* Cron-based OVERDUE flip — remains derived, by design.
* Per-row student / parent / OD-ODK toggle inside the wizard preview
  table — UI already shows the row list; finer edits happen in
  `/panel/admin/odemeler/vadeler`.
* Adding `enrollmentId` FK on `PaymentScheduleItem` — would require a
  migration that touches Phase 2 invariants. Re-evaluate in Phase 4.
* Bulk enrollment / CSV import.

## §12 Verification gates (must hold)

* `npx tsc --noEmit` → 0 errors. ✓
* `npx eslint app/panel/admin/kayitlar components/panel/enrollment lib/panel/enrollment.ts` → exit 0. ✓
* No `prisma migrate` required.
* Build: routes are `force-dynamic`; no static-generation impact.


---

# Session 6 — Enrollment detail / Package management / Status lifecycle (2026-06)

> Created: 2026-06 (Phase 3 / Session 6).
> Status: shipped (D1–D10). **No new schema** — operates on
> `StudentPackageEnrollment` + `PaymentScheduleItem` + `OdkUserAccessTag`.

## §1 Goals

Open an existing enrollment and manage its lifecycle safely without
touching financial state. Status changes never modify
`PaymentScheduleItem` or `AccountingEntry`. No payment provider
integration; no auto-mark paid; no auto-refund.

## §2 D1 — Enrollment detail route

* Route: `/panel/admin/kayitlar/[id]`.
* Header: breadcrumb "Yönetim › Kayıtlar › {student} · {package}",
  status badge, quick links: Öğrenci 360, Vadeler, Veli detayı (primary
  parent), Paket.
* KPI strip: Liste fiyatı, İndirim, Net, Plan toplamı (+ satır sayısı),
  Tahsil edilen (+ bekleyen sayısı), Gecikmiş.
* Warnings panel ("Dikkat") covers: no parent linked, no payment plan,
  overdue rows, cancelled status, inactive package, missing user account
  (ODK), missing classroom assignment.

## §3 D2 — Lifecycle actions

`app/panel/admin/kayitlar/_actions.ts` extended with:

* `updateEnrollmentStatusAction(id, fd)` — guarded by an explicit
  transition matrix (ACTIVE/TRIAL/LEAD/PAUSED/COMPLETED/CANCELLED).
  Same-status submits are no-ops.
* `updateEnrollmentDatesAction(id, fd)` — validates that endsAt ≥ startsAt.
* `updateEnrollmentNoteAction(id, fd)` — billingPeriodLabel + notes.
* Sugar wrappers: `pauseEnrollmentAction`, `resumeEnrollmentAction`,
  `completeEnrollmentAction`, `cancelEnrollmentAction`.
* All actions: `requirePanelRole("admin")`, `logAudit`,
  `revalidatePath` on the detail + list + student 360.

Allowed transitions:

| from        | allowed to                            |
|-------------|---------------------------------------|
| ACTIVE      | PAUSED, COMPLETED, CANCELLED          |
| TRIAL       | ACTIVE, PAUSED, CANCELLED             |
| LEAD        | ACTIVE, TRIAL, CANCELLED              |
| PAUSED      | ACTIVE, COMPLETED, CANCELLED          |
| COMPLETED   | ACTIVE (re-open with audit, override) |
| CANCELLED   | ACTIVE (re-open with audit, override) |

Audit actions: `ENROLLMENT_STATUS_UPDATE`, `ENROLLMENT_DATES_UPDATE`,
`ENROLLMENT_NOTE_UPDATE` (entityType=`StudentPackageEnrollment`).

A small client component
`components/panel/enrollment/enrollment-transition-button.tsx` wraps
each transition with `confirm()` and `useTransition()`.

## §4 D3 — Payment plan section

Joins `paymentScheduleItem.findMany({ studentId, packageId })` —
the same Session 5 heuristic. Rows show title · vade · tutar · tahsil ·
durum (with derived OVERDUE) · ödeyici (link to parent detail).
A header link goes to `/panel/admin/odemeler/vadeler?q={student}`.

We deliberately do **not** expose mark-paid here — the canonical action
lives in `app/panel/admin/odemeler/_actions.ts` and we link to that
surface to avoid duplicating financial mutation paths.

## §5 D4 — Payer / parent section

The payer is **inferred** from PaymentScheduleItem rows: if all rows
share the same `parentId`, that parent is shown as "Ödeyici, ödeme planı
satırlarından okundu". Multiple distinct payers → ambiguous notice. No
payer field is invented on the enrollment row itself (no schema
change).

The full linked-parent table renders independently with account-status
badges, relationship type, and an "Aç →" link to the parent cockpit.

## §6 D5 — Classroom / ODK section

* Classroom: list of active `ClassroomStudent` rows linking to
  classroom edit pages.
* ODK: shows non-revoked `OdkUserAccessTag` titles as purple badges.
  If the student has no `userId`, an honest empty card is shown.
* Link to `/panel/admin/odk/ogrenciler/{userId}` for richer ODK ops.
* No mutation surface here — adding/removing tags lives in the wizard
  and in the existing ODK admin pages.

## §7 D6 — Audit / activity section

Last 30 rows joining three `entityType` scopes:
`StudentPackageEnrollment`, `PaymentScheduleItem` (id=enrollmentId for
batch creates from Session 5), and `OdkUserAccessTag` (id=enrollmentId
for batch grants from Session 5). Limitation: payment-schedule edits
done via `/panel/admin/odemeler/vadeler` log against
`entityType=PaymentScheduleItem` with `entityId=item.id`, so they will
not appear here — admin should use the global audit page for those
events. Documented in the page subtitle.

## §8 D7 — Enrollment list integration

`/panel/admin/kayitlar` row action changed from "Aç →" (student finance
tab) to "Detay →" → `/panel/admin/kayitlar/{id}`. Filters preserved.

## §9 D8 — Student 360 integration

`StudentFinanceTab` (in `student-360-tabs.tsx`) now adds a "Detay →"
link column on each enrollment row pointing at the new detail page. The
existing "+ Kayıt / Paket" CTA on the right rail (Session 5) continues
to deep-link with `?student={id}`.

## §10 D9 — Files touched

* `app/panel/admin/kayitlar/_actions.ts` — extended (transition matrix,
  dates/notes actions, sugar wrappers).
* `app/panel/admin/kayitlar/[id]/page.tsx` — NEW detail page.
* `app/panel/admin/kayitlar/page.tsx` — list "Detay →" link.
* `components/panel/enrollment/enrollment-transition-button.tsx` — NEW.
* `components/panel/students/student-360-tabs.tsx` — added "Detay →"
  link column to finance tab.
* `docs/phase-3-operational-crud-audit.md` — this section.
* `docs/manual-smoke-checklist.md` — Session 6 smoke cases.

## §11 Out of scope (deferred)

* Mark-paid / partial / cancel actions on PaymentScheduleItem from the
  detail page — we deep-link to the existing admin surface instead.
* `enrollmentId` FK on `PaymentScheduleItem` — still not added.
* Bulk transitions / multi-select on the list page.
* Cross-enrollment ODK tag editing.
* Re-open warning copy on COMPLETED/CANCELLED → ACTIVE — currently a
  plain confirm() prompt.

## §12 Verification gates

* `npx tsc --noEmit` → 0 errors. ✓
* `npx eslint app/panel/admin/kayitlar components/panel/enrollment
  components/panel/students/student-360-tabs.tsx` → exit 0. ✓
* No prisma migration. No build-shape change.

---

# Session 7 — Classroom / Course Operational Management

> Created: Phase 3 / Session 7. Build on Sessions 1-6 onboarding & enrollment
> work. Goal: make `/panel/admin/siniflar` an operational surface, not just
> a CRUD list.

## §0 Audit — pre-Session 7 state

* `/panel/admin/siniflar` page → only `q` filter, 6-column flat table, no
  saved views, no operational filters.
* `_actions.ts` → 7 actions (`createClassroomAction`,
  `updateClassroomAction`, `deleteClassroomAction`,
  `addStudentToClassroomAction`, `removeStudentFromClassroomAction`,
  `addTeacherToClassroomAction`, `removeTeacherFromClassroomAction`). All
  admin-gated via `requirePanelRole("admin")`. **Only delete was audited.**
  Composite-PK `upsert` already idempotent for assign actions.
* `[id]/page.tsx` → previously a thin overview (students/teachers/lessons/
  assignments tables). Now replaced by a full cockpit.
* `[id]/duzenle/page.tsx` → had inline assign forms (kept; cockpit deep-links
  to it via `#ogretmen` / `#ogrenci` anchors).
* `yeni/page.tsx` → simple form with `ToastForm`. Kept; duplicate-name
  guard now lives in the action layer (composite-unique on
  `(name, branch)` already exists).
* No prior schema dependency missing. `Classroom` already has `capacity`,
  `isActive`, `level`, `branch`, `description`. `ClassroomStudent` has
  composite PK `(classroomId, studentId)` and `joinedAt`/`leftAt`.
  `ClassroomTeacher` has `(classroomId, teacherId)` plus `isLead` and
  `subject`.

## §1 Deliverables

### D1 — Audit (this section).

### D2 — List rewrite (`app/panel/admin/siniflar/page.tsx`)
* URL filters: `q, level, active, teacher, student, capacity, upcoming,
  homework, material`.
* In-memory `capacity` filter (`students.length >= capacity`) since Prisma
  cannot express that without raw SQL.
* `SavedViewsBar scope="classrooms"` with 8 presets:
  - Tüm sınıflar
  - Aktif sınıflar
  - Öğretmensiz
  - Öğrencisiz
  - Yakında dersi olanlar
  - Aktif ödevli
  - Materyali olmayanlar
  - Dolu sınıflar
* `QuickFilters` row for level / active / teacher / student / capacity /
  upcoming.
* Table now shows: **Sınıf (linked to detail), Şube, Seviye, Öğrenci (n/cap
  with red if full), Öğretmen (warn badge if 0), 14g ders (info badge if
  any), Aktif ödev, Materyal, Durum, Detay/Düzenle**.

### D3 — Wizard / create
* No structural change to `yeni/page.tsx` — duplicate (name, branch) is
  caught **at the action layer** with a Turkish error before Prisma
  surfaces P2002. Existing `@@unique([name, branch])` enforced.
* `bulkAssignStudentsToClassroomAction(classroomId, fd)` exposed for
  future bulk-from-list flow (called via `studentIds` multi-getAll). Uses
  `createMany skipDuplicates: true` and audits the batch with
  `CLASSROOM_STUDENT_ASSIGN_BATCH` action incl. skipped IDs.

### D4 — Detail cockpit (`[id]/page.tsx`)
Server component, 9 sections:
1. **Header** — title, level/branch as subtitle, badges in `meta`
   (Aktif/Pasif, Öğretmensiz, Dolu), action toolbar (Liste, Düzenle/Atama,
   Öğretmen kokpiti `/panel/ogretmen/siniflarim/{id}`, + Ders planla,
   Ödevler).
2. **KPI strip** — 4 cards: Öğrenci (n/cap), Öğretmen, 14g Ders, Aktif Ödev.
3. **Öğretmenler** — table: Ad / Branş / Ders / Lead / Hesap badge / Profil
   link. Header has `+ Ata` deep-link to `duzenle#ogretmen`.
4. **Öğrenciler** — table: Ad / Sınıf / Veli badge / Hesap badge / Katıldı /
   Profil link. Header has `+ Ata` deep-link.
5. **Yaklaşan dersler (14 gün)** — table from `prisma.lesson.findMany`
   ordered ascending. Status badge tone follows
   `COMPLETED→ok / CANCELLED→bad / else→teal`.
6. **Aktif ödevler** — `Assignment.status = PUBLISHED` + submission count.
7. **Materyaller** — non-archived materials with publish badge.
8. **Devam (son 30 gün)** — `prisma.attendance.groupBy` per status with
   PRESENT/ABSENT/LATE/EXCUSED/TOPLAM mini-cards.
9. **Bağlı kurslar** — `defaultForCourses` link list.
10. **Son işlemler** — last 15 audit rows for `Classroom`,
    `ClassroomStudent` and `ClassroomTeacher` whose `entityId` starts with
    the classroom id (composite IDs use `${classroomId}:${otherId}` form).

### D5 / D6 — Audit + idempotency
All 7 actions now call `logAudit`:
* `CLASSROOM_CREATE / CLASSROOM_UPDATE / CLASSROOM_DELETE` — entity-level.
* `CLASSROOM_STUDENT_ASSIGN / CLASSROOM_STUDENT_REMOVE /
  CLASSROOM_STUDENT_ASSIGN_BATCH` — entityId is `classroomId:studentId`
  (or just `classroomId` for the batch).
* `CLASSROOM_TEACHER_ASSIGN / CLASSROOM_TEACHER_UPDATE /
  CLASSROOM_TEACHER_REMOVE` — entityId is `classroomId:teacherId`.
* Assign actions remain idempotent — they `findUnique` first and only
  audit when truly creating a new row. Re-submitting an already-assigned
  pair is silent.
* `revalidatePath` fan-out now hits **detail page**, **edit page** and
  the related student/teacher edit page.

### D7 — Inline assignment panels
Already present on `[id]/duzenle`. Detail cockpit cross-links to those
panels with hash anchors so admins land on the right form.

### D8 — Cross-link to teacher cockpit
Detail page header has an `"Öğretmen kokpiti →"` button to
`/panel/ogretmen/siniflarim/{classroomId}` (which the route owns —
unchanged in this session).

### D9 — Smoke checklist (15 cases)

Run as a panel admin against any non-trivial classroom. Each line is one
test; tick when the page does what's described.

1. List loads with no filters → all classrooms ordered active-first then
   by name.
2. Type a partial name in the search box → list filters live (q).
3. Click `QuickFilters → Seviye → TYT` → only TYT rows remain; other
   filters retained.
4. Click `QuickFilters → Öğretmen → Yok` → list narrows to classrooms
   with zero ClassroomTeacher rows.
5. Open `Saved views → Yakında dersi olanlar` → URL gets `upcoming=yes`
   and list narrows to classrooms with ≥1 lesson in the next 14 days.
6. Open `Saved views → Dolu sınıflar` → in-memory filter correctly hides
   classrooms with `students.length < capacity`.
7. Click a classroom row → detail cockpit loads with KPI strip and
   `Aktif/Pasif` + `Öğretmensiz`/`Dolu` warning badges where relevant.
8. From the cockpit, click `+ Ata` next to Öğretmenler → lands on
   `/duzenle#ogretmen`.
9. Assign a teacher from the duzenle page → audit row appears under
   "Son işlemler" with action `CLASSROOM_TEACHER_ASSIGN` and your name.
10. Re-submit the *same* teacher with `isLead` toggled → audit row this
    time is `CLASSROOM_TEACHER_UPDATE` (not a duplicate ASSIGN).
11. Try to create a new classroom with a (name, branch) that already
    exists → form rejects with the Turkish duplicate message; no row
    created.
12. Edit a classroom and change `(name, branch)` to collide with another
    row → same friendly rejection.
13. Add an existing student to a classroom twice from `duzenle` → second
    submit is silent (no audit row), `Roster` count unchanged.
14. Delete a classroom that has lessons → `Classroom.delete` cascades
    `ClassroomStudent`/`ClassroomTeacher` (per `onDelete: Cascade`),
    Lessons are kept but `classroomId` is set to NULL (`onDelete:
    SetNull`). Audit row `CLASSROOM_DELETE` created. List page shows it
    gone.
15. Click `Öğretmen kokpiti →` from detail → lands on
    `/panel/ogretmen/siniflarim/{id}` — the existing teacher cockpit
    page renders with the same classroom (route unchanged in this
    session).

### D10 — Verification gates
* `npx tsc --noEmit` → 0 errors. ✓
* `npx eslint app/panel/admin/siniflar` → exit 0. ✓
* No prisma migration. No schema change. No drift in build shape.

## §2 Out of scope (deferred)

* Bulk-assign students drawer on the list page (action exists but no UI
  yet — tracked for Session 8).
* Transferring students between classrooms with reason note.
* Schedule conflict warnings on lesson planning (handled in lesson
  scheduler, not classroom cockpit).
* Capacity-exceed soft-block on assign (currently capacity is a soft
  hint; admins can over-assign with a warning badge).
* Course-level material gallery on the cockpit (defer to Session 9
  course operations).

## §3 Files touched in Session 7

* `app/panel/admin/siniflar/page.tsx` — full rewrite (filters + saved
  views + new columns).
* `app/panel/admin/siniflar/_actions.ts` — full rewrite (audit on every
  action, dup-name guard, bulk-assign action).
* `app/panel/admin/siniflar/[id]/page.tsx` — full rewrite (operational
  cockpit replacing the thin pre-existing detail).
* `app/panel/admin/siniflar/[id]/duzenle/page.tsx` — unchanged (still
  hosts the inline assign forms; cockpit deep-links via hash).
* `app/panel/admin/siniflar/yeni/page.tsx` — unchanged (action-layer
  duplicate guard is sufficient).
* `docs/phase-3-operational-crud-audit.md` — this section appended.

---

## Session 8 — Bulk Actions / Import / Export Operations

### Audit (D1)

The pre-existing infrastructure already covered most of the heavy lifting:

* `components/panel/ui/smart-table.tsx` exports a complete uncontrolled bulk
  selection primitive set: `BulkProvider`, `BulkRowCheckbox`,
  `BulkAllCheckbox`, `BulkBar`, `useBulk`. No new selection primitive was
  required — only wiring per list page.
* `lib/panel/account-onboarding.ts` already exposes idempotent single-row
  helpers (`regenerateUserInvite`, `revokeUserInvite`, `disableUserAccount`,
  `enableUserAccount`, `forceUserPasswordChange`) that audit + notify.
  Bulk wrappers reuse these directly so per-target audit rows are preserved.
* `app/api/panel/export/[entity]/route.ts` already produced XLSX exports
  with a `?q=` filter for students/teachers/parents/classrooms/packages/
  assignments/payments/accounting/all-ODK-entities. Session 8 only added a
  `?ids=…` parameter for selected-row exports — no new endpoint.
* The classroom bulk-assign action shipped in Session 7
  (`app/panel/admin/siniflar/_actions.ts → bulkAssignStudentsToClassroomAction`)
  is admin-only, idempotent (`createMany skipDuplicates`) and audited
  (`CLASSROOM_STUDENT_ASSIGN_BATCH`). Session 8 surfaces this same flow from
  the **student list** instead of duplicating it on the classroom detail
  page (which the user has been heavily customizing post-Session 7).

### Operations matrix

| Entity      | Generate invite | Force-pw | Disable | Enable | Classroom assign | Access tag | Export selected | Notes |
|-------------|:---------------:|:--------:|:-------:|:------:|:----------------:|:----------:|:----------------:|-------|
| Student     | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (ODK) | ✓ | full set |
| Parent      | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | no classroom/tag |
| Teacher     | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | classroom + comp rule deferred per spec |

**Forbidden / deferred (by design):**

* No bulk delete on any entity — operational disable only.
* No bulk financial mutation (no payroll, no AccountingEntry writes,
  no payment status changes).
* No raw password issuance in bulk — `forceUserPasswordChange` only flips
  `mustChangePassword` so users rotate themselves on next login.
* No bulk teacher-classroom assignment (single-row only) — payroll/comp
  side-effects too risky at scale.
* Server-side import is deferred. Session 8 ships **header-only CSV
  templates** (`/api/panel/import-templates/<entity>`) so admins can
  prepare data; the actual import will be a future session with
  duplicate detection + dry-run preview.

### Architecture (D2)

`lib/panel/bulk-operations.ts` is the single server-only entry point.

* Stable result shape:
  `{ ok, op, attempted, succeeded, skipped, failed, errors[], warnings[], data? }`.
* `normalizeSelectedIds(input)` accepts FormData / string / string[]
  and dedupes + caps at `BULK_MAX_IDS = 500`. The list bulk-bar surfaces a
  warning entry when truncation occurs.
* `runPerId(...)` is the per-target loop with consistent skipped/failed
  accounting; thrown errors never crash the batch.
* `auditBulkOperation(...)` writes a single batch-summary row into
  `AuditLog` with `{ attempted, succeeded, skipped, failed, ids,
  errors, warnings }` payload. Per-target audit rows continue to be
  written by the underlying single-row helpers.
* Sensitive output never persists: invite URLs are returned to the admin in
  the `data.invites[]` array exactly once via `<BulkOperationResultPanel>`
  (an HTML `<details>` textarea). The route stores no out-of-band copy of
  generated tokens.

### Files added

* `lib/panel/bulk-operations.ts` — generic toolkit + 7 student / 5 parent /
  5 teacher bulk operation functions.
* `app/panel/admin/ogrenciler/_bulk-actions.ts` — student server actions.
* `app/panel/admin/veliler/_bulk-actions.ts` — parent server actions.
* `app/panel/admin/ogretmenler/_bulk-actions.ts` — teacher server actions.
* `components/panel/bulk/bulk-result.tsx` — D9 result panel.
* `components/panel/bulk/student-bulk-actions.tsx` — student bulk bar.
* `components/panel/bulk/parent-bulk-actions.tsx` — parent bulk bar.
* `components/panel/bulk/teacher-bulk-actions.tsx` — teacher bulk bar.
* `app/api/panel/import-templates/[entity]/route.ts` — D8 CSV templates
  (UTF-8 + BOM, RFC 4180 quoting).

### Files modified

* `app/panel/admin/ogrenciler/page.tsx` — wrapped table in `BulkProvider`,
  added selection column + `BulkBar` + template download link, fetched
  `bulkClassrooms` & `bulkAccessTags` for the bulk bar.
* `app/panel/admin/veliler/page.tsx` — same wrapping + checkbox column +
  `ParentBulkActions` bar + template download.
* `app/panel/admin/ogretmenler/page.tsx` — same wrapping + checkbox column +
  `TeacherBulkActions` bar + template download.
* `app/api/panel/export/[entity]/route.ts` — accepts `?ids=` (≤1000) for
  selected-row export, retained on student/teacher/parent branches.

### Tests

* `npx tsc --noEmit` → clean.
* `npx eslint <new+modified files>` → clean.

---

## Session 9 — Course / Subject / Curriculum Operational Management

### Audit (D1)

**Existing surface (pre-session)**
- `app/panel/admin/dersler/page.tsx` — minimal list with only `q` filter, no saved views, no operational badges (default classroom / teacher / upcoming / homework / material counts not surfaced).
- `app/panel/admin/dersler/[id]/page.tsx` — minimal detail page (no KPIs, no upcoming lessons, no homework/material tie-in, no audit trail surfacing).
- `app/panel/admin/dersler/yeni/page.tsx` — basic create form, no duplicate guard.
- `app/panel/admin/dersler/[id]/duzenle/page.tsx` — edit form + single toggle button (active/passive), delete soft/hard but **no audit** on toggle path.
- `app/panel/admin/dersler/_actions.ts` — `createCourseAction`, `updateCourseAction`, `toggleCourseActiveAction`, `deleteCourseAction`. Audit only on delete; no diff on update; no duplicate guard.

**Schema reality**
- `Course` is rich: `subject` (required, non-null), `examType?`, `levelLabel?`, `estimatedMinutes?`, `status: CourseStatus { DRAFT | PUBLISHED | ARCHIVED }`, `isActive: Boolean`, `defaultTeacherId?`, `defaultClassroomId?`. Indexed on `(status, subject)`, `(defaultTeacherId)`, `(defaultClassroomId)`, `(isActive)`.
- `Lesson.courseId` is **nullable** FK → not every lesson is bound to a course.
- `Material.courseId` is **nullable** FK; has `isPublished` + `isArchived`. Materials cockpit must filter by both.
- `Assignment` has **NO `courseId` FK**. Only a free-text `subject` column. → All "homework for this course" surfaces must match by `course.subject === assignment.subject` (case-sensitive equality, plus `status: PUBLISHED` for "active" counts).
- `PackageCourse` join → drives "in package" count.
- `StudentCourseProgress` → indirect signal of student impact; we also derive impact via distinct `Lesson.studentId` for the cockpit KPI ("etkilenen öğrenci").
- `ClassroomTeacher` → enables surfacing the teacher pool for the default classroom on the cockpit.

**Risks identified**
1. Duplicate course definitions: nothing prevented two courses with same `(title, subject)`, even though they're operationally indistinguishable to teachers.
2. "Orphan" courses with no default classroom and no default teacher silently survive in the catalog; planning UX has to fill those in every time.
3. No surface for operational health of a course (active homework, active materials, upcoming lessons) — admins cannot tell which courses are dormant vs alive.
4. No audit trail for active/passive toggles or updates.
5. `Assignment.subject` is a free-text join. Renaming a course's subject does **not** rebind assignments. Treated as a known limitation; cockpit text says "Konu eşleşmesi: <subject>" so admins know it is a string match.

### Files modified / added (D2–D8)

- `app/panel/admin/dersler/_actions.ts` — full rewrite. Adds `createCourseAction` (duplicate guard via case-insensitive `findFirst` on `(title, subject)`, override with `allowDuplicate=1`; default-classroom / default-teacher existence check; full audit `COURSE_CREATE`), `updateCourseAction` (same duplicate guard scoped to `id != current`; before/after diff payload audited as `COURSE_UPDATE`), `archiveCourseAction` (sets `isActive=false, status=ARCHIVED`; audit `COURSE_ARCHIVE`), `reactivateCourseAction` (sets `isActive=true, status=PUBLISHED`; audit `COURSE_REACTIVATE`), `toggleCourseActiveAction` kept as compat alias delegating to archive/reactivate, `deleteCourseAction` (soft-archives when bound to lessons / packages / modules / progress / materials, hard-deletes only when zero usage; both paths audited).
- `app/panel/admin/dersler/page.tsx` — operational list. URL filters: `q, status, active, subject, examType, hasClassroom, hasTeacher, hasUpcomingLesson, hasMaterial, hasHomework`. Saved views via `<SavedViewsBar scope="courses">` with 8 presets (Tümü / Aktif yayınlar / Taslak / Pasif-Arşiv / Sınıfsız / Öğretmensiz / Materyalsiz / Ödevsiz). `<QuickFilters>` strip per dimension. Aggregates via `prisma.lesson.groupBy(by: courseId)` for upcoming + `prisma.assignment.groupBy(by: subject)` for homework. Table columns: Ders / Branş / Yayın / Default sınıf / Default öğretmen / Ders count / Yakın / Ödev / Materyal / actions (Detay, Düzenle, Program). EmptyState wired.
- `app/panel/admin/dersler/[id]/page.tsx` — operational cockpit (D4). Header with `meta` slot (subject/exam/level/status badges) and right-side action strip (← Listeye / + Ders planla / + Ödev oluştur / + Materyal ekle / Düzenle). 6-tile KPI row (Toplam ders / Yakın 14 gün / Aktif ödev / Materyal / Pakette / Etkilenen öğrenci). Two-column body: left → upcoming-14-days lesson table + recent assignments table (subject match) + recent materials table; right → defaults panel with operational warning callout (sınıf yok / öğretmen yok), classroom-teachers list (when default classroom exists), packages list with enrollment counts, last-10 audit rows.
- `app/panel/admin/dersler/yeni/page.tsx` — create form gains hidden `allowDuplicate=1` checkbox + `name="isActive"` checkbox now drives a true/false toggle (server reads `fd.get("isActive") !== null`).
- `app/panel/admin/dersler/[id]/duzenle/page.tsx` — danger zone refactored: explicit Archive button when active vs explicit Reactivate button when inactive (replacing single toggle). Adds `allowDuplicate=1` checkbox. Imports updated to use new actions.

### Cross-links verified (D6)

- `app/panel/admin/siniflar/[id]/page.tsx` already links to `/panel/admin/dersler/${courseId}` for default-classroom-bound courses. Confirmed unchanged.
- `app/panel/admin/ders-programi/[id]/page.tsx` already exposes `courseId → /panel/admin/dersler/${courseId}` link. Confirmed unchanged.
- New cockpit links out to: `/panel/admin/siniflar/{id}`, `/panel/admin/ogretmenler/{id}/duzenle`, `/panel/admin/odevler/{id}/duzenle`, `/panel/admin/ders-programi/{id}`, `/panel/admin/ders-programi/yeni?courseId=…&teacherId=…&classroomId=…`, `/panel/admin/odevler/yeni?subject=<course.subject>`, `/panel/ogretmen/materyaller/yeni?courseId=…` (admin-side material create route does not exist yet — explicitly using teacher route as the documented out-link).

### Verification (D10)

- `npx tsc --noEmit` → clean.
- `npx eslint 'app/panel/admin/dersler/**/*.{ts,tsx}'` → exit 0, 0 warnings.

---

## Session 10 — Safe Import Wizard / Dry-Run Validation

### Goal

Add admin-only CSV import for **students / parents / teachers** with mandatory
dry-run preview, server-side re-validation on commit, and full AuditLog trail.
Conservative by default: ERROR rows never written, WARNING rows only with
explicit checkbox, SKIPPED rows (idempotent re-run) never written.

### Scope (in)

- New module `lib/panel/imports.ts` — pure CSV parser + per-entity validators
  + commit functions. Server-only.
- New route `app/panel/admin/import` — single page; entity selector via
  `?entity=students|parents|teachers`. Client wizard with phases:
  `select → uploaded → validated → committed`.
- Server actions in `app/panel/admin/import/_actions.ts`:
  `dryRunImportAction`, `commitImportAction`. Both gated by
  `requirePanelRole("admin")` and audited.
- Sidebar entry "İçe Aktar" added to admin Sistem group.

### Scope (deferred / out)

- **XLSX support** — CSV only for now. XLSX requires a parser dependency;
  defer until a clear admin demand surfaces.
- **`tempPassword` account mode** — explicitly rejected with row-level error
  in import. Bulk one-time-password generation is not safe over CSV.
- **Parent ↔ student linking** — supported only when **CSV row already
  carries a child's email or normalized phone matching an existing
  Student**. We do NOT auto-create children or guess relationships.
- **Classroom assignment** — student rows can carry a "Sınıf" name; we
  only resolve when the name uniquely matches an active Classroom.
  Otherwise → WARNING, no link.
- **Package / enrollment / discount / coupon import** — out of scope.
- **Email / SMS notifications** — import path NEVER triggers transactional
  emails or SMS. Invite mode does write a `userInviteToken` and sets
  `userInviteSentAt = now()` (so the invite URL is admin-distributable),
  but we do NOT call any send-mail helper.

### Templates (no schema changes)

We reuse the existing template route at
`/api/panel/import-templates/[entity]` (UTF-8 BOM + CRLF + always-quoted
cells). The header set in `getImportTemplateColumns(entity)` mirrors that
route plus an optional **"Hesap Modu"** column (`none|invite|disabled`,
default `none`) and, for parents, optional **"Çocuk Email"** /
**"Çocuk Telefon"** columns.

| Entity | Required headers | Notes |
|---|---|---|
| students | Ad Soyad, Telefon | Student.phoneKey is `@unique` and required. Email optional but required for `accountMode != none`. |
| parents | Ad Soyad | Telefon **veya** Email. Both unique on Parent. |
| teachers | Ad Soyad, Email, Branş | Teacher.email `@unique`. |

### Row status taxonomy

```
ImportRowStatus = "READY" | "WARNING" | "ERROR" | "SKIPPED_DUPLICATE"
```

- `ERROR` — schema-required field missing / invalid format / in-batch
  duplicate / `User.email` collision when account mode is invite/disabled.
  Never committed.
- `WARNING` — entity-level near-duplicate (existing student/parent/teacher
  matched by phone or fullName), unrecognised classroom name, unknown
  relationship code, etc. Committed only with the **"Uyarılı satırları
  da içe aktar"** toggle.
- `SKIPPED_DUPLICATE` — the canonical unique key (Student.phoneKey,
  Parent.phoneKey/email, Teacher.email) **already** exists. Idempotent
  re-runs land here; never committed.
- `READY` — clean. Always committed.

### Dry-run vs Commit

- Dry-run: pure read; calls `findStudentDuplicates / findParentDuplicates /
  findTeacherDuplicates`; logs `IMPORT_DRY_RUN` with summary counts.
- Commit: **re-runs dry-run server-side** from the original CSV string and
  ignores the client-side classification entirely. For each commitable row
  we additionally do a last-mile `findUnique` guard on the relevant unique
  index, so a parallel admin who created a row 5 seconds ago can't be
  clobbered. Logs `IMPORT_COMMIT` with summary + per-row created entity
  ids and per-row failure messages.

### Transaction boundaries

Each row is an independent best-effort write (no giant transaction). A row
that fails halfway through (e.g. Student created, then User create throws)
falls back to a row-level error message. We document this in the spec
docstring for `commitImport`. Future hardening: wrap each row in
`prisma.$transaction([...])` once the create paths are atomic candidates.

### Hard caps

- `MAX_IMPORT_ROWS = 500` — reject CSV with more rows up front.
- `5MB` file size cap on the client.
- Comment rows starting with `#` and fully blank rows are skipped silently.

### Audit actions

- `IMPORT_DRY_RUN` — entityType `ImportBatch`, entityId = entity name
  (`students` / `parents` / `teachers`). Payload includes summary counts +
  fatal errors (header missing, etc.).
- `IMPORT_COMMIT` — same entityType / entityId. Payload includes summary
  counts, `allowWarnings`, and full lists of created / failed row numbers
  with their entity ids.

### Files touched

- new: `lib/panel/imports.ts`
- new: `app/panel/admin/import/_actions.ts`
- new: `app/panel/admin/import/page.tsx`
- new: `app/panel/admin/import/import-wizard.tsx`
- edit: `components/panel/shell/sections.ts` (sidebar link)

### Verification (D10)

- `npx tsc --noEmit` → exit 0, no new errors.
- `npx eslint lib/panel/imports.ts 'app/panel/admin/import/**/*.{ts,tsx}'`
  → exit 0, 0 warnings.
