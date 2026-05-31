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
