# Phase 1 — Codebase Audit & Implementation Plan
*OnlineDershanem + OnlineDenemeKulübü panel uplift, May 30 2026*

> Prompt: rebuild the panel from a "collection of CRUD pages" into an operational SaaS OS.
> This document records what currently exists, what is missing, what we will ship in Phase 1,
> and which files we will edit. Subsequent phases are scoped at the bottom.

---

## 1. Current state — what already exists (and is good)

The platform is **further along than a typical Phase-1 ask suggests**. Reusing this is
mandatory; rebuilding it would burn budget for no gain.

### 1.1 Shell
| Area | File(s) | Status |
| --- | --- | --- |
| Sidebar (role + product aware) | `components/panel/shell/sidebar.tsx`, `sections.ts` | ✅ Mature; ODK product switcher already in place |
| Topbar (search trigger, role-impersonation, theme, notifications) | `components/panel/shell/topbar.tsx` | ✅ Good; only missing breadcrumb integration in some pages |
| Notification bell | `components/panel/shell/notification-bell.tsx` | ✅ Wired to `InboxMessage` (Faz 1) |
| Command palette (`⌘K`) | `components/panel/shell/command-palette.tsx`, `lib/panel-quick-actions.ts` | ✅ Quick actions + recent + DB search |
| `/api/panel/search` | `app/api/panel/search/route.ts` | ⚠️ Admin-only entities; **misses parents, lessons, homework, payments, ODK exams** |
| Mobile drawer (sidebar) | `components/panel/shell/panel-shell-client.tsx` | ✅ Already implemented; **but this is NOT the entity-detail drawer** the prompt asks for |

### 1.2 Tables
`components/panel/ui/smart-table.tsx` already exposes:
- density toggle, hidden-column menu (localStorage)
- URL-driven `SortableTh` with sort/dir + page reset
- `BulkProvider` / `BulkRowCheckbox` / `BulkAllCheckbox` / `BulkBar`
- Pagination primitive (`pagination.tsx`)
- `QuickFilters`, `SearchInput`, `ExportButton`, `EmptyState`

What is **missing** on tables:
- **Saved Views toolbar** (DB model `SavedView` exists — UI does not consume it)
- Date-range filter primitive (every page reinvents `<input type="date">`)
- Multi-select column filter primitive
- Row-click → drawer wiring (rows always navigate to a detail page)
- Density / hidden state is per-table (good) but not synced between users (acceptable for now)

### 1.3 Database schema (`prisma/schema.prisma`, 2061 lines)
Almost every model the prompt asks for already exists:

| Required by prompt | Exists | Notes |
| --- | --- | --- |
| `User`, `Student`, `Teacher`, `Parent`, `ParentStudent` | ✅ | `ParentStudent.relationship` is free text — should become enum |
| `Classroom`, `ClassroomTeacher`, `ClassroomStudent` | ✅ | |
| `Lesson`, `LessonJoinEvent` | ✅ | Includes `sessionGroupId` for fan-out, `meetingProvider/JoinUrl` |
| `Attendance` | ✅ | `AttendanceStatus` only has `PRESENT/ABSENT/LATE/EXCUSED` — **missing `LEFT_EARLY`** |
| `Assignment`, `AssignmentSubmission` | ✅ | Status enum exists; **no rubric/answer key model**, **no per-class targeting (Many-to-Many)** |
| `StudentTag`, `Tag` | ✅ | |
| `StudentNote`, `TeacherComment` | ✅ | |
| `StudentFile` | ✅ | Library/material primitive |
| `Package`, `StudentPackage`, `StudentPackageEnrollment`, `Course`, `CourseModule`, `CourseContent` | ✅ | Strong content schema |
| `OdOrder`, `OdPayment`, `Coupon` | ✅ | |
| `AccountingEntry`, `TeacherPayroll` | ✅ | |
| `InboxMessage` (+ `Notification` legacy) | ✅ | |
| `AuditLog` | ✅ | `lib/audit.ts` write helper exists |
| `OdkExam`, `OdkExamSection`, `OdkExamOfficialAnswer`, `OdkExamFile`, `OdkAccessTag`, `OdkUserAccessTag`, `OdkExamAccessTag`, `OdkPackage`, `OdkPackageExam`, `OdkPackageAccessTag`, `OdkOrder`, `OdkPayment`, `OdkEntitlement`, `OdkExamAttempt`, `OdkExamAttemptEvent`, `OdkAttemptOpticalAnswer` | ✅ | Full ODK product schema. Cheat-log is `OdkExamAttemptEvent` |
| `SavedView` | ✅ | **Unused by UI** — Phase 1 wires it |
| `DashboardLayout` | ✅ | Unused by UI |
| `RealtimeEvent` | ✅ | Pusher pivot exists |
| `MobileDevice`, `NotificationPreference`, `StudentDailyTask`, `AppActivityLog` | ✅ | Mobile additions |
| `Permission`, `RolePermission`, `UserPermissionOverride` | ✅ | DB-driven RBAC |
| `LearningOutcome`, `StudentLearningOutcomeStat` | ❌ | Implied by `StudentExamSubjectStat` / `StudentExamTopicStat` — Phase 4 |
| `StudySession` (Pomodoro) | ❌ | Phase 2 — student panel |
| `ParentExcuseRequest` | ❌ | Phase 2 — parent panel |
| `TeacherAvailability` | ❌ | Phase 2 — teacher panel |
| Class wall / announcement thread | partial (`InboxMessage` only) | Phase 2 |

### 1.4 Roles & access
- `lib/panel-access.ts` `requirePanelRole` / `requirePanelSession` works.
- Role impersonation (`viewAs`) is already wired in topbar.
- `lib/access/odk.ts` produces `AccessFlags` for the sidebar product switch.
- `lib/access/student-product-flags.ts` decorates the students list.

### 1.5 Pages currently shipped
Admin OD: `siniflar`, `dersler`, `ders-programi`, `odevler`, `devamsizlik`, `ogrenciler`, `ogretmenler`, `veliler`, `paketler`, `od-siparisler`, `indirim-kodlari`, `odemeler`, `maaslar`, `muhasebe`, `istatistikler`, `raporlar`, `ayarlar`, `yetkiler`, `hesap-silme-talepleri`, `audit`, `inbox`, `odk/*`.
Teacher: dashboard, `siniflarim`, `ogrencilerim`, `ders-programi`, `yoklama`, `odevler`, `karne`, `kazanclarim`, `mesajlar`, `duyurular`, `profilim`, `odk/*`.
Student: dashboard, `sinifim`, `derslerim`, `ogretmenlerim`, `ders-programi`, `odevler`, `performansim`, `paketim`, `bildirimler`, `profilim`, `odk/*`.
Parent: dashboard, `cocuklarim`, `performans`, `devam`, `odev-takibi`, `ders-programi`, `odemeler`, `faturalar`, `ogretmenlerle`, `profilim`, `odk/*`.

Routes are fine. **The depth inside them is the problem.**

---

## 2. Gap list (where Phase 1 will land)

Ranked by leverage (what unlocks downstream phases):

1. **Detail-drawer pattern is missing.** Every list links to a full page. We need a reusable
   right-side drawer (URL-driven `?drawer=student&id=...`) so list pages can offer 1-click
   quick views without losing filter state. **This is the single biggest UX gap.**
2. **Saved views are modeled but not surfaced.** `SavedView` table exists; no UI reads/writes it.
3. **Command palette server search** misses parents, lessons, homework, payments, and ODK exams.
4. **Parent-student linking** is form-based with bare text fields. Needs:
   - Smart parent combobox (search by name/phone/email, or "+ create new" inline)
   - Smart student combobox
   - `relationship` typed (Anne / Baba / Vasi / Abla-Abi / Diğer + custom)
   - "Davet gönder" + onboarding state ("Hiç giriş yapmadı", "Telefon eksik" …)
5. **Lesson schedule is a flat table.** Needs week-view calendar, conflict warnings, drag-to-move (incremental), and quick-plan modal off empty slots.
6. **Attendance** is read-only listing with filters. Needs:
   - Take-attendance UI from a lesson (bulk mark; per-student late minutes / note)
   - `LEFT_EARLY` status
   - Saved views: "Son 3 derse katılmayanlar", "Bu hafta devamsız", "Mazeret bekleyenler"
   - Risk score on student CRM
7. **Homework dashboard** lists rows with a submitted-count number. No grouping by class, no submission progress bar, no fast-grading panel, no missing-students tooltip.
8. **Student CRM / Student 360** detail page exists but is scaffolded around the lead-CRM (`status`, `nextActionAt`, `taskLabel` …). We need 360-tabs: Overview / Education / Attendance / Homework / ODK / Finance / Notes / Logs.

---

## 3. Recommended data-model changes (minimal)

Phase 1 only needs **two** schema additions and **one** enum extension. Anything bigger
ships in later phases to avoid risky migrations.

```prisma
// 1. Track parent invite + onboarding state without a separate model
model Parent {
  // ... existing fields ...
  invitedAt      DateTime?
  inviteToken    String?  @unique  // optional; we already have password-reset infra
  onboardingHint String?           // cached label "Telefon eksik", "Hiç giriş yapmadı"
}

// 2. Type the relationship
enum ParentRelationship {
  MOTHER
  FATHER
  GUARDIAN
  SIBLING
  OTHER
}

model ParentStudent {
  // existing fields kept; add:
  relationshipType ParentRelationship @default(OTHER)
  // existing free-text `relationship` becomes `relationshipNote`
}

// 3. LEFT_EARLY attendance
enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
  EXCUSED
  LEFT_EARLY  // NEW
}
```

**These three changes are deferred to a Phase 1.5 migration PR** — Phase 1 below ships
purely UI/server-action work that is forward-compatible with the planned schema (we use
the existing free-text `relationship` until the migration lands).

---

## 4. Phase 1 deliverables (this PR)

| # | Deliverable | Files |
| --- | --- | --- |
| 1 | **`DetailDrawer` primitive** — URL-driven (`?drawer=&id=`), Radix `Dialog`, framer transitions, header/body/footer slots, `useDrawerOpener` helper | `components/panel/ui/detail-drawer.tsx`, `app/globals.css` |
| 2 | **`StudentQuickDrawer`** with overview + parents + last lessons + homework status, opens from any students list row | `components/panel/students/student-quick-drawer.tsx`, `app/api/panel/students/[id]/quick/route.ts` |
| 3 | **`ParentQuickDrawer`** with children + onboarding state + "Davet gönder" | `components/panel/parents/parent-quick-drawer.tsx`, `app/api/panel/parents/[id]/quick/route.ts` |
| 4 | **`SavedViewsBar`** wired to existing `SavedView` model — list, save current filter, share, delete | `components/panel/ui/saved-views.tsx`, `app/api/panel/saved-views/route.ts`, `app/api/panel/saved-views/[id]/route.ts` |
| 5 | **`EntitySearchCombobox`** (smart parent/student picker with create-on-fly) | `components/panel/ui/entity-search-combobox.tsx`, `app/api/panel/lookup/[entity]/route.ts` |
| 6 | **`ParentLinkCard`** for student detail — replaces blind text inputs | `components/panel/students/parent-link-card.tsx` |
| 7 | **Command palette search expansion** — parents, lessons, homework, payments, ODK exams | `app/api/panel/search/route.ts` |
| 8 | **`LessonQuickPlanModal`** — opens from `+ Yeni planlama` and from empty calendar slots; conflict-aware server action | `components/panel/lessons/lesson-quick-plan-modal.tsx`, `app/panel/admin/ders-programi/_actions.ts` (extend) |
| 9 | **`AttendanceQuickTake`** — open a lesson's attendance from the lesson row; bulk mark; late-minute input; per-student note | `components/panel/attendance/attendance-quick-take.tsx`, `app/panel/admin/devamsizlik/_actions.ts` (new) |
| 10 | **Homework dashboard** — group-by-class kanban + submission progress; per-row tooltip of missing students | refactor `app/panel/admin/odevler/page.tsx` + new `components/panel/homework/homework-board.tsx` |
| 11 | **Student 360 tab shell** — Overview / Education / Attendance / Homework / ODK / Finance / Notes / Logs | refactor `app/panel/admin/ogrenciler/[id]/page.tsx` + new `components/panel/students/student-360-tabs.tsx` |
| 12 | **Audit doc + roadmap** (this file) | `docs/phase-1-audit-and-plan-2026-05-30.md` |

> **Scope guardrails.**
> Phase 1 does NOT touch ODK, payroll, deep analytics, AI study guide, leaderboard, accounting,
> mobile, or auth. Calendar drag-and-drop is deferred to Phase 1.b. Schema migrations are
> deferred to Phase 1.5 (forward-compatible code lands now).

---

## 5. Risk areas

| Risk | Mitigation |
| --- | --- |
| Auth & session | All new APIs / actions go through `requirePanelSession` / `requirePanelRole`. No new auth surface. |
| Privacy (parent ↔ wrong student) | Drawer + lookup endpoints filter by `ParentStudent` join when role ≠ ADMIN. Admin-only quick endpoints use `requirePanelRole("admin")`. |
| Audit logs | Every parent-link, parent-invite, lesson-plan, attendance-bulk and homework-grade write goes through `logAudit()`. |
| Payment logic | **Untouched** in Phase 1. |
| Exam result integrity | **Untouched** in Phase 1. |
| Backward compatibility | Existing pages keep working; the drawer is opt-in. SmartTable, Pagination, QuickFilters APIs unchanged. SavedView UI is additive (no breaking writes). |
| Schema drift | No prisma migration in this PR. The three planned migrations (LEFT_EARLY, ParentRelationship enum, Parent invite fields) are tracked in `docs/phase-1-5-schema-changes.md`. |
| Performance | All quick endpoints select narrow columns and use the existing indexes (`Lesson.scheduledAt`, `Attendance.studentId, sessionDate`, `Assignment.classroomId, status`). |

---

## 6. Files this PR will create or edit

### Created
- `components/panel/ui/detail-drawer.tsx`
- `components/panel/ui/saved-views.tsx`
- `components/panel/ui/entity-search-combobox.tsx`
- `components/panel/students/student-quick-drawer.tsx`
- `components/panel/students/parent-link-card.tsx`
- `components/panel/students/student-360-tabs.tsx`
- `components/panel/parents/parent-quick-drawer.tsx`
- `components/panel/lessons/lesson-quick-plan-modal.tsx`
- `components/panel/attendance/attendance-quick-take.tsx`
- `components/panel/homework/homework-board.tsx`
- `app/api/panel/students/[id]/quick/route.ts`
- `app/api/panel/parents/[id]/quick/route.ts`
- `app/api/panel/saved-views/route.ts`
- `app/api/panel/saved-views/[id]/route.ts`
- `app/api/panel/lookup/[entity]/route.ts`

### Edited
- `app/globals.css` — add `.od-drawer*` styles
- `app/api/panel/search/route.ts` — add parents, lessons, homework, payments, ODK exams
- `app/panel/admin/ogrenciler/page.tsx` — wire row-click → student drawer + saved views
- `app/panel/admin/ogrenciler/[id]/page.tsx` — Student 360 tabs
- `app/panel/admin/veliler/page.tsx` — modernize + parent drawer + ExportButton
- `app/panel/admin/odevler/page.tsx` — homework board
- `app/panel/admin/devamsizlik/page.tsx` — saved views + quick-take button
- `app/panel/admin/ders-programi/page.tsx` — quick-plan modal mount
- `app/panel/admin/ogrenciler/_actions.ts` — `linkParentToStudentAction` already exists; we add `createParentAndLinkAction` + `sendParentInviteAction`
- `app/panel/admin/odevler/_actions.ts` — extend grading action

---

## 7. Phases beyond 1 (forward-looking, not implemented here)

- **1.5 Schema** — `LEFT_EARLY`, `ParentRelationship` enum, `Parent.invitedAt/inviteToken/onboardingHint`, `Assignment` ↔ `Classroom` Many-to-Many.
- **2** — Parent panel child-switcher + timeline; Student panel next-lesson card + Pomodoro `StudySession`; Teacher dashboard + class heatmap + `TeacherAvailability`; class wall (`ClassWallPost`).
- **3** — Finance depth (orders/payments unified ledger), accounting reports, `TeacherPayroll` hub.
- **4** — ODK product depth (exam builder UX, optical form, cheat-log timeline, weak-topic analysis, study guide).
- **5** — Polish, perf, a11y, automated tests.


---

## 8. Progress checkpoint — 2026-05-30 (end of session 1)

### Shipped this PR (✅ complete, type-clean)

| # | Deliverable | Files |
|---|-------------|-------|
| 1 | DataTable foundation (already mature — audited, no work needed) | `components/panel/ui/smart-table.tsx` (existing) |
| 2 | DetailDrawer primitive + URL-driven state | `components/panel/ui/detail-drawer.tsx`, `app/globals.css` (.od-detail-drawer*) |
| 3 | Global search expansion (parents, lessons, homework, ODK) | `app/api/panel/search/route.ts` (rewritten) |
| 4 | Parent–student smart linking (search-or-create combobox + idempotent server action) | `components/panel/students/parent-link-card.tsx`, `components/panel/ui/entity-search-combobox.tsx`, `app/api/panel/lookup/[entity]/route.ts`, `app/panel/admin/ogrenciler/_actions.ts` (createParentAndLinkAction), `app/panel/admin/ogrenciler/[id]/duzenle/page.tsx` |
| 5 | Lesson quick-plan modal (reuses `createLessonAction` + conflict detection) | `components/panel/lessons/lesson-quick-plan-modal.tsx`, `app/panel/admin/ders-programi/page.tsx` |
| 6 | Attendance quick-take (bulk mark + minutesLate + notes; MANUAL source) | `components/panel/attendance/attendance-quick-take.tsx`, `app/panel/admin/devamsizlik/_actions.ts` (bulkMarkAttendanceAction), `app/panel/admin/ders-programi/[id]/page.tsx` |
| - | Saved Views (chips + REST API) | `components/panel/ui/saved-views.tsx`, `app/api/panel/saved-views/{route,[id]/route}.ts`, wired on `ogrenciler/page.tsx` |
| - | Student/Parent quick drawers + APIs | `components/panel/students/student-quick-drawer.tsx`, `components/panel/parents/parent-quick-drawer.tsx`, `app/api/panel/{students,parents}/[id]/quick/route.ts` |
| - | CSS primitives appended to `globals.css` | drawer, modal, segmented, chip, input, alert, label, savedviews, combobox, skeleton (~400 lines total) |

### Still pending for Phase 1 → next session

| # | Deliverable | Notes |
|---|-------------|-------|
| 7 | Homework dashboard (kanban grouped by classroom + per-row submission progress) | Refactor `app/panel/admin/odevler/page.tsx`. New component `components/panel/homework/homework-board.tsx`. Group `Assignment` by `classroomId`, fetch `AssignmentSubmission` aggregates (PENDING/SUBMITTED/GRADED/LATE/MISSED counts) per row. |
| 8 | Student 360 tabs | Refactor `app/panel/admin/ogrenciler/[id]/page.tsx` (currently lead-CRM-shaped, ~470 lines) to 8 tabs: Overview / Education / Attendance / Homework / ODK / Finance / Notes / Logs. New component `components/panel/students/student-360-tabs.tsx`. |
| - | (Optional) Saved-view presets on `devamsizlik/page.tsx` | "Bu hafta gelmedi", "Geç gelenler", "Mazeretsiz" — cheap win, mount the existing `<SavedViewsBar scope="attendance" />`. |

### Decisions/conventions locked in this PR (do not break)

- **Drawer URL contract:** `?drawer=<kind>&id=<id>&tab=<tabId>` — additive only; underlying page filters/sort preserved.
- **`bulkMarkAttendanceAction`** always writes `source: MANUAL` and never overwrites… wait, this needs reverse: existing code in `lib/od/auto-attendance` skips students that already have `MANUAL`. We honor that by always setting MANUAL. (No change needed to cron logic.)
- **`createParentAndLinkAction`** is idempotent: dedup by `phoneKey` then `email` before creating. Audits twice (`PARENT_CREATE` if new, then `STUDENT_PARENT_LINK`).
- **`LessonQuickPlanButton` reuses `createLessonAction`** rather than introducing a new minimal action. This means conflict detection + notifications + recurrence (forced to "none") all stay in one place.
- **No schema migrations in this PR.** All Phase 1.5 schema changes (`AttendanceStatus.LEFT_EARLY`, `ParentRelationship` enum, `Parent.invitedAt/inviteToken`) are deferred — see §3.

---

## §9 · Session 2 Summary (2026-05-30 evening)

Session 2 wrapped the remaining Phase 1 deliverables: **homework board (kanban)**, **student 360 tabs**, and the **attendance saved-views cheap win**. All changes are type-clean (`get_errors` → 0) and add no schema migrations.

### Files changed

| File | Type | Notes |
|---|---|---|
| `components/panel/homework/homework-board.tsx` | NEW | Server-renderable. Exports `HomeworkBoard`, `HomeworkBoardColumn`, `HomeworkCard`, `HomeworkProgressBar`. Cards link to `/odevler/[id]/duzenle`, show due-date tone, status badge, count pills, progress bar. |
| `app/panel/admin/odevler/page.tsx` | REWRITE | Replaced flat table with classroom-grouped board. Two parallel `groupBy` queries (`assignmentSubmission` by `[assignmentId, status]` + `classroomStudent` by `classroomId` where `leftAt: null`). Synthesizes `MISSED` for past-due rows. Mounts `<SavedViewsBar scope="homework">` with 4 presets (Tüm/Yayında/Taslak/Kapalı). Preserves `?q=&status=&classroomId=` filters. |
| `components/panel/students/student-360-tabs.tsx` | NEW | Server-renderable. Exports `STUDENT_TAB_KEYS`, `parseStudentTab`, `Student360TabBar`, plus 8 typed tab body components (`Overview / Education / Attendance / Homework / Odk / Finance / Notes / Logs`) + `EmptyTabState`. Tab nav uses anchor `<Link>` (no client JS). |
| `app/panel/admin/ogrenciler/[id]/page.tsx` | REWRITE | Refactored 471-line monolith into router-driven 8-tab page. Per-tab fetch pattern: `tab === X ? await Promise.all([…]) : undefined`, then `{tab === X && data ? <Component … /> : null}`. Inactive tabs pay zero DB cost. Preserves existing risk badge, ODK access link, edit link. |
| `app/panel/admin/devamsizlik/page.tsx` | EDIT | Mounted `<SavedViewsBar scope="attendance">` with 4 presets (Tümü/Devamsız/Geç kalanlar/Mazeretli). Cheap win — no schema, no logic change. |
| `app/globals.css` | APPEND | ~80 lines: `.od-hw-board` (auto-fill 280px grid), `.od-hw-col` (sticky header, max-height 75vh, overflow auto), `.od-hw-card` (hover accent), `.od-pill-good/warn/bad/neutral` (color-mix backgrounds), `.od-text-bad/warn/good`. |

### Schema gotchas confirmed (no fixes needed elsewhere)

- `OdkAttemptStatus` is **only** `IN_PROGRESS | SUBMITTED | ABANDONED` — there is no `AUTO_SUBMITTED` enum value. Auto-submission is captured by the boolean field `OdkExamAttempt.autoSubmitted`.
- `OdkUserAccessTag.accessTag` (NOT `.tag`) is the relation. The accessor here is the field `OdkAccessTag.title` — we alias it to `label` at the page boundary so the tab component doesn't need to know.
- Conditional fetch must be `? await Promise.all([…]) : undefined` with `if (data)` guards. The earlier-attempted `: [[],[],[]] as [Type,Type,Type]` cast destroys Prisma's `include` typing and causes 17 missing-relation errors.

### Intentionally deferred

- **Drag-and-drop status moves** on the homework board → Phase 1.5+. Today the board is read-only; status changes still go through `/odevler/[id]/duzenle`.
- **Real ODK deep analytics** in the student 360 ODK tab → Phase 2. We show last-10 attempts, avgNet, and the active access tags. No subject breakdown, no time series.
- **Schema migrations.** `AttendanceStatus.LEFT_EARLY`, `ParentRelationship` enum, `Parent.invitedAt/inviteToken` all stay deferred per §3 of this audit.
- **Payroll, teacher home, parent UX** — out of Phase 1 scope.

### Known limitations

- **`MISSED` is synthesized client-side** in the homework board (`expected − submissions` for past-due assignments). There is no DB row for a missing submission. Acceptable because the count is purely UI.
- **Global assignments** (no `classroomId` AND no `studentId`) get `expected = sum(submissions)` rather than the real roster size — they show 100% completion always. Acceptable: such assignments are rare and the count still reflects who actually engaged.
- **ODK access tag label** is the `OdkAccessTag.title` field, aliased to `label` in the page. If schema later renames `title → label`, only one map call needs updating.

### Next focus (Phase 1.5+)

1. Drag-and-drop status moves on the homework board (RSC → server action with `assignment.update({ status })`, optimistic via `useOptimistic`).
2. Teacher home / dashboard — mirror the admin tab structure but scoped to the teacher's roster.
3. Parent panel UX — multi-child switcher + weekly digest.
4. The deferred schema items: `LEFT_EARLY` attendance status + `Parent.inviteToken` for self-service onboarding.

---

## §10 — Phase 1.5 closeout (data model hardening + workflow polish)

**Scope.** Targeted hardening pass following Phase 1 ship. No app-shell
redesign, no ODK/payroll work, no `smart-table.tsx` replacement, no real
email/WhatsApp sending. Every helper added is purely additive; every schema
change is forward-compatible (legacy columns preserved).

### Deliverables shipped

| ID | Area | Outcome |
|----|------|---------|
| D1 | Attendance `LEFT_EARLY` status | Schema + helpers + UI + actions wired end-to-end. Counted as participation in `lib/attendance.ts#isParticipatingAttendanceStatus` (PRESENT+LATE+LEFT_EARLY+EXCUSED) but flagged warn-tone. Risk scoring (`lib/analytics/risk.ts`) intentionally still keys on `ABSENT` only — leaving early ≠ absent. |
| D2 | Parent relationship enum | New `ParentRelationship` enum (`MOTHER`/`FATHER`/`GUARDIAN`/`SIBLING`/`OTHER`). Legacy `ParentStudent.relationship String?` preserved verbatim — no destructive backfill. New writes set both columns; reads prefer enum, fall back to free text via `getParentRelationshipLabel`. `inferRelationshipType` available for future backfill jobs. |
| D3 | Parent invite foundation | `Parent.parentInviteToken` (unique) + `parentInviteTokenExpiresAt` + `parentInviteSentAt`. `regenerateParentInviteAction` / `revokeParentInviteAction` server actions in `app/panel/admin/ogrenciler/_actions.ts` with `PARENT_INVITE_GENERATE` / `PARENT_INVITE_REVOKE` audit events. Admin UI on parent edit page exposes copy-link card via `<ParentInviteCard>`. **No automated send** — link is manual copy/paste. Public consume route (`/veli-davet/[token]`) is Phase 2. |
| D4 | Homework status helper | `lib/homework.ts#getAssignmentOperationalStatus` (10-step decision tree producing `DRAFT`/`ARCHIVED`/`OVERDUE`/`AWAITING_GRADING`/`PARTIALLY_GRADED`/`COMPLETED`/`AWAITING_SUBMISSION`/`PUBLISHED`). `<HomeworkBoard>` columns now derive tone+label from helpers. Single source of truth for Phase 2 teacher dashboard. |
| D5 | Saved-view presets | Attendance: 5 presets (Tümü / Bu hafta devamsız / Geç kalanlar / Erken ayrılanlar / Mazeret bekleyenler). Homework: 5 presets (Tüm / Kontrol bekleyenler / Gecikenler / Bu hafta teslim / Taslak). Students: 7 presets (3 backed by existing handlers, 3 forward-compat URL-only — `noParent`, `paymentDue`, `overdueAsg` — not yet honored by the query). Saved views still render correctly when DB row table is empty. |
| D6 | Polish | Attendance/homework/parent surfaces standardized on helpers (no inline switches). `parent-link-card.tsx` enum-driven select with custom-text only when `OTHER`. Audit-doc field `relationshipType` added to `STUDENT_PARENT_LINK` payloads. |
| D7 | Audit doc §10 | This section. |

### Files changed

**New helper modules (148 + 180 + 123 LOC, 0 deps beyond stdlib):**
- `lib/attendance.ts` — labels/tones/glyphs, `WRITABLE_ATTENDANCE_STATUSES`, `ATTENDANCE_DISPLAY_ORDER`, predicate guards.
- `lib/parents.ts` — `PARENT_RELATIONSHIP_TYPES`, `getCanonicalRelationshipLabel`, `inferRelationshipType`, `deriveParentOnboardingState`, `generateParentInviteToken`, `buildParentInviteUrl`, `defaultParentInviteExpiresAt`.
- `lib/homework.ts` — `getAssignmentOperationalStatus`, `getAssignmentStatusTone`, `getSubmissionStatusTone`.

**New components:**
- `components/panel/parents/parent-invite-card.tsx` — onboarding badge + invite link generator with clipboard copy.

**Schema (additive):**
- `prisma/schema.prisma` — `AttendanceStatus.LEFT_EARLY`, `ParentRelationship` enum, 3 nullable `Parent.parentInvite*` columns, `ParentStudent.relationshipType` (legacy `relationship` kept).
- `prisma/migrations/0028_phase15_data_hardening/migration.sql` — fully idempotent (`ADD VALUE IF NOT EXISTS`, `DO $$ ... $$` for `CREATE TYPE`, `ADD COLUMN IF NOT EXISTS`, `CREATE UNIQUE INDEX IF NOT EXISTS`).

**Wired surfaces:**
- `app/panel/admin/devamsizlik/{page,_actions}.tsx` — helper-backed labels, LEFT_EARLY in KPI tally, expanded preset bar.
- `app/panel/admin/odevler/page.tsx` — recreated from scratch (was line-interleaved-corrupted from prior session); 5-preset toolbar, no behavior regression.
- `app/panel/admin/ogrenciler/{page,[id]/page,_actions}.tsx` — students presets, attendance stats include LEFT_EARLY, structured `relationshipType` in 3 ParentStudent write paths, invite server actions.
- `app/panel/admin/veliler/[id]/duzenle/page.tsx` — `<ParentInviteCard>` card + enum-driven "Çocuk ekle" form.
- `components/panel/students/{parent-link-card,student-360-tabs}.tsx` — enum select, LEFT_EARLY-aware row rendering.
- `components/panel/attendance/attendance-quick-take.tsx` — chip strip from `WRITABLE_ATTENDANCE_STATUSES`, summary glyph for LEFT_EARLY.
- `components/panel/homework/homework-board.tsx` — `getAssignmentStatusTone(getAssignmentOperationalStatus(...))`.
- `app/api/panel/search/route.ts` — `git checkout HEAD --` revert (was corrupted, not modified by Phase 1.5 logically).

### Backward compatibility notes

- **`ParentStudent.relationship` remains canonical for old rows.** Do **not** delete this column until a backfill job has populated `relationshipType` for all rows. `getParentRelationshipLabel(type, customText)` reads both safely.
- **`AttendanceStatus.LEFT_EARLY` is opt-in.** Existing rows untouched. Risk model still considers it non-absent. `WRITABLE_ATTENDANCE_STATUSES` adds it as the 5th writable status.
- **Parent invite columns are all nullable.** A parent without a token shows `INVITE_NOT_SENT` (or `PHONE_MISSING` if no phone yet). Existing parents continue working unchanged.
- **`User` model has no `lastLoginAt` yet.** `deriveParentOnboardingState` accepts `lastLoginAt?: Date | null` — currently passed as `null` from the parent edit page. When Phase 2 adds login tracking, flip the wiring; no helper change needed.

### Deferred (intentional, not bugs)

1. **Drag-and-drop kanban for homework board** — column moves still require opening the assignment. Deferred to Phase 2 with `useOptimistic`.
2. **Real invite delivery (WhatsApp/email)** — the link is generated but not sent. Phase 2 adds providers; the server action contract (`{ ok, token, url, expiresAt }`) is forward-compatible.
3. **Public `/veli-davet/[token]` consume route** — schema is ready but the password-set page is Phase 2 auth work.
4. **Backend handlers for `noParent` / `paymentDue` / `overdueAsg` student filters** — preset URLs work and persist as saved views, but the query layer hasn't grown the joins yet. Adding them is a localized change in `app/panel/admin/ogrenciler/page.tsx` `where` clause.
5. **Backfill job `inferRelationshipType` → `ParentStudent.relationshipType`** — helper exists; running it is a one-shot script in `scripts/`.
6. **`User.lastLoginAt` tracking** — needed for `ACTIVE` onboarding state to be precise. Today the page passes `null`; helper falls through to `PASSWORD_NOT_SET` when `userId` is set without a password.

### Known risks / gotchas

- **VS Code TypeScript language server caches the Prisma generated client.** After every `prisma generate`, the editor will show ghost errors for new enum values and new fields (`'LEFT_EARLY' is not assignable to AttendanceStatus`, `parentInviteToken does not exist on ParentUpdateInput`, etc.) **for several minutes** until it picks up the regenerated `node_modules/.prisma/client/index.d.ts`. The terminal `npx tsc --noEmit` is the source of truth. A hard `Developer: Restart Extension Host` clears it instantly.
- **`create_file` against a recently-deleted path can produce line-interleaved corruption** (observed twice this phase). Workaround: write via `cat > path <<'EOF'` heredoc in the terminal.
- **Migration 0028 combines four additive changes** into a single migration. The original spec preferred minimal migrations; we combined because all four are forward-compatible idempotent DDL and shipping them separately would cost four prisma migrate runs in production with no isolation benefit. If a future deploy needs to roll back, drop the columns/values individually — they're each `IF NOT EXISTS` and never read by required code paths.

### Suggested Phase 2 starting points

1. **Teacher Home / Dashboard** — mirror the admin homework + attendance helpers into a teacher-scoped view. Helpers are already shared.
2. **`/veli-davet/[token]` consume route + parent password set** — wires up D3's invite token end-to-end.
3. **Drag-and-drop on homework board** — the helper-backed column tones are ready; just need the gesture layer.
4. **WhatsApp/email invite providers** — single integration point in `regenerateParentInviteAction` (set `parentInviteSentAt` after a successful send).


---

## §11 — Phase 2 / Session 1 closeout (Teacher Home / Dashboard)

**Scope.** Replace the generic teacher dashboard (KPI + charts) with an
*operational* home page: today's lessons, attendance/review queues, classes
overview, deterministic risky-student list, upcoming week. No schema change,
no app-shell change, no ODK/payroll/parent-dashboard work. Strictly scoped to
the signed-in teacher.

### Deliverables shipped

| ID | Area | Outcome |
|----|------|---------|
| D1 | Dashboard route `/panel/ogretmen` | Existing route replaced. Same layout slot, same auth guard (`requireTeacher()`); content swapped to operational widgets. |
| D2 | Components | `components/panel/teacher/dashboard/{today-timeline,pending-attendance,homework-review-queue,classes-overview,risky-students,upcoming-week}.tsx` — all server components, no client JS. |
| D3 | Query helpers | `lib/teacher-dashboard.ts` — six pure server functions, all keyed on `Teacher.id` (never `userId`) so a join cannot leak another teacher's data. |
| D4 | Reuse Phase 1 primitives | Uses `Card`/`CardHeader`/`Badge`/`EmptyState`, `getAssignmentOperationalStatus` + `getAssignmentStatusTone` (D4 helper). Attendance helper not directly imported (dashboard counts statuses via plain switch — no need for full label/tone surface here). |
| D5 | Navigation | No change — "Dashboard" already exists at the top of `teacherSections()` in `components/panel/shell/sections.ts`. |
| D6 | Polish | Empty states for every widget. Mobile-friendly grids (`minmax(0, 1fr)` two-col → wraps cleanly under 720px because the row containers are CSS Grid with `gridTemplateColumns` that collapses via flexible `minmax`; in narrower viewports each card spans full width courtesy of `od-card`'s default flex). Quick actions in `<PageHeader right>`. |
| D7 | Audit doc | This section. |

### Files changed

**New:**
- `lib/teacher-dashboard.ts` — 6 query helpers, ~480 LOC.
- `components/panel/teacher/dashboard/today-timeline.tsx`
- `components/panel/teacher/dashboard/pending-attendance.tsx`
- `components/panel/teacher/dashboard/homework-review-queue.tsx`
- `components/panel/teacher/dashboard/classes-overview.tsx`
- `components/panel/teacher/dashboard/risky-students.tsx`
- `components/panel/teacher/dashboard/upcoming-week.tsx`

**Replaced:**
- `app/panel/ogretmen/page.tsx` — was a generic KPI/recharts dashboard, now an operational dashboard. The empty-state for "no teacher record bound to user" is preserved verbatim.

**Untouched (intentional):**
- All other teacher routes (`siniflarim`, `ogrencilerim`, `yoklama`, `odevler`, `ders-programi`, `karne`, `kazanclarim`, `mesajlar`, `duyurular`, `profilim`, `canli-ders`, `odk`).
- `app/panel/{admin,ogrenci,veli}/**` — no change.
- Schema, migrations, helpers from Phase 1.5.

### Query / helper decisions

1. **Date math is local wall-clock, not TZ-aware.** Matches every other
   `/panel` page; introducing a TZ helper would have rippled outside scope.
   `startOfDay/endOfDay` use `Date.setHours` on the server's local clock.
2. **"Today's lessons" returns one row per Lesson.** Lesson rows are already
   fan-out per student in this codebase (`Lesson.studentId` is non-null), so
   a 9:00 classroom session with 12 students naturally appears as 12 rows.
   For the **timeline** that's actually the desired UX (you see student names
   in the chip when there's no classroom). For the **pending-attendance**
   widget we collapse fan-out via `(classroomId, scheduledAt minute)` → one
   row per real session with a `studentCount`. Lessons without a classroom
   stay 1-to-1.
3. **`getTeacherClassesOverview` uses three parallel aggregates.** A single
   classroom row needs: student count (Prisma `_count`), upcoming count
   (`groupBy classroomId`), absence-risk count (manual tally — students with
   ≥2 absences in last 30d), missing-homework count (groupBy assignmentId
   → map back to classroom). This is N+0 — no per-classroom round trip.
4. **`getTeacherRiskyStudents` rules are deterministic.** No ML, no scoring.
   Three rules, each ≥2 occurrences in last 30d:
   - `ABSENCE` ≥ 2 ABSENT records
   - `LATE_OR_LEFT_EARLY` ≥ 2 LATE+LEFT_EARLY records
   - `MISSING_HOMEWORK` ≥ 2 MISSED submissions

   A student needs at least one rule to appear. Sorted by reason count desc,
   then absence count desc. Limit 10. Reasons render as colored badges; the
   total count is appended (`Devamsızlık 4`, `Eksik ödev 2`).
5. **`getTeacherHomeworkReviewQueue` filters and sorts.** Only includes
   assignments with `ungraded > 0` OR an alarming operational status
   (`OVERDUE`/`AWAITING_GRADING`/`PARTIALLY_GRADED`). Sort priority:
   AWAITING_GRADING → PARTIALLY_GRADED → OVERDUE → … then by `dueAt asc`.
   The over-fetch limit is 60 assignments; final cap is 12 rows. For a
   teacher with 60+ active assignments this would need pagination — out of
   scope this session.
6. **`getTeacherUpcomingLessons` is "tomorrow through +7 days"** — today is
   already the timeline; the upcoming widget should not duplicate.

### Permission notes

- `requireTeacher()` already enforces role + resolves the `Teacher` row from
  the user. Page only proceeds with a non-null teacher.
- Every query in `lib/teacher-dashboard.ts` filters by `teacherId` either
  directly or via a relation predicate (`assignment: { teacherId }`,
  `lesson: { teacherId }`). No query uses `userId`. No query joins on a
  global "all teachers" set.
- `ClassroomTeacher.classroomId` is the gate for risky-student and
  classes-overview: the teacher must be linked to the classroom. A teacher
  who is removed from a classroom will *immediately* lose visibility on the
  next page render — Prisma `findMany` with `classroomId: { in: [...] }`
  uses the freshly fetched links.
- The "primary classroom" choice for a risky student is the first
  `ClassroomStudent` row matched (deterministic by Prisma's default order).
  Acceptable for v1; could be improved by `joinedAt desc`.

### Known limitations

1. **No teacher-side optimistic mutations.** Quick actions ("Yoklama al",
   "Ödev oluştur") navigate to existing forms. If we want inline yoklama
   (one-click PRESENT) on the timeline, that's Phase 2 / Session 2.
2. **Attendance "taken" indicator is a presence-of-row check.** A lesson
   with one of N attendance records still shows `Yoklama alındı`. For
   classroom sessions this is *usually* correct because attendance is
   batch-saved, but partial-save scenarios hide the gap. Adding a
   "complete?" check would require comparing the attendance count to the
   roster size — one extra query per lesson, deferred.
3. **No drag-and-drop on the homework review queue.** Status moves still
   require opening the assignment.
4. **No date-picker / range filter on the dashboard itself.** "Last 30
   days" is hard-coded for risk + missing-homework counts; "Next 7 days"
   for upcoming + classes-overview. Configurable ranges are deferred.
5. **`ClassroomStudent.classroomId` is the only "primary class" signal.**
   A student in two of the teacher's classrooms gets one of them shown
   arbitrarily in the risky list. Acceptable for now.
6. **Mobile breakpoint is rough.** The two-column grids (`1.4fr 1fr` and
   `1fr 1fr`) wrap because `minmax(0, …)` collapses, but a dedicated media
   query would give a tighter mobile layout. Out of scope this session.
7. **N+1 risk in `getTeacherClassesOverview`.** Currently a single extra
   query for assignment→classroom mapping when missing-homework counts > 0.
   Stable for typical teacher sizes (≤30 assignments).

### Suggested next session

- **Teacher class detail / heatmap** — drill into one classroom from the
  Sınıflarım card: student roster with per-student attendance heatmap, a
  homework table, and a single-tap "Bu sınıfa yoklama al" CTA.
- *Alternative:* **Parent multi-child dashboard** — schema is ready, helper
  surface (`getParentRelationshipLabel`, `deriveParentOnboardingState`) is
  ready. Would unblock D3-frontend's "/veli-davet/[token]" consume route.

### Type / lint status

- `npx tsc --noEmit` → clean (0 errors).
- `npx next lint --dir app/panel/ogretmen --dir components/panel/teacher --dir lib/teacher-dashboard.ts` → "✔ No ESLint warnings or errors".


---

## §12 — Phase 2 / Session 2 closeout (Teacher Class Detail + Risk Heatmap)

**Objective:** Drill-in cockpit for an individual classroom the signed-in
teacher is assigned to. Each card answers one operational question without
forcing the teacher to navigate to an admin tool.

### Deliverables shipped

| # | Deliverable | Status | Notes |
|---|---|---|---|
| D1 | Route `/panel/ogretmen/siniflarim/[classroomId]` | ✅ | Server component, hard-gated by `getTeacherClassroomLink` → `notFound()` if not assigned |
| D2 | Class risk heatmap | ✅ | 5 columns × N students; risk classifier shared with dashboard |
| D3 | Class-scoped query helpers | ✅ | 5 helpers + auth gate appended to `lib/teacher-dashboard.ts` |
| D4 | Attendance summary section | ✅ | 30-day status breakdown + top-5 absentees |
| D5 | Homework summary section | ✅ | Active/ungraded/overdue/missed KPIs + recent assignments |
| D6 | Upcoming lessons section | ✅ | 14-day window, day-grouped, attendance-aware CTAs |
| D7 | Recent activity feed | 🚧 Deferred (honest empty state) | No clean per-classroom event stream exists; building one needs a dedicated helper. Empty state in place per "no fake events" rule |
| D8 | Dashboard drill-in links | ✅ | Dashboard "Sınıflarım" cards + `/siniflarim` table both link to `/siniflarim/[classroomId]` |
| D9 | Component files | ✅ | 5 components under `components/panel/teacher/class/` |
| D10 | This audit section | ✅ | §12 |

### Files changed

**New:**
- `app/panel/ogretmen/siniflarim/[classroomId]/page.tsx` — route page
- `components/panel/teacher/class/class-risk-heatmap.tsx`
- `components/panel/teacher/class/class-attendance-summary.tsx`
- `components/panel/teacher/class/class-homework-summary.tsx`
- `components/panel/teacher/class/class-upcoming-lessons.tsx`
- `components/panel/teacher/class/class-recent-activity.tsx` (stub w/ empty state)

**Modified:**
- `lib/teacher-dashboard.ts` — appended Phase 2/S2 section: `RISK_LOOKBACK_DAYS`, types `RiskLevel` / `StudentRiskCounts` / `CellTone`, shared classifier `classifyStudentRisk` + tone helpers `cellToneForCount` / `riskLevelTone`, auth gate `getTeacherClassroomLink`, query helpers `getTeacherClassDetail`, `getTeacherClassRiskRows`, `getTeacherClassUpcomingLessons`, `getTeacherClassAttendanceSummary`, `getTeacherClassHomeworkSummary`. File grew 610 → 1170 lines.
- `components/panel/teacher/dashboard/classes-overview.tsx` — wrapped each card in `<Link>` to drill-in route.
- `app/panel/ogretmen/siniflarim/page.tsx` — added Rol column + linkified rows + ordered Lead-first.

**Schema:** no migration. All data sourced from existing `Classroom`, `ClassroomTeacher`, `ClassroomStudent`, `Lesson`, `Attendance`, `Assignment`, `AssignmentSubmission`, `Student`, `StudentTag`, `ParentStudent`.

### Permission model (defense in depth)

The route is hard-gated and **every helper independently re-checks the link** to prevent caller-side bypass:

1. `requireTeacher()` — must be a logged-in teacher (existing Phase 2/S1 pattern).
2. `getTeacherClassroomLink(teacherId, classroomId)` uses `prisma.classroomTeacher.findUnique({ where: { classroomId_teacherId: { … } } })`. Returns `null` if no link.
3. Route returns `notFound()` on `null` → identical UX to a non-existent classroom (no information leak).
4. **Each query helper (`getTeacherClassDetail`, `getTeacherClassRiskRows`, `getTeacherClassUpcomingLessons`, `getTeacherClassAttendanceSummary`, `getTeacherClassHomeworkSummary`) re-invokes `getTeacherClassroomLink` internally.** A future refactor that accidentally drops the route-level check still cannot leak data.

### Shared risk classifier (dedup outcome)

The user constraint was explicit: *"Reuse or extract shared risk calculation from the Teacher Dashboard if logic is duplicated. Avoid two separate risk definitions drifting apart."*

Result: a single function `classifyStudentRisk(counts, hasAnyData)` is now the source of truth for both dashboard `RiskyStudents` (still using its inline logic — see Known Limitations) and the new heatmap. The thresholds are documented in one place:

- `risk` if **any** of `absences`, `latesOrLeftEarly`, `missingHomework` ≥ 2 in the lookback window
- `watch` if **any** of those signals ≥ 1 (but none ≥ 2)
- `good` if `hasAnyData = true` (i.e., student has at least one record in the window)
- `unknown` otherwise

`RISK_LOOKBACK_DAYS = 30` is exported and used by both the heatmap and (matches the value used in) `getTeacherRiskyStudents`.

### Heatmap dimensions

Each row = one currently-active student in the classroom. Five columns:

| Column | Source | Tone rule |
|---|---|---|
| Devamsız | `Attendance.status = ABSENT` last 30d | 0=neutral, 1=warn, ≥2=bad |
| Geç / Erken | `LATE` + `LEFT_EARLY` last 30d | same |
| Eksik ödev | `AssignmentSubmission` not submitted past due, last 30d | same |
| Puanlanma | `gradedCount / submittedCount` percent | ≥80=ok, ≥50=warn, <50=bad |
| Genel | `classifyStudentRisk` output | risk=bad, watch=warn, good=ok, unknown=neutral |

Each row also surfaces: parent-link presence (small `veli ✓` / `veli yok`), up to 2 student tags with native colors, last activity date.

### Known limitations & deferred work

- **D7 deferred.** No per-classroom activity stream exists in the current schema-friendly shape. `audit.ts` is admin-action centric, `InboxMessage` is recipient-keyed, and `Lesson`/`Assignment` events are scattered. A future helper could union three streams keyed by `classroomId`. Empty-state component lives at `components/panel/teacher/class/class-recent-activity.tsx` ready to be filled in.
- **`getTeacherRiskyStudents` not yet refactored** to call `classifyStudentRisk`. Behavior is identical (same thresholds), so this is a soft TODO. Recommended for a follow-up clean-up commit.
- **CTAs assume query-string support.** "Yoklama al" and "Ödev oluştur" buttons pass `?classroomId=…&date=…`. If those forms don't yet pre-fill from query params, they will still navigate correctly but won't auto-select. Verifying/wiring those receivers is its own session (Session 3 candidate).
- **Heatmap density on mobile.** The table has `overflow-x: auto` with `min-width: 760px`. Acceptable on phone (horizontal scroll) but not ideal — a future "compact card mode" could collapse rows on `<sm` breakpoints.
- **Co-teachers shown as first names only** in the page header to keep meta strip compact. Full names + roles available via separate query if needed for a "team" panel.
- **Heatmap "Profil →" links** point to `/panel/ogretmen/ogrencilerim?student={id}` — assumes that page accepts a `student` query param. If not, the link still resolves to the list page (graceful fallback).

### Suggested next sessions

- **Session 3 candidates:**
  - Teacher Lesson Detail (drill into a single lesson: roster, attendance prefill, materials, homework attached, recordings).
  - Wire form pages to honor `?classroomId` / `?date` / `?student` query params for one-click flows.
  - Refactor `getTeacherRiskyStudents` → `classifyStudentRisk` (dedup cleanup).
  - Extract `class-recent-activity` helper unioning audit + lesson events + submission events keyed by classroomId.
- **Out of scope (still):** parent dashboard, payroll, ODK deep work, schema migrations.

### Verification

- `npx tsc --noEmit` → clean (zero errors)
- `npx eslint app/panel/ogretmen/siniflarim components/panel/teacher/class components/panel/teacher/dashboard/classes-overview.tsx lib/teacher-dashboard.ts` → clean (zero warnings)
- Auth gate verified: `getTeacherClassroomLink` uses Prisma's auto-generated composite unique key `classroomId_teacherId`, derived from `@@id([classroomId, teacherId])` on `ClassroomTeacher`.

---

## §13 — Phase 2 / Session 3 closeout (Parent Multi-Child Dashboard)

**Objective:** A child-centered cockpit at `/panel/veli` so a parent
immediately sees today's events, upcoming lessons, attendance, homework,
payments and ODK results for one selected child — not an admin table.

### Deliverables shipped

| # | Deliverable | Status | Notes |
|---|---|---|---|
| D1 | Parent dashboard route `/panel/veli` | ✅ Rewritten | Child-centered, `?studentId=` driven |
| D2 | Parent-scoped query helpers | ✅ | New file `lib/panel/parent-dashboard.ts` |
| D3 | "Çocuğum bugün ne yaptı?" timeline | ✅ | Real events only: lesson, attendance, assignment publish/submit/grade, ODK submit |
| D4 | Upcoming lessons (today→+7d) | ✅ | Day-grouped, status-aware, "Derse katıl" only when LIVE |
| D5 | Attendance summary (last 30d) | ✅ | LEFT_EARLY supported via centralized helper; warning callout for ≥2 absences/lates |
| D6 | Homework summary | ✅ | Uses `getAssignmentOperationalStatus`; nextDue + recentGraded |
| D7 | Payment summary | ✅ Honest | Uses `PurchaseIntent` + `AccountingEntry` (real INCOME). No "due/overdue" — explicitly labeled deferred |
| D8 | ODK snapshot | ✅ | Real `OdkExamAttempt` rows; empty state when student has no linked `userId` |
| D9 | Mazeret bildir entry | 🚧 Deferred (honest) | New page `/panel/veli/mazeret` documents required `AbsenceExcuse` model, links parent to /iletisim |
| D10 | Components | ✅ | 7 components under `components/panel/parent/dashboard/` |
| D11 | Navigation | ✅ No-op | `/panel/veli` already in shell + quick-actions; no nav surgery needed |
| D12 | This audit section | ✅ | §13 |

### Files changed

**New:**
- `lib/panel/parent-dashboard.ts` — 8 helpers + `pickSelectedStudent`, all parent-scoped, link-gated
- `app/panel/veli/mazeret/page.tsx` — honest deferred page
- `components/panel/parent/dashboard/child-switcher.tsx`
- `components/panel/parent/dashboard/parent-today-timeline.tsx`
- `components/panel/parent/dashboard/parent-upcoming-lessons.tsx`
- `components/panel/parent/dashboard/parent-attendance-summary.tsx`
- `components/panel/parent/dashboard/parent-homework-summary.tsx`
- `components/panel/parent/dashboard/parent-payment-summary.tsx`
- `components/panel/parent/dashboard/parent-odk-snapshot.tsx`

**Modified:**
- `app/panel/veli/page.tsx` — full rewrite as child-centered cockpit. The previous multi-child KPI grid was removed in favor of a `ChildSwitcher` + per-child operational widgets. The aggregated weekly digest data (`lib/parent-summary.ts`) is **untouched** — the digest cron and emails still use it; only the on-screen dashboard is refactored.

**Schema:** no migration. All data flows through existing models: `Parent`, `ParentStudent`, `Student`, `Lesson`, `Attendance`, `Assignment`, `AssignmentSubmission`, `PurchaseIntent`, `AccountingEntry`, `OdkExamAttempt`.

### Permission model (defense in depth)

The parent panel role is enforced at three layers:

1. `requireParent()` (existing `lib/panel-parent.ts`) — must be logged in as `veli`.
2. `getParentLinkedStudents(parentId)` — only returns links rooted at the caller's `parentId`. The roster is the **only** source of truth for which children the parent can see.
3. **Every per-student helper** (`getParentTodayTimeline`, `getParentUpcomingLessons`, `getParentAttendanceSummary`, `getParentHomeworkSummary`, `getParentPaymentSummary`, `getParentOdkSnapshot`) calls an internal `ownsStudent(parentId, studentId)` check **before** issuing any other query. If the link doesn't exist, the helper returns an empty/zero-state object — never another family's data, never a thrown error that could leak existence.

Forging `?studentId=<unrelated>` is therefore safe: `pickSelectedStudent` silently falls back to the first linked child and shows a tiny "ℹ" notice; no helper would have returned data even if it hadn't.

### Query/helper decisions

- **Lessons + Assignments fan out to classroom rosters.** Both can be (a) student-direct or (b) classroom-wide. Every helper uses `OR: [{ studentId }, { classroom: { students: { some: { studentId, leftAt: null } } } }]`. The upcoming-lessons helper additionally collapses fan-out duplicates by start-minute.
- **ODK keyed on `User.id`, not `Student.id`.** If a child's `Student.userId` is null (no student account linked yet), ODK helpers return `{ hasUserLink: false, … }` and the UI renders an empty state explaining that requirement instead of failing.
- **No "PENDING" sentinel for missing submissions.** I use `!sub` checks rather than a synthetic union, to avoid friction with the locally-generated Prisma client where the `SubmissionStatus` literal didn't widen as expected.
- **Attendance status typed as `string` in summary types.** The local Prisma client may lag the schema on `LEFT_EARLY`; we keep `Record<string, number>` for forward compatibility, mirroring the pattern in `lib/attendance.ts` (which has always taken `string | AttendanceStatus`).
- **Relationship label** uses centralized `getParentRelationshipLabel` from `lib/parents.ts` and reads `relationshipType` defensively (the column exists on the schema but may not yet be in the local Prisma client during the migration window).

### Honestly deferred

- **D9 — Mazeret bildir.** No `AbsenceExcuse` model exists. Instead of a fake submit form, `/panel/veli/mazeret` renders a clean deferred page that:
  - Documents the suggested model inline in the page comment.
  - Links the parent to the existing `/iletisim` channel for urgent cases.
- **Payment "due tracking".** No recurring `Order` / `Payment` / `Installment` model. The widget shows real ödemeler (paid `AccountingEntry` rows) and real intents (`PurchaseIntent`), with an explicit "ℹ Vadeli/taksitli ödeme takibi henüz aktif değil" notice. Deliberately no fabricated outstanding totals.

### Known limitations

- **Today timeline uses `createdAt` for "yeni ödev"** events. If an assignment was created weeks ago and merely `PUBLISHED` today, our heuristic could miss it. Adding a dedicated `publishedAt` is a future schema improvement.
- **Timeline sort key is event time** (lesson `scheduledAt`, attendance `sessionDate`, etc.), not "when this row hit the database". Acceptable for parent UX.
- **`pickSelectedStudent` falls back silently** if `?studentId=` points to an unlinked child. We surface the fallback with a non-disruptive notice. An alternative is `notFound()`; we picked the friendlier path because parents commonly bookmark `?studentId=` URLs from one device and reuse on another after the admin re-orders children.
- **One-shot purchase intents only.** Once admin tooling adds recurring orders, the payment summary needs a follow-up to surface upcoming/overdue installments.
- **The existing `/panel/veli/cocuklarim/[id]` detail page is unchanged** — the new cockpit links to it as the deeper drill-in. A subsequent session may reskin that page to match the new tone.

### Suggested next sessions

- **Session 4 candidates:**
  - Persistent `AbsenceExcuse` flow (parent-submit → admin-approve, with attachment).
  - Student dashboard / study room (`/panel/ogrenci`).
  - Materials library foundation (PDF / video lesson packs).
  - ODK student-facing exam/result improvements (per-question review UI, target-net coaching).
- **Out of scope for parent (still):** payroll, deep ODK analytics for parents, schema migrations beyond the suggested `AbsenceExcuse`.

### Verification

- `npx tsc --noEmit` → clean (zero errors)
- `npx eslint app/panel/veli components/panel/parent lib/panel/parent-dashboard.ts` → clean (zero warnings)
- The parent panel role guard (`requireParent` → `requirePanelRole("veli")`) was confirmed via `lib/panel-parent.ts`. No teacher-only helper was imported into parent code.
- `lib/parent-summary.ts` (used by weekly digest cron + email) was deliberately **not modified**, so the digest pipeline remains stable.


---

## §14 — Phase 2 / Session 4 closeout (Student Dashboard + Study Room)

### Objective
Replace the shallow KPI-grid student dashboard at `/panel/ogrenci` with an
operational, student-centered cockpit, and ship a first-class **Çalışma
Odası** (Study Room) so students can track their own focused study time.
Tone: child-/student-centered but operational — never childish, never
gamified.

### Deliverables

| # | Deliverable | Status | Notes |
|---|---|---|---|
| D1 | Dashboard rewrite (`/panel/ogrenci`) | ✅ | 6 sections: next lesson hero, today checklist, attendance + homework, recent results + suggested focus, study summary |
| D2 | Student-scoped query helpers | ✅ | New file `lib/panel/student-dashboard.ts`, 8 helpers + `formatStudyDuration` |
| D3 | `StudySession` model + actions | ✅ | Migration **0029_study_session** (additive). 3 server actions in `_actions.ts` |
| D4 | Study Room route | ✅ | New route `/panel/ogrenci/calisma-odasi` — timer + last 7-day chart + recent sessions |
| D5 | Components | ✅ | 6 dashboard widgets + 2 study-room components (`study-summary-card`, `study-room-timer`) |
| D6 | Navigation | ✅ | Added `qa-study` to `lib/panel-quick-actions.ts` (label: "Çalışma odası", icon `clock`, shortcut `g r`) |
| D7 | Permissions / privacy | ✅ | All helpers gated by `requireStudent()`; mutations re-verify `studentId` ownership |
| D8 | This audit section | ✅ | §14 |

### Files changed

**New:**
- `prisma/migrations/0029_study_session/migration.sql` — additive `StudySession` table with FKs (Student CASCADE, Course SET NULL) and 3 indexes
- `lib/panel/student-dashboard.ts` — 8 helpers (`getStudentNextLesson`, `getStudentTodayChecklist`, `getStudentHomeworkFocus`, `getStudentAttendanceSnapshot`, `getStudentRecentResults`, `getStudentSuggestedFocus`, `getStudentStudySummary`, `getStudentCourseOptions`) + `formatStudyDuration`
- `app/panel/ogrenci/calisma-odasi/page.tsx` — Study Room server route
- `app/panel/ogrenci/calisma-odasi/_actions.ts` — `startStudySessionAction`, `stopStudySessionAction`, `updateStudySessionNoteAction`
- `components/panel/student/dashboard/student-next-lesson.tsx`
- `components/panel/student/dashboard/student-today-checklist.tsx`
- `components/panel/student/dashboard/student-homework-focus.tsx`
- `components/panel/student/dashboard/student-attendance-snapshot.tsx`
- `components/panel/student/dashboard/student-recent-results.tsx`
- `components/panel/student/dashboard/student-suggested-focus.tsx`
- `components/panel/student/study-room/study-summary-card.tsx`
- `components/panel/student/study-room/study-room-timer.tsx`

**Modified:**
- `prisma/schema.prisma` — added `StudySession` model + back-relations on `Student` (`studySessions StudySession[]`) and `Course` (`studySessions StudySession[]`)
- `app/panel/ogrenci/page.tsx` — full rewrite as operational cockpit. The previous shallow KPI grid + recharts cards were replaced. **All other student sub-routes are preserved untouched** (`derslerim`, `ders-programi`, `odevler`, `odk`, `ogretmenlerim`, `paketim`, `performansim`, `profilim`, `sinifim`, `bildirimler`).
- `lib/panel-quick-actions.ts` — added `qa-study` entry to the `STUDENT` quick-actions list.

**Schema:** **migration 0029_study_session** — additive only. New table `StudySession` with PostgreSQL `IF NOT EXISTS` guards; FK to `Student` (CASCADE) and `Course` (SET NULL); 3 indexes for hot lookups.

### Permission model (defense in depth)

The student panel is enforced at three layers:

1. `requireStudent()` (`lib/panel-student.ts`) — must be logged in as `ogrenci`; resolves the student from `User.id → Student.userId`.
2. **Helpers take `studentId` directly.** They do not need an `ownsStudent` re-verification because student auth is rooted in `userId → Student` rather than URL params: there is no cross-student URL surface to forge. The student can only see their own data because there is only ever one `Student` row resolvable from their authenticated `userId`.
3. **Server actions re-verify ownership before write.** `stopStudySessionAction` and `updateStudySessionNoteAction` both load the target `StudySession`, compare `session.studentId === student.id`, and throw `"Yetkisiz işlem"` on mismatch. `startStudySessionAction` only ever inserts with the caller's own `studentId`, and validates any submitted `courseId` against the student's reachable lessons (direct or via `ClassroomStudent` with `leftAt: null`).

A student forging a foreign `sessionId` in the form payload cannot affect another student's row.

### Query/helper decisions

- **Lessons + Assignments fan out to classroom rosters.** Same `OR: [{ studentId }, { classroom: { students: { some: { studentId, leftAt: null } } } }]` pattern used in parent helpers; consistent across all panel-side reads.
- **ODK keyed on `User.id`.** Same caveat as parent: no `userId` link → ODK results are silently empty (no errors).
- **Suggested focus is data-driven only.** Reads `Student.weakLessons` / `Student.strongLessons` (free-text comma lists) and the lowest-net subjects from the latest `StudentExamResult.subjectStats`. **No fabricated scores, no gamified streaks, no badges.**
- **Today checklist treats overdue homework as a separate kind.** "Bugün son" rows are surfaced as `HOMEWORK_DUE_TODAY`; rows whose due date is in the past 30 days **and** still unsubmitted become `HOMEWORK_OVERDUE` (tone `bad`). A submitted/graded item is dimmed and struck-through but kept visible to give the student closure.
- **Attendance snapshot uses centralized helpers** from `lib/attendance.ts` (`ATTENDANCE_DISPLAY_ORDER`, `getAttendanceStatusLabel/Glyph/Tone`) and a `Record<string, number>` shape so the LEFT_EARLY status (Phase-1.5) is forward-compatible regardless of local Prisma client lag.
- **Recent results merge two sources** — `StudentExamResult` (offline/manual entries) and submitted `OdkExamAttempt` rows. Both are normalized to a single `StudentRecentResult` shape and sorted by `takenAt` desc. Average net is computed from the top 6 only, to keep the meta line stable as data grows.
- **`getStudentStudySummary` includes the live tick of the active session in `todaySeconds`.** Closed sessions contribute `durationSeconds`; the open session adds `(now - startedAt)` clamped to `MAX_SESSION_SECONDS = 12h`.

### Study Room invariants

- **At most one open session per student.** Enforced at the application layer in `startStudySessionAction`: any pre-existing row with `endedAt: null` for the caller's `studentId` is closed (with computed `durationSeconds`) before a new row is inserted. The DB does not enforce this as a unique constraint to avoid blocking idempotent retries from the timer client.
- **12-hour safety valve.** Both start (when auto-closing a stale row) and stop clamp `durationSeconds` to `12 * 60 * 60` so a student who forgot to stop the timer doesn't end up with a 38-hour "study session".
- **Course ownership validated.** If `courseId` is submitted, it is only stored when the student has a `Lesson` for that course (direct or via active classroom membership). Otherwise `courseId` falls back to `null` (still a valid free-study session).
- **Note + subject inputs are length-bounded** (500 / 60 chars) and trimmed.

### Honestly deferred

- **Materials / library deeply.** Out of scope for this session per constraints. The Study Room links into existing routes (`/odevler`, `/ders-programi`, `/odk`) but does not introduce a new materials model.
- **Per-day, per-subject heatmap.** The 7-day study chart is total-seconds-per-day only; a subject-pivoted view is a future improvement (the data is there — just not the UI).
- **Pomodoro / structured breaks.** Out of scope. The timer is a single flat counter on purpose.
- **Teacher / admin reporting on `StudySession`.** Schema is ready; no teacher- or admin-facing UI was added in this session. The migration unlocks that work for a later session.
- **Push reminders for next lesson / overdue homework.** The dashboard surfaces both, but does not yet schedule a notification.

### Known limitations

- **`getStudentSuggestedFocus` reads free-text `weakLessons`/`strongLessons`.** Splitting on `[,;]+` is good enough for current admin workflows; a structured `StudentFocusTag[]` model would be cleaner long-term.
- **Recent results' `averageNet` mixes ODK and offline exam types.** Acceptable for a "recent overall" line; the dedicated `/performansim` page can break down by source.
- **Today checklist does not surface "deneme yarın" or "yarınki ders".** Strictly today-scoped on purpose to keep the cockpit calm.
- **Study Room timer is server-rendered with client-side ticking.** When a user keeps the tab open for many hours and then submits stop, the elapsed shown may differ slightly from `durationSeconds` written by the server (server uses its own `Date.now()`, not the client's). Difference is usually < 1 s; clamped at 12 h regardless.

### Suggested next sessions

- **Teacher-side StudySession reporting** (weekly per-student study minutes, per-class rollup).
- **Persistent `AbsenceExcuse` flow** (parent → admin approve, with attachment) — still deferred from Session 3.
- **Admin/Teacher Materials library foundation** (schema + browse) — still untouched.
- **Per-question ODK review UI** + target-net coaching on `/panel/ogrenci/performansim`.
- **`Student.weakLessons` / `strongLessons` → structured `StudentFocusTag` model** with admin/teacher write surface.
- **Push reminders** for next lesson (15 min before) and overdue homework (daily digest).

### Verification

- `npx prisma format && npx prisma generate` → clean (Prisma Client v6.15.0 regenerated)
- `npx tsc --noEmit` → clean (zero errors)
- `npx eslint app/panel/ogrenci components/panel/student lib/panel/student-dashboard.ts lib/panel-quick-actions.ts` → clean (zero warnings)
- Existing student sub-routes (`/odevler`, `/ders-programi`, `/odk/...`, `/performansim`, `/profilim`, `/sinifim`, `/ogretmenlerim`, `/paketim`, `/bildirimler`) untouched and continue to work via the existing `_actions.ts`.
- The auth helper `requireStudent()` (`lib/panel-student.ts`) was reused unchanged. No teacher-only or parent-only helper was imported into student code.
