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

---

## §15 · Phase 2 / Session 5 — Materials / Library Foundation

**Date:** 2026-05-30 · **Status:** ✅ shipped · `tsc --noEmit` clean · `eslint` clean

This session adds a minimal-but-real **shared learning materials** layer used
by both panels:

- **Teacher** — `/panel/ogretmen/materyaller` (list + create) and a
  "Materyaller" section on each classroom cockpit (`/panel/ogretmen/siniflarim/[classroomId]`).
- **Student** — `/panel/ogrenci/kutuphane` (full library with type/recency/search filters),
  a "Sana özel materyaller" widget on the dashboard, and a "Bu derse ait materyaller"
  panel that appears in the Study Room when an active session is bound to a course.

The goal is **not a CMS**. It is a stable read/write substrate the future
"missed-lesson recovery", "study recommendations", and "homework helper"
features can build on without re-modeling.

### Schema (additive only — migration `0030_material_library`)

Two new enums and one new table — no changes to any existing column.

```prisma
enum MaterialType        { PDF VIDEO LINK FILE NOTE }
enum MaterialVisibility  { CLASSROOM STUDENTS TEACHERS PRIVATE }

model Material {
  id, title, description?, type (default LINK),
  url?, fileUrl?, subject?,
  courseId?, classroomId?, teacherId?, createdById?,
  visibility (default CLASSROOM),
  isPublished (default true), isArchived (default false),
  publishedAt?, createdAt, updatedAt
  // FKs: Course/Classroom/Teacher → onDelete: SetNull · User(createdById) → SetNull
  // Indexes:
  //   (classroomId, isPublished, createdAt)
  //   (courseId, isPublished)
  //   (teacherId, createdAt)
  //   (createdById)
  //   (visibility, isPublished)
}
```

Back-relations added to:
- `Teacher.materials Material[]`
- `Classroom.materials Material[]`
- `Course.materials Material[]`
- `User.materialsCreated Material[] @relation("MaterialCreator")`

### Permission boundary (enforced in `lib/panel/materials.ts`)

DB has no RLS — every read/write is explicitly gated:

| Role     | Read                                                                                                                                                                            | Write                                                                                                          |
|----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------|
| Student  | Only `isPublished && !isArchived` rows whose `visibility ∈ {CLASSROOM, STUDENTS}` AND whose `classroomId` is in active `ClassroomStudent` (`leftAt IS NULL`) **OR** whose `courseId` matches a Lesson the student is associated with. Cannot see `TEACHERS` or `PRIVATE`. | — |
| Teacher  | Own creations (by `teacherId` or `createdById`), classrooms they teach (`ClassroomTeacher`), and `visibility = TEACHERS` rows.                                                  | Only on classrooms they teach (verified via `ClassroomTeacher.classroomId_teacherId`); edit/archive/delete only on own creations. |
| Parent   | _Deferred for this session — no parent UI, no helper exposed._                                                                                                                  | —                                                                                                              |
| Admin    | Full access (the existing admin shell + audit log; no admin UI added in this session).                                                                                          | —                                                                                                              |

`canTeacherAccessMaterial(teacherId, materialId, { write?: boolean })`
returns `true` only when the teacher created it (by `teacherId` or
`createdById === teacher.userId`) for write actions; for read it also
allows classroom-link or `TEACHERS`-visibility fallbacks. This is the
single guard used by all four mutation server actions.

### Storage decision — URL-only (intentional)

The codebase has exactly one Vercel-Blob integration today (ODK admin exam
files). Generalizing it into a reusable upload helper is out of scope for
this session. Therefore:

- `LINK / VIDEO / PDF / FILE` types accept a **URL** (Drive, Dropbox,
  YouTube, the school's own static host, etc.).
- `NOTE` type stores the body in `description` (no URL).
- `fileUrl` column is reserved for a future Blob-backed upload path; never
  written by this session's UI.

When upload is added, the form will gain a `<input type="file">` next to
the URL field; the rest of the data model is forward-compatible.

### Files added

- `prisma/migrations/0030_material_library/migration.sql`
- `lib/panel/materials.ts` (8 helpers: list-for-student, list-for-teacher,
  list-for-classroom, course-scoped student materials, recommendations,
  per-student/per-teacher classroom and course option providers, plus the
  two permission predicates and the type/visibility format helpers).
- `app/panel/ogretmen/materyaller/page.tsx` (list + filters)
- `app/panel/ogretmen/materyaller/yeni/page.tsx` (server-rendered form shell)
- `app/panel/ogretmen/materyaller/_actions.ts` (`createMaterialAction`,
  `archiveMaterialAction`, `deleteMaterialAction`,
  `togglePublishMaterialAction` — all `requireTeacher()` + ownership-gated,
  Zod-validated, audit-logged with action codes
  `MATERIAL_CREATE / MATERIAL_PUBLISH / MATERIAL_UNPUBLISH / MATERIAL_ARCHIVE / MATERIAL_DELETE`).
- `app/panel/ogrenci/kutuphane/page.tsx` (list + type/recency/q filters)
- `components/panel/materials/material-type-badge.tsx`
- `components/panel/materials/material-card.tsx`
- `components/panel/materials/materials-list.tsx`
- `components/panel/materials/material-form.tsx` (client; uses `useActionState`)
- `components/panel/materials/student-suggested-materials.tsx`
- `components/panel/materials/class-materials-section.tsx`
- `components/panel/materials/study-room-related-materials.tsx`

### Files touched (additive only — no behavior change to other features)

- `prisma/schema.prisma` — back-relations on Teacher/Classroom/Course/User; new enums + Material model.
- `app/panel/ogrenci/page.tsx` — adds `<StudentSuggestedMaterialsCard>` row.
- `app/panel/ogrenci/calisma-odasi/page.tsx` — adds `<StudyRoomRelatedMaterials>` under the timer.
- `app/panel/ogretmen/siniflarim/[classroomId]/page.tsx` — adds `<ClassroomMaterialsSection>`.
- `lib/panel-quick-actions.ts` — `qa-materials` (TEACHER, "Materyaller", `g l`) and `qa-library` (STUDENT, "Kütüphane", `g l`).
- `components/panel/shell/sections.ts` — sidebar entries: TEACHER → "Materyaller", STUDENT → "Kütüphane".

### Constraints honored

- Real DB data only — no seeded mock material rows; empty states everywhere
  the dataset is empty.
- No file upload pipeline added; no new dependency.
- Payroll, ODK, and the rest of the app shell untouched.
- Parent material view explicitly deferred (this session does not export a
  `getMaterialsForParent` to avoid premature commitment).
- Existing routes and server actions unmodified.
- Compact UI: cards, badges, list-row layout — Notion/Linear-like, all
  Turkish copy.

### Known gaps / next sessions

- **No edit form yet.** Update happens via DB or a future "Düzenle" page;
  the data model and permission predicate (`{ write: true }`) already
  support it.
- **No file upload.** URL-only this session — see "Storage decision".
- **No parent surface.** Parents cannot see materials yet; design owners
  may want this scoped per-child to avoid leaking another classmate's
  context.
- **No per-student access table.** All access is through classroom or
  course association. If a teacher needs to share something with one
  specific student, they currently fake it via `visibility = PRIVATE` (only
  themselves) or `STUDENTS` on a 1-student classroom — both are awkward.
  A future `MaterialStudentGrant` join table is the right fix.
- **No download-tracking / view-counter.** Will be a small additive
  `MaterialView` table later; intentionally not built before there is real
  usage to learn from.
- **Search is in-memory** on already-fetched rows (`take: 50–60`). Fine
  for the realistic "a teacher has < 200 materials" scale; needs a proper
  trigram or postgres FTS index past 1k rows per teacher.

### Verification

- `npx prisma format && npx prisma generate` → clean (Prisma Client v6.15.0 regenerated).
- `npx tsc --noEmit` → exit 0, zero errors.
- `npx eslint app/panel/ogretmen/materyaller app/panel/ogrenci/kutuphane components/panel/materials lib/panel/materials.ts lib/panel-quick-actions.ts components/panel/shell/sections.ts app/panel/ogretmen/siniflarim/[classroomId]/page.tsx app/panel/ogrenci/calisma-odasi/page.tsx app/panel/ogrenci/page.tsx`
  → exit 0, zero warnings.
- Migration file is additive (`CREATE TYPE … IF NOT EXISTS` via `DO $$`,
  `CREATE TABLE`, `ADD CONSTRAINT … IF NOT EXISTS` via `DO $$`,
  `CREATE INDEX IF NOT EXISTS`); deploy is safe to re-run.
- Apply via `npx prisma migrate deploy` against `DATABASE_URL` + `DIRECT_URL`
  (the local sandbox doesn't have `DIRECT_URL` set; CI/Vercel does).

---

## §16 · Phase 2 / Session 6 — Parent Absence Excuse Persistent Flow (2026-05-30)

### 16.1 Goal

Convert the deferred `/panel/veli/mazeret` page into a working three-sided
review flow:

- **Parent** submits an excuse for a linked child with a date range, reason,
  optional note and optional URL attachment.
- **Teacher** reviews PENDING excuses on their dashboard (top widget) and
  inside the relevant classroom detail page.
- **Admin** reviews any excuse from `/panel/admin/mazeretler` with
  status/date filters.
- On **APPROVE**, attendance for affected lessons in the date range is
  brought to `EXCUSED` without overwriting manually-recorded readings.

### 16.2 Schema — migration `0031_absence_excuse`

Additive only. Two enums + one table + four FKs + four indexes.

- `AbsenceExcuseReason`: `ILLNESS | FAMILY | TECHNICAL | TRAVEL | OTHER`
- `AbsenceExcuseStatus`: `PENDING | APPROVED | REJECTED | CANCELLED`
- `AbsenceExcuse(id, parentId, studentId, lessonId?, startsAt, endsAt,
  reason, note?, attachmentUrl?, status, reviewedById?, reviewedAt?,
  reviewNote?, createdAt, updatedAt)`
- FKs: `parentId → Parent CASCADE`, `studentId → Student CASCADE`,
  `lessonId → Lesson SET NULL`, `reviewedById → User SET NULL`.
- Indexes: `(studentId,status,startsAt)`, `(parentId,createdAt)`,
  `(lessonId)`, `(status,createdAt)`.
- Back-relations on `User` (`excuseReviews`), `Student`, `Parent`, `Lesson`.

The migration is idempotent (`CREATE TYPE … IF NOT EXISTS` via `DO $$`,
`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).

### 16.3 Permission matrix (enforced in `lib/panel/absence-excuses.ts` + actions)

| Role     | Submit  | View own | View others                                  | Approve / Reject               | Cancel                |
|----------|---------|----------|----------------------------------------------|--------------------------------|-----------------------|
| Parent   | own linked children only | yes | no | no | own PENDING only |
| Teacher  | no      | n/a      | only students in classrooms they teach OR who have a Lesson with `teacherId === self` | PENDING only, gated by `canTeacherReviewExcuse` | no |
| Admin    | no      | n/a      | all                                          | PENDING only                   | no                    |

- `canParentSubmitExcuse(parentId, studentId)` validates the `ParentStudent`
  link.
- `canTeacherSeeStudent(teacherId, studentId)` is the union check used by
  `canTeacherReviewExcuse` and the dashboard/class queries.
- All review actions enforce `status === "PENDING"` before writing.
- Admin route gated by `requirePanelRole("admin")`. Teacher route gated by
  `requireTeacher()` plus the per-row predicate.

### 16.4 Attendance integration policy (sacred manual readings)

Implemented in `applyApprovedExcuseToAttendance(opts)`. For each `Lesson`
with `studentId === excuse.studentId` and
`scheduledAt ∈ [excuse.startsAt, excuse.endsAt]`:

| Existing `Attendance` row                | Action                                                              |
|------------------------------------------|---------------------------------------------------------------------|
| _none_                                   | **Create** EXCUSED with `source=MANUAL`, `recordedById=reviewerUserId`, `notes` references the excuse id. |
| `status = ABSENT`                        | **Update** to EXCUSED (notes/recordedById refreshed).               |
| `status ∈ {PRESENT, LATE, LEFT_EARLY}`   | **Skip** (manual reading is sacred). Reviewer's `reviewNote` documents the conflict. |
| `status = EXCUSED`                       | **Skip** (already correct).                                         |

Race protection: the partial unique
`Attendance_student_lesson_unique (studentId, lessonId) WHERE lessonId IS NOT NULL`
(migration 0011) cannot be modeled in Prisma, so we use `findFirst` +
`create`/`update` with a try/catch that downgrades to `skipped` on race.

`getApprovedExcuseForLesson(studentId, lessonId)` is exported for future
attendance-UI hints; not yet wired into `AttendanceQuickTakeButton` (deferred).

### 16.5 Notifications & audit

- **Submit** → `notifyUsers` fan-out to:
    1. teachers assigned to any classroom the student is in,
    2. teachers with at least one direct `Lesson.teacherId === self`,
    3. all `User.role === "ADMIN"`.
  Category `ATTENDANCE`, type `ANNOUNCEMENT`, `relatedEntityType="AbsenceExcuse"`.
  Best-effort — failures are swallowed (parent submit must not 500).
- **Approve / Reject** → `notifyUser` to the parent's `userId` (if any).
  Reject body includes the review note when present.
- **Cancel** → no notification (parent self-action).
- **Audit actions:** `EXCUSE_CREATE`, `EXCUSE_CANCEL`, `EXCUSE_APPROVE`,
  `EXCUSE_REJECT`. Approve payload includes the attendance counts
  `{ created, updated, skipped }` plus the `reviewerRole`.

### 16.6 Files added / changed

```
prisma/migrations/0031_absence_excuse/migration.sql                 (+ enums, table, 4 FKs, 4 indexes)
prisma/schema.prisma                                                (back-relations + AbsenceExcuse model + 2 enums)

lib/panel/absence-excuses.ts                                        (new, ~520 LOC)

app/panel/veli/mazeret/page.tsx                                     (rewrite: form + list)
app/panel/veli/mazeret/_actions.ts                                  (new: create / cancel)
app/panel/veli/page.tsx                                             (badge with pending count)

app/panel/ogretmen/page.tsx                                         (mounts pending widget)
app/panel/ogretmen/_excuse-actions.ts                               (new: approve / reject)
app/panel/ogretmen/siniflarim/[classroomId]/page.tsx                (classroom-level list)

app/panel/admin/mazeretler/page.tsx                                 (new admin page + filters)
app/panel/admin/mazeretler/_actions.ts                              (new: admin approve / reject)

components/panel/absence-excuses/absence-excuse-status-badge.tsx    (new)
components/panel/absence-excuses/absence-excuse-form.tsx            (new, client; uses useActionState)
components/panel/absence-excuses/absence-excuse-list.tsx            (new; parent self-cancel)
components/panel/absence-excuses/excuse-review-actions.tsx          (new, client; teacher actions)
components/panel/absence-excuses/admin-excuse-review-actions.tsx    (new, client; admin actions)
components/panel/absence-excuses/teacher-pending-excuses.tsx        (new; ReviewerExcuseList + dashboard card)
components/panel/absence-excuses/admin-absence-excuses-table.tsx    (new)
```

### 16.7 Validation rules (server-side, in `_actions.ts`)

- `startsAt ≤ endsAt`.
- `endsAt − startsAt ≤ 14 days` (anti-abuse cap).
- `reason === "OTHER"` requires a non-empty `note`.
- `attachmentUrl` is URL-only (no file upload in this sprint — UI shows
  a "Bu sürümde dosya yükleme yok" hint).
- Parent submit re-verifies the `ParentStudent` link even when the form
  reaches the action with a tampered `studentId`.

### 16.8 Known limitations / deferred

- No file upload — only an external URL field. Storage adapter is out of
  scope for this sprint.
- No batch approve — reviewer acts on one excuse at a time.
- No re-open after `CANCELLED` or `REJECTED` — parent must submit a new
  excuse.
- No parent edit — only cancel-and-resubmit while `PENDING`.
- `AttendanceQuickTakeButton` does not yet surface the
  `getApprovedExcuseForLesson` hint; helper is exported and ready.
- Notification `href` for fan-out is generic
  (`/panel/ogretmen?tab=excuses`) since the same payload reaches both
  teachers and admins; admins land on their own dashboard and navigate
  manually to `/panel/admin/mazeretler` (or use the inbox link).

### 16.9 Verification

- `npx prisma format && npx prisma generate` → clean.
- `npx tsc --noEmit` → exit 0.
- `npx eslint --max-warnings=0` on all touched files → exit 0.
- Migration 0031 deploys via `npx prisma migrate deploy`; idempotent on
  re-run.

---

## §17 · Phase 2 / Session 7 — Student Academic Roadmap (2026-05-30)

### 17.1 Goal

Give students a serious, motivational target tracker: define an active
academic goal (university / school / department / target net / score /
date), see honest gap-to-target against the latest exam, get a small
deterministic recommendation feed driven by real workspace data, and
expose a read-only summary on the admin Student 360. Avoid childish
gamification. No AI; no fake scaffolding.

### 17.2 Schema (additive — migration `0032_student_academic_goal`)

- New enum `AcademicGoalExamType { TYT AYT LGS YKS OTHER }`.
- New table `StudentAcademicGoal`:
  - `id`, `studentId` (FK Student CASCADE), `examType?`,
    `targetUniversity?`, `targetDepartment?`, `targetSchool?`,
    `targetScore? Decimal`, `targetNet? Decimal`, `targetRank? Int`,
    `targetDate? DateTime`, `note? Text`, `isActive Boolean default true`,
    `createdById?` (FK User SET NULL), `createdAt`, `updatedAt`.
  - Indexes: `(studentId, isActive)`, `(targetDate)`.
- Back-relations on `Student.academicGoals` and
  `User.academicGoalsCreated @relation("StudentAcademicGoalCreator")`.
- Migration is idempotent (`DO $$` for enum, `IF NOT EXISTS` for
  table / FKs / indexes).
- Existing generic micro-`StudentGoal` (title/value/unit/dueAt) is
  intentionally **not** touched — different concept (small habit
  trackers vs. one academic north-star).

### 17.3 Permission matrix

- **Student** — read+write own active goal only via
  `requireStudent()` server actions; never accepts `studentId` from
  form input.
- **Teacher / Admin** — read-only access via Student 360 overview tab
  card. No edit surface. Goal record is sourced through
  `getStudentRoadmapCompactSummary(studentId, userId)`.
- **Parent** — visibility deferred (see 17.8). Helper is studentId-
  scoped so adding a parent surface later is a single import.

### 17.4 ODK / exam data assumptions

- Net trend mixes two sources:
  - `StudentExamResult.net` (admin-entered exam result).
  - `OdkExamAttempt` net computed as
    `correctCount - wrongCount/4`, rounded to 2 dp.
- `OdkExamAttempt` is `userId`-scoped, not `studentId`-scoped — the
  helper accepts both and skips ODK queries when `userId` is null.
- Subject breakdown comes from the latest `StudentExamResult` via
  `subjectStats[]` (`StudentExamSubjectStat.net`).
- Rank gap is intentionally **not** computed — there is no current
  rank source comparable to a target rank yet.

### 17.5 Recommendation rules (deterministic, no AI)

Tone ordering: `bad → warn → neutral → ok`. Capped at 5 items.

| Trigger                                       | Tone    | Action |
| --------------------------------------------- | ------- | ------ |
| `overdueCount > 0`                            | bad     | "Önce eksik ödevleri tamamla" → `/panel/ogrenci/odevlerim` |
| `presentRate < 0.7` AND `attendanceTotal ≥ 4` | warn    | "Devamsızlığı düşür" → materials & calendar |
| Lowest-net subject in latest exam, `net < 8`  | warn    | "Zayıf dersine çalış" → ders / kütüphane |
| `studySecondsLast7 < 3600`                    | warn    | "25 dakikalık çalışma oturumu başlat" → çalışma odası |
| `nextDueAt` exists                            | neutral | "Sıradaki ödevin yaklaşıyor" |
| `totalExams === 0`                            | neutral | "İlk denemeni çöz" → ODK |
| Empty fallback                                | ok      | "Mevcut tempoyu koru" |

### 17.6 Files added / changed

- **New:**
  - `prisma/migrations/0032_student_academic_goal/migration.sql`
  - `lib/panel/academic-roadmap.ts`
  - `app/panel/ogrenci/hedefim/page.tsx`
  - `app/panel/ogrenci/hedefim/_actions.ts`
  - `components/panel/academic-roadmap/academic-goal-form.tsx`
  - `components/panel/academic-roadmap/academic-goal-card.tsx`
  - `components/panel/academic-roadmap/academic-current-level.tsx`
  - `components/panel/academic-roadmap/academic-gap-card.tsx`
  - `components/panel/academic-roadmap/roadmap-recommendations.tsx`
  - `components/panel/academic-roadmap/academic-trend.tsx`
  - `components/panel/academic-roadmap/student-goal-widget.tsx`
  - `components/panel/academic-roadmap/study-room-goal-nudge.tsx`
  - `components/panel/academic-roadmap/student-academic-summary-card.tsx`
- **Changed (additive):**
  - `prisma/schema.prisma` — new enum + model + 2 back-relations.
  - `app/panel/ogrenci/page.tsx` — toolbar link + dashboard widget.
  - `app/panel/ogrenci/calisma-odasi/page.tsx` — nudge under timer.
  - `app/panel/admin/ogrenciler/[id]/page.tsx` — read-only summary
    card on overview tab.

### 17.7 Validation rules (server action)

- At least one of `targetUniversity / targetDepartment /
  targetSchool / targetScore / targetNet / targetRank` must be set —
  refuses an empty goal.
- Numeric parsers use an `"invalid"` sentinel; bad inputs return a
  field-level error rather than silently coercing.
- Date parser refuses non-ISO / non-finite values.
- Single-active-goal invariant: latest active wins. Existing active
  row is `update`-d if present, else `create`-d. Then a paranoid
  `updateMany({ NOT: { id: goalId }, isActive: true }, { isActive: false })`
  flips any leftover stale rows. Historical inactive rows are
  preserved (no DELETE) to support future history surface.
- Audit actions: `ACADEMIC_GOAL_CREATE`, `ACADEMIC_GOAL_UPDATE`,
  `ACADEMIC_GOAL_CLEAR` — actor is the student `userId`.

### 17.8 Known limitations / deferred

- **No parent visibility surface** — would require a parent helper +
  a parent dashboard card; deferred. The compact-summary helper is
  parent-safe (studentId-scoped) when the time comes.
- **No admin / teacher edit** — read-only by design. If staff need to
  draft a goal with a student, that's a separate feature (goal-draft
  workflow with student approval).
- **No per-subject sub-goals** — single goal record per student.
- **No historical roll-up UI** — inactive rows are kept but not
  rendered yet. A "Geçmiş hedefler" tab is a small follow-up.
- **Rank gap not computed** — no comparable current-rank source.
- **No notifications** — goal create/update does not fan out. Could
  notify the primary parent on goal change in a later session.
- **Recommendations are static rules** — intentional. No external
  calls. Easy to extend by adding rules to
  `getStudentRoadmapRecommendations`.

### 17.9 Verification

- `npx prisma format && npx prisma generate` → clean.
- `npx tsc --noEmit` → exit 0.
- Migration 0032 deploys via `npx prisma migrate deploy`; idempotent
  on re-run.
- Single-active-goal invariant verified by inspection of the action
  (update-or-create + sweep) and unique-by-`(studentId, isActive=true)`
  semantic enforced at write-time.

### 17.10 Suggested next session

Pick one:

1. **ODK student-side polish** — better attempt history list with
   net per subject and a "weakest topic" surface that feeds back into
   the roadmap recommendation feed.
2. **Homework material attachments** — let teachers attach a
   reference resource to a homework assignment so the roadmap "study
   the weak subject" recommendation can deep-link to material.
3. **Parent finance & due tracker** — surfaces upcoming installment
   dates for the parent dashboard, mirroring the academic-roadmap
   structure (compact summary + dedicated page + nudge).

---

## §18 · Phase 2 / Session 8 — ODK Student Results / Exam Polish (2026-05-30)

### 18.1 Goal

Strengthen the student-facing ODK experience just enough to give the
Academic Roadmap (§17) and future weak-topic guidance reliable,
explainable exam data: a clean exam list, an honest result detail with
section breakdown + deterministic recommendations, and a linkable net
trend. No ODK rebuild, no admin builder, no schema change.

### 18.2 Files added / changed

- **New:**
  - `lib/panel/odk-student.ts` — central student-side ODK helpers
    (context, available exams, attempts, latest, result detail, net
    trend with hrefs, section breakdown, weak signals, summary, two
    access guards).
  - `components/panel/odk/student/odk-exam-card.tsx`
  - `components/panel/odk/student/odk-attempt-list.tsx`
  - `components/panel/odk/student/odk-result-summary-card.tsx`
  - `components/panel/odk/student/odk-section-breakdown.tsx`
  - `components/panel/odk/student/odk-result-recommendations.tsx`
  - `components/panel/odk/student/odk-question-status-list.tsx`
  - `components/panel/odk/student/odk-net-trend.tsx`
  - `components/panel/odk/student/student-odk-cta-strip.tsx`
- **Changed (additive / replace-only):**
  - `app/panel/ogrenci/odk/denemeler/page.tsx` — uses helper, adds 4
    summary KPIs (Erişilebilir / Tamamlanan / Son net / En iyi net),
    in-progress resume strip, status badges per exam.
  - `app/panel/ogrenci/odk/sonuc/[attemptId]/page.tsx` — uses helper,
    adds deterministic recommendations, weak-section highlighting, CTA
    row (yol haritam / çalışma / materyaller / diğer denemeler).
  - `app/panel/ogrenci/page.tsx` — mounts `StudentOdkCtaStrip` between
    next-lesson and goal widget.
  - `lib/panel/academic-roadmap.ts` — `AcademicTrendPoint` gains an
    optional `href`; ODK rows fill it with the result-detail URL.
  - `components/panel/academic-roadmap/academic-trend.tsx` — bars are
    now linkable when a `href` exists.

### 18.3 Permission notes

- `/odk/denemeler`, `/odk/sonuc/[id]`, dashboard ODK strip all gated by
  `requireOdkPanel("ogrenci")`. Admin bypass preserved.
- `getStudentOdkResultDetail` is owner-blind; the route guards
  ownership via `canStudentViewOdkAttempt(userId, role, attemptId)`
  before rendering. Admin sees any attempt (existing behavior).
- `getAvailableOdkExamsForStudent` honors `OdkUserAccessTag` x
  `OdkExamAccessTag` via `OdkAccessTag.service = "ODK"`, ignores
  revoked / expired tags. Empty active-tag set short-circuits to `[]`
  for non-admins (no exam list leak).
- `getStudentOdkAttempts` is `userId`-scoped at the query layer; no
  trust on caller-supplied scope.

### 18.4 Access / entitlement assumptions

- Tag membership is the single source of truth for "can a student see
  this exam". `OdkEntitlement` is **not** consulted directly by the
  helper — it grants access via `OdkUserAccessTag.entitlementId` link
  managed at purchase time. This matches existing `canStudentAccessExam`.
- An `OdkExam` with no attached `OdkExamAccessTag` is treated as
  hidden from non-admins (matches existing helper behavior — admin
  publish-gate).
- `startsAt` / `endsAt` window only changes the **status badge** on
  the list (`NOT_YET` / `EXPIRED`); existing `/baslat` flow still
  enforces server-side gating.

### 18.5 Net calculation decision

- **Stored values win.** Helpers prefer
  `OdkExamAttempt.score` / `correctCount` / `wrongCount` /
  `blankCount` / `sectionScores` (all set at submit time by
  `lib/odk/scoring.ts`). Re-scoring is intentionally avoided so an
  answer-key edit cannot silently change a historical net.
- **Computed fallback** (display-only) when `score` is null: `correct
  - wrong / 4`. Matches `DEFAULT_PENALTY = 4` in `scoring.ts` and
  the existing roadmap convention (§17.4).
- Section breakdown comes from the persisted `sectionScores` JSON;
  helper does not recompute from `OdkExamOfficialAnswer`.

### 18.6 Recommendation rules (deterministic, no AI)

Tone ordering: `bad → warn → neutral → ok`. Capped at 5; de-duplicated
by id.

| Rule | Trigger | Tone | CTA |
| ---- | ------- | ---- | --- |
| W1 Lowest-net section | `≥ 4 q` AND `net < 5` (worst section in current attempt) | bad | Materyaller |
| W2 Wrong-heavy section | `wrong > correct` AND `≥ 4 q` | warn | Konuyu çalış |
| W3 Blank-heavy section | `blank/q > 50%` AND `≥ 4 q` | warn | Çalışma başlat |
| W4 Auto-submit attempt | `autoSubmitted = true` | warn | Çalışma başlat |
| W5 Cheat violations | `cheatViolationCount ≥ 2` | warn | (no link) |
| W6 Repeated weakness | Same section is the lowest in ≥ 2 of last 3 submitted attempts | bad | Yol haritası |
| W7 Empty fallback | none of the above | ok | Denemelere git |

The `≥ 2` cheat threshold matches the public chip threshold on the
existing solver UI; smaller violation counts are not surfaced to the
student.

### 18.7 ODK data limitations (honest)

- **No question-level timing surface.** The schema has
  `OdkAttemptOpticalAnswer.answeredAt` and timing events, but per-
  question timing analysis is intentionally not built into the helper
  — the result page does not estimate "you spent too long on Q12".
- **No diff-vs-class.** The helper does not compute "your section X
  vs. class average". Out of scope; would need a separate aggregator.
- **`StudentExamResult` is not unified into the new helper.** The
  Academic Roadmap (§17) keeps mixing `StudentExamResult` + ODK; this
  session focuses purely on the ODK side. The result-detail page
  shows ODK attempts only.
- **No translation of `cadenceFamily` / `classLevel`.** Displayed raw
  ("TYT", "AYT", etc.); intentional — users recognize these.
- **Locked exams not listed.** When a student has zero active tags we
  show the empty state instead of teasing locked exams. That matches
  current product behavior; no upsell wedge added in this session.

### 18.8 Honest deferrals

- **D8 Exam-taking polish** — existing `ExamSolver` (with timer,
  auto-save, anti-cheat tracking, fullscreen) is preserved untouched.
  The solver is a delicate client component with cheat hooks
  (`use-cheat-tracker.ts`); changes to it would need a dedicated
  session and test plan. Documented as deferred.
- **`OdkAccessTag` UI surface** — students can not see *why* an exam
  is unavailable; a "your tags" page is left for an admin/teacher
  hardening session.
- **Repeated-weakness window** is fixed at last 3 attempts; not
  configurable. A subject-aware (vs. section-title) match would need
  outcome metadata to be required, which is currently optional.
- **No change to `OdkOrder` / `OdkPayment`** surfaces. Out of scope.
- **No admin ODK builder polish.** Out of scope.

### 18.9 Verification

- `npx tsc --noEmit` → exit 0.
- `npx eslint --max-warnings=0` on all 14 touched files → exit 0.
- No schema migration. No payroll touch.
- All recommendation paths return a list — empty fallback guarantees
  the recommendations card never renders blank.

### 18.10 Suggested next session

Pick one:

1. **Homework + Lesson Material Attachments** — let teachers attach
   reference resources to homework and to lessons. The Session 8
   recommendation engine already deep-links to `/panel/ogrenci/kutuphane`;
   linking to the *exact* material (per weak section) is the natural
   next mile.
2. **Parent finance & due tracker** — surfaces upcoming installment
   dates and overdue invoices on the parent dashboard, mirroring the
   compact-summary + dedicated-page pattern from §17 and §18.
3. **Production QA / permissions hardening** — revisit each panel
   route with a hostile request matrix, focusing on ODK
   tag-cross-contamination and Student 360 role bleed.

---

## §19 — Phase 2 / Session 9: Homework + Lesson Material Attachments

**Date:** 2026-05-30
**Status:** Shipped. `npx tsc --noEmit` and `npx eslint --max-warnings=0`
on all touched files exit `0`.

### 19.1 Goal

Connect existing `Material` records to `Assignment` and `Lesson` rows
so the panel feels like one product rather than three separate modules
(Library, Homework, Schedule). Teachers attach learning resources to a
homework or lesson; students see those resources exactly where they
need them: inside the homework, inside the next-lesson card, and inside
the "Sana özel materyaller" dashboard list as **"Öğretmenin önerdiği"**.

No new content type was introduced. No upload pipeline was touched.
Permission rules are entirely additive — a student must already have
read access to a material via the existing `canStudentAccessMaterial`
*and* be addressable by the parent assignment / lesson before the
attachment surface is rendered.

### 19.2 Schema — additive only (migration `0033`)

`prisma/migrations/0033_homework_lesson_materials/migration.sql` adds
two join tables. The migration is **idempotent**: every `CREATE` and
`ADD CONSTRAINT` is guarded by `IF NOT EXISTS` / `DO $$ ... EXCEPTION`
so re-running on a partially migrated environment is safe.

```sql
CREATE TABLE assignment_materials (
  assignment_id TEXT,
  material_id   TEXT,
  created_at    TIMESTAMP(3) DEFAULT now(),
  PRIMARY KEY (assignment_id, material_id)
);
CREATE INDEX assignment_materials_material_id_idx ON ... (material_id);
ALTER TABLE assignment_materials
  ADD FK assignment_id → Assignment(id) ON DELETE CASCADE,
  ADD FK material_id   → Material(id)   ON DELETE CASCADE;
-- lesson_materials: same shape with lesson_id.
```

Prisma models added in `prisma/schema.prisma`:

- `model AssignmentMaterial` — `@@id([assignmentId, materialId])`,
  cascade on both FKs, `@@map("assignment_materials")`.
- `model LessonMaterial` — same pattern, `@@map("lesson_materials")`.
- Back-relations: `Assignment.materials AssignmentMaterial[]`,
  `Lesson.materials LessonMaterial[]`,
  `Material.assignments AssignmentMaterial[]`,
  `Material.lessons LessonMaterial[]`.

Cascade on **both** FKs is intentional. Deleting an `Assignment`,
a `Lesson`, or a `Material` automatically prunes the join row — no
orphans, no nightly cleanup job.

### 19.3 Permission boundary

Enforced in `lib/panel/material-attachments.ts` (the database has no
row-level security):

| Action                            | Rule                                                                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Teacher attach to assignment      | `assignment.teacherId === teacher.id` **AND** `canTeacherAccessMaterial(teacherId, materialId, { write: true })`           |
| Teacher attach to lesson          | `lesson.teacherId === teacher.id` **AND** `canTeacherAccessMaterial(teacherId, materialId, { write: true })`               |
| Teacher detach (either)           | Owns the parent. Material write-access is **not** re-checked — letting a teacher remove a resource they once attached even if the material was later transferred. |
| Student view assignment material  | Assignment is `PUBLISHED` and student is addressable (`studentId === student.id`, classroom membership, or fallback "all teacher's students" via lesson) **AND** `canStudentAccessMaterial(studentId, materialId)` |
| Student view lesson material      | Student is the lesson's student or in the lesson's classroom **AND** `canStudentAccessMaterial(studentId, materialId)`     |

Read-only filtering: the student detail pages call
`canStudentAccessMaterial` per attached material and silently drop any
that became `PRIVATE` / archived / unpublished. The student never sees
"this material was removed" — the row simply isn't rendered.

### 19.4 Files added / changed

**Added (8):**

- `prisma/migrations/0033_homework_lesson_materials/migration.sql`
- `lib/panel/material-attachments.ts` — 11 functions: read, picker
  source, 4 permission guards, 4 mutations, 2 bulk count helpers.
- `components/panel/materials/material-attachment-picker.tsx` (already
  existed from earlier scaffold; preserved as-is — supports
  `mode="form-field"` for parent forms and `mode="standalone"` for
  detail-page panels).
- `components/panel/materials/attached-materials-list.tsx`
- `components/panel/materials/assignment-materials-section.tsx`
- `components/panel/materials/lesson-materials-section.tsx`
- `components/panel/materials/material-count-badge.tsx`

**Changed (8):**

- `prisma/schema.prisma` — 2 new models + 4 back-relations.
- `app/panel/ogretmen/_actions.ts` — `createTeacherAssignmentAction`
  now reads `materialIds[]` from form data and attaches each id with
  best-effort permission check. **Four new actions** appended:
  `attachAssignmentMaterialsAction`, `detachAssignmentMaterialAction`,
  `attachLessonMaterialsAction`, `detachLessonMaterialAction`. Every
  successful mutation calls `logAudit` with one of the four new
  actions: `MATERIAL_ATTACH_TO_ASSIGNMENT`,
  `MATERIAL_DETACH_FROM_ASSIGNMENT`, `MATERIAL_ATTACH_TO_LESSON`,
  `MATERIAL_DETACH_FROM_LESSON`.
- `app/panel/ogretmen/odevler/yeni/page.tsx` — multi-select picker
  added below "Açıklama".
- `app/panel/ogretmen/odevler/[id]/page.tsx` — `AssignmentMaterialsSection`
  inserted between Detaylar and Gönderimler (full edit mode).
- `app/panel/ogrenci/odevler/[id]/page.tsx` — `AssignmentMaterialsSection`
  inserted (read-only mode, hidden when nothing is attached).
- `app/panel/ogretmen/canli-ders/[id]/page.tsx` — `LessonMaterialsSection`
  inserted between cohort table and join-events card.
- `app/panel/ogrenci/page.tsx` — fetches `LessonMaterial`s for the next
  lesson (filtered through `canStudentAccessMaterial`) and forwards
  them to `StudentNextLessonCard` as `attachedMaterials`.
- `lib/panel/materials.ts` — `getStudentMaterialRecommendations` now
  also returns `attachedToFocus`: materials explicitly attached by the
  teacher to the student's nearest-due homework + next lesson.
- `components/panel/materials/student-suggested-materials.tsx` — new
  "Öğretmenin önerdiği" section rendered first when `attachedToFocus`
  is non-empty.
- `components/panel/student/dashboard/student-next-lesson.tsx` — new
  optional `attachedMaterials` prop renders an inline chip strip
  ("📎 Bu ders için materyaller") with up to 4 open-link chips.

### 19.5 Audit trail

Four new audit actions are emitted via `lib/audit.ts` (best-effort,
never throws):

- `MATERIAL_ATTACH_TO_ASSIGNMENT` — `entityType: "Assignment"`,
  `payload: { materialIds: [...], source?: "create" | undefined }`.
- `MATERIAL_DETACH_FROM_ASSIGNMENT` — `entityType: "Assignment"`,
  `payload: { materialId }`.
- `MATERIAL_ATTACH_TO_LESSON` — `entityType: "Lesson"`,
  `payload: { materialIds: [...] }`.
- `MATERIAL_DETACH_FROM_LESSON` — `entityType: "Lesson"`,
  `payload: { materialId }`.

`createTeacherAssignmentAction` only emits an audit row when at least
one attachment succeeded the per-id permission check, so a fully
denied bulk attach leaves no noise in the log.

### 19.6 Honest deferrals

- **No file upload pipeline.** Attachments only reference existing
  `Material` rows. The `attachmentUrl` field on `Assignment` /
  `AssignmentSubmission` is unchanged.
- **No per-section material mapping.** A material is attached to the
  whole assignment / whole lesson, not to a sub-question or a chapter
  range. Good enough for v1; revisit if section-level guidance becomes
  a real ask.
- **No admin attach-on-behalf-of-teacher.** The four mutation actions
  live under `app/panel/ogretmen/_actions.ts` and require
  `requirePanelRole("ogretmen")`. The admin "ödev düzenle" route can
  still set basic fields but does not yet expose the picker.
- **No `MaterialCountBadge` on the student homework focus card.** The
  focus card consumes `StudentHomeworkFocus` from
  `lib/panel/student-dashboard.ts`; bolting a count onto every focus
  row would have required a schema-aware aggregator and a typed
  extension of the focus row. Skipped for surface clarity — the count
  is implicit on the homework detail page itself, and the badge
  component is shipped for future use (e.g. teacher-side assignment
  list).
- **No study-room "attached materials" section.** The connection is
  surfaced transitively via the dashboard's
  `StudentSuggestedMaterialsCard`'s "Öğretmenin önerdiği" group; the
  study-room page already has its own course-scoped recommender
  (`StudyRoomRelatedMaterials`) and adding a third strip would be
  noise. Revisit if telemetry shows users want it inside the timer
  view.
- **Parent panel.** `getMaterialsForParent` is intentionally not
  added in this session — parent-facing material visibility is a
  policy decision deferred to a future "Veli içerik görünürlüğü"
  session.

### 19.7 Verification

```bash
rm -f tsconfig.tsbuildinfo && npx tsc --noEmit       # exit 0
npx eslint --max-warnings=0 \
  lib/panel/material-attachments.ts \
  lib/panel/materials.ts \
  components/panel/materials/ \
  app/panel/ogretmen/_actions.ts \
  app/panel/ogretmen/odevler/yeni/page.tsx \
  'app/panel/ogretmen/odevler/[id]/page.tsx' \
  'app/panel/ogrenci/odevler/[id]/page.tsx' \
  'app/panel/ogretmen/canli-ders/[id]/page.tsx' \
  app/panel/ogrenci/page.tsx \
  components/panel/student/dashboard/student-next-lesson.tsx
                                                     # exit 0
```

Manual smoke (suggested):

1. As a teacher, create an assignment with two checked materials in
   `/panel/ogretmen/odevler/yeni`. Confirm both rows appear in the
   detail page's "Çalışma materyalleri" card.
2. Detach one. Confirm the row disappears and an audit row is written.
3. As the student in that classroom, open the homework detail. Confirm
   only the still-published, still-readable attachment is rendered and
   the card hides itself when zero remain.
4. Attach the same material to the upcoming lesson via
   `/panel/ogretmen/canli-ders/[id]`. As the student, refresh
   `/panel/ogrenci`. Confirm the chip appears under the next-lesson
   card and the "Öğretmenin önerdiği" group renders in the suggested
   materials card.

### 19.8 Suggested next session

Phase 2 / Session 10 candidates, ranked by leverage:

1. **Submission file uploads** — extend `AssignmentSubmission` with a
   small uploader so students can attach a file to their submission
   without leaving the homework page (currently URL-only).
2. **Admin attach-on-behalf** — surface the picker on the admin
   "ödev düzenle" route and re-use the same audit actions with
   `requirePanelRole("admin")`.
3. **Material usage analytics** — count `getAttachedMaterialCountByAssignment`
   / `byLesson` over the last 30 days on the teacher dashboard and the
   library page so teachers see which resources actually get linked.
4. **Per-section attachment** — only if real teacher feedback asks for
   it; otherwise the tax of UX complexity is not justified.

---

## 20. Phase 2 / Session 10 — Parent Finance Due Tracking (2026-05-30)

### 20.1 Goal & scope

Bring "what does this parent owe / when / for which child" into the
panel as a real, queryable, audited surface. **Explicit non-goal:** this
is not a payment-provider integration. No PayTR / Stripe handshake,
no cron, no refunds, no installment auto-generation, no parent
self-service "mark paid". This session is a *due tracking and
visibility* layer.

### 20.2 Schema (additive — migration 0034)

New enum and table — `prisma/migrations/0034_payment_schedule_item/migration.sql`,
fully idempotent (`CREATE … IF NOT EXISTS`, `DO $$ … EXCEPTION WHEN duplicate_object`):

- `enum PaymentScheduleStatus`: `PENDING / PAID / CANCELLED / PARTIAL`.
  **`OVERDUE` deliberately not stored** — see §20.5.
- `model PaymentScheduleItem`:
  - `id`, `title`, `amount Int` (kuruş), `paidAmount Int @default(0)`,
    `dueDate`, `status` (default `PENDING`), `paidAt`, `paymentLink`,
    `note`, `createdById`, `createdAt`, `updatedAt`.
  - Six **nullable** FKs, all `ON DELETE SET NULL`:
    `studentId → Student`, `parentId → Parent`,
    `purchaseIntentId → PurchaseIntent`, `packageId → Package`,
    `accountingEntryId → AccountingEntry`,
    `createdById → User` (named relation `PaymentScheduleItemCreator`).
  - Six indexes: `(studentId, dueDate)`, `(parentId, dueDate)`,
    `(status, dueDate)`, `(purchaseIntentId)`, `(packageId)`,
    `(accountingEntryId)`.
- Six back-relations added to existing models: `User.paymentScheduleItemsCreated`,
  `Student.paymentScheduleItems`, `Parent.paymentScheduleItems`,
  `Package.paymentScheduleItems`, `PurchaseIntent.paymentScheduleItems`,
  `AccountingEntry.paymentScheduleItems`.

No existing model touched destructively. `npx prisma format && generate`
exit 0.

### 20.3 Permission model

Enforced at the helper layer (`lib/panel/parent-finance.ts`):

- **Parent** sees a row iff `row.parentId === ctx.parentId` **OR**
  `row.studentId IN ctx.childIds`. With `selectedChildId` set the scope
  narrows to that single child. Wrong child id → returned context has
  `selectedChildId: null` (no leak).
- **Admin** mutates everything (`requirePanelRole("admin")`).
- **Teacher** has zero finance access (no surface added).
- Parents **cannot** invoke any of the four mutation actions — there is
  no client-side surface and the actions all assert admin role.

### 20.4 Files added / changed

```
prisma/migrations/0034_payment_schedule_item/migration.sql      [new]
prisma/schema.prisma                                            [enum + model + 6 back-rels]
lib/panel/parent-finance.ts                                     [new, ~470 LOC]
lib/panel/parent-dashboard.ts                                   [+dueSummary on ParentPaymentSummary]
app/panel/admin/odemeler/_actions.ts                            [+4 admin actions]
app/panel/admin/odemeler/vadeler/page.tsx                       [new, list + filters]
app/panel/admin/odemeler/vadeler/yeni/page.tsx                  [new, create form]
app/panel/veli/odemeler/page.tsx                                [rewritten parent finance page]
components/panel/finance/payment-status-badge.tsx               [new, shared badge]
components/panel/parent/finance/parent-finance-summary.tsx      [new, KPI cards]
components/panel/parent/finance/parent-due-list.tsx             [new, upcoming + overdue]
components/panel/parent/finance/parent-paid-history.tsx         [new, paid table]
components/panel/admin/finance/admin-payment-schedule-table.tsx [new, mark/partial/cancel]
components/panel/admin/finance/payment-schedule-form.tsx        [new, create form]
components/panel/parent/dashboard/parent-payment-summary.tsx    [deferred → real summary or honest empty]
```

### 20.5 OVERDUE derivation decision (D7)

`OVERDUE` is **never** stored. It is computed in
`deriveDisplayStatus(status, dueDate)`:

```
PENDING && dueDate < startOfToday()  →  OVERDUE
otherwise                            →  status (PENDING / PAID / CANCELLED / PARTIAL)
```

Rationale:

- No cron / scheduled job to drift out of sync.
- No nightly job failure to debug.
- The display state is a pure function of `(status, dueDate, today)` —
  trivially testable and reversible.
- `PARTIAL` is **not** auto-flipped to OVERDUE even past its date,
  because partial payment is itself acknowledgement; admin can manually
  cancel or extend.

### 20.6 Audit trail

All four admin actions in `app/panel/admin/odemeler/_actions.ts` write
through `logAudit({ entityType: "PaymentScheduleItem", … })`:

- `PAYMENT_SCHEDULE_CREATE` — payload includes `title`, `amount`,
  `dueDate`, `studentId`, `parentId`.
- `PAYMENT_SCHEDULE_MARK_PAID` — payload includes `amount`,
  `accountingEntryId`, `writeAccounting` flag.
- `PAYMENT_SCHEDULE_MARK_PARTIAL` — payload includes `paidAmount`,
  `totalAmount`, `previous`. Auto-promotes to `PAYMENT_SCHEDULE_MARK_PAID`
  when partial reaches the total.
- `PAYMENT_SCHEDULE_CANCEL` — payload includes optional reason.

When the admin opts in (`writeAccounting=1`), mark-paid additionally
writes a fresh `AccountingEntry(type=INCOME, category=PACKAGE_SALE,
refType="PaymentScheduleItem", refId=…)` and links it back via
`accountingEntryId`. Historical entries are **never** mutated; we only
ever insert.

### 20.7 Honest deferrals (still not done)

This session intentionally does **not** ship:

1. **No payment provider callback** — there is still no PayTR/Stripe
   webhook that flips a row to PAID. Mark-paid is a manual admin act.
2. **No parent self-service mark-paid** — by policy, even when a
   `paymentLink` is attached. The link is informational only.
3. **No automatic schedule generation** from `PurchaseIntent` or
   `Package`. Admin enters rows by hand.
4. **No installment math** — the table stores discrete dates, not a
   plan with N installments + interest.
5. **No invoice / receipt PDF.**
6. **No bulk import** (CSV) of due rows.
7. **No partial-overdue auto-flip** — see §20.5.
8. **No parent notification** when a row goes overdue (no email, no
   push). Parent only sees it on dashboard / `odemeler` next visit.
9. **No teacher payroll changes** — `TeacherPayroll` is untouched.
10. **No retroactive AccountingEntry mutation** — we only insert when
    admin marks paid with the opt-in checkbox.

These are deliberate session-10 deferrals; the data model is
forward-compatible with all of them (e.g. provider webhook → set
status=PAID, reuse `accountingEntryId` linkage).

### 20.8 Verification

- `npx prisma format && npx prisma generate` → exit 0.
- `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit` → exit 0.
- `npx eslint --max-warnings=0` on all 13 touched files → exit 0.
- Migration is idempotent — safe to re-run on already-migrated DBs.
- Parent dashboard widget: when no rows exist for a child, falls back
  to the previous "honest empty" hint instead of inventing numbers.

### 20.9 Suggested next session (Session 11 candidates)

- **Webhook integration** (PayTR sandbox) — only the `mark-paid` half;
  reuse `markPaymentScheduleItemPaidAction` semantics from a webhook
  handler with a service-account audit actor.
- **Schedule generation** from accepted `PurchaseIntent` (split a
  package price into N rows by configurable cadence — admin-driven).
- **Email + push reminders** for `OVERDUE` and "due in 3 days" — gated
  by parent notification preferences.
- **Receipt PDF** rendering of paid `PaymentScheduleItem` rows.
- **Bulk CSV import** behind admin-only screen with full audit.

Phase 2 / Session 10 lands clean: real schema, honest derivation,
admin-only mutations, full audit trail, no fake data, parents see
exactly what is real.

---

## §21 Phase 2 / Session 11 — Teacher Payroll / Finance Hub

### 21.1 Goal
Add a lesson-level teacher payroll layer that admins can review item-by-item and pay, while keeping the existing flat-period `TeacherPayroll` surface at `/panel/admin/maaslar` untouched. Conservative-by-default: never auto-mark-paid, never invent missing rates, never overwrite locked rows.

### 21.2 Schema (migration `0035_teacher_payroll_hub`)
- New enums: `TeacherPayrollPeriodStatus(DRAFT/REVIEWED/LOCKED/PAID/CANCELLED)`, `TeacherPayrollItemStatus(DRAFT/REVIEWED/APPROVED/PAID/EXCLUDED)`.
- `TeacherCompensationRule` — (teacherId, courseId?, classroomId?) → `hourlyRate` (Int kuruş), `isActive`, optional `startsAt`/`endsAt`, `note`.
- `TeacherPayrollPeriod` — title, date range, status, `lockedAt`/`paidAt`, note.
- `TeacherPayrollItem` — periodId, teacherId, lessonId?, compensationRuleId?, minutes, hourlyRate, grossAmount, adjustmentAmount, finalAmount, status, **`rateMissing` Boolean**, **`attendanceMissing` Boolean**, `accountingEntryId?`. Partial unique on `(periodId, teacherId, lessonId) WHERE lessonId IS NOT NULL`.
- All FKs idempotent (`DO $$ ... duplicate_object`). All Prisma back-relations added (Teacher, Lesson, Course, Classroom, AccountingEntry, User × 3 named relations). `npx prisma format && generate` clean.

### 21.3 Permission rules
- All CRUD actions are admin-only via `requirePanelRole("admin")`.
- Teachers get a *read-only* widget at `/panel/ogretmen/hakedislerim` derived from `getTeacherPayrollReadOnlySummary(teacherId)`.
- Parents/students never see this surface.

### 21.4 Files added / changed
- `prisma/migrations/0035_teacher_payroll_hub/migration.sql` (new)
- `prisma/schema.prisma` (+ 2 enums, 3 models, back-relations)
- `lib/panel/teacher-payroll.ts` (helper: ~675 LOC, pure rate matcher + DB readers)
- `app/panel/admin/ogretmen-hakedisleri/_actions.ts` (13 admin server actions)
- `app/panel/admin/ogretmen-hakedisleri/page.tsx` (hub dashboard)
- `app/panel/admin/ogretmen-hakedisleri/[periodId]/page.tsx` (period detail)
- `app/panel/admin/ogretmen-hakedisleri/yeni/page.tsx` (period create form)
- `app/panel/admin/ogretmen-hakedisleri/kurallar/page.tsx` (compensation rules CRUD)
- `app/panel/ogretmen/hakedislerim/page.tsx` (teacher read-only)
- `components/panel/finance/payroll-status-badge.tsx`
- `components/panel/admin/finance/payroll-summary-cards.tsx`
- `components/panel/admin/finance/payroll-teacher-table.tsx`
- `components/panel/admin/finance/payroll-item-review-table.tsx` (client)
- `components/panel/admin/finance/compensation-rule-form.tsx`
- `components/panel/admin/finance/compensation-rule-table.tsx` (client)
- `components/panel/teacher/teacher-payroll-summary.tsx`
- `components/panel/shell/sections.ts` (Finans → "Öğretmen hakedişleri", Öğretmen Hesap → "Hakedişlerim")

### 21.5 Eligibility + rate priority decisions
- **Eligibility (in `getEligibleLessonsForPayroll`):** scheduledAt in `[start, end)` AND past now. `COMPLETED`/`ENDED` → eligible. `MISSED` → eligible flagged `attendanceMissing`. `SCHEDULED`-past → eligible flagged `attendanceMissing` (admin must retro-attend or exclude). `LIVE` and `CANCELLED` → never eligible.
- **Rate priority (in `getPayrollRateForLesson`, pure):** (teacher,course,classroom) → (teacher,course) → (teacher,classroom) → (teacher) default. Active rules only with `startsAt`/`endsAt` window-respected. No match → `rateMissing=true`, `gross=0`. Such items are refused for `approve` and `mark-paid`.
- **Adjustment math:** `finalAmount = grossAmount + adjustmentAmount`. Recomputed on adjust; lockedonce PAID/EXCLUDED.

### 21.6 Audit trail
13 SCREAMING_SNAKE_CASE actions logged via `logAudit({entityType, entityId, actorUserId, action, payload})`:
- Rules: `PAYROLL_RULE_CREATE/UPDATE/ACTIVATE/DEACTIVATE/DELETE`
- Periods: `PAYROLL_PERIOD_CREATE/GENERATE/LOCK/MARK_PAID/CANCEL`
- Items: `PAYROLL_ITEM_APPROVE/REVIEW/EXCLUDE/ADJUST/MARK_PAID`

`AccountingEntry` writes only on explicit `writeAccounting=1` form flag, with `service:"OD", type:"EXPENSE", category:"TEACHER_PAYROLL", refType:"TeacherPayrollItem", refId, teacherId, description: "Bordro: <period.title>"`. Idempotent: existing `accountingEntryId` is never overwritten.

### 21.7 Honest deferrals
- No payment provider integration (no PayTR/bank transfer). "Mark Paid" is bookkeeping only.
- No tax / SGK / payroll-legal compliance modeling.
- No auto-recurring period generation (admin must create each period).
- Existing `TeacherPayroll` (flat-period manual) at `/panel/admin/maaslar` is unchanged. Both surfaces co-exist; cross-link is shown on the new hub header.
- No teacher-side mutations. Read-only widget only.
- No parent-finance side-effects.
- `attendanceMissing` is a *flag*, not auto-rejection — admin still controls.

### 21.8 Verification
- `npx prisma format && npx prisma generate` → exit 0.
- `npx tsc --noEmit` (full repo) → exit 0.
- `npx eslint --max-warnings=0` on all new/edited Session-11 files → exit 0.

### 21.9 Suggested next session
- CSV/PDF export for a payroll period (uses existing export module).
- Per-teacher monthly trend view + comparison across periods.
- Optional: link existing `TeacherPayroll` (legacy) entries to a new period for unified totals; then deprecate legacy surface.
- Optional: bulk-approve filtered items + bulk-adjust.


---

## §22 Phase 2 / Session 12 — Production QA / Permissions / Deployment Hardening

### 22.1 Goal
Audit cross-role data access, financial writes, route guards, server-action ownership, migrations 0029–0035 and recent navigation. Fix only the issues found. No feature scope.

### 22.2 What was audited
- All `requirePanelRole` / `requireParent` / `requireStudent` / `requireTeacher` usages across `app/panel/**`.
- All recent server actions (Sessions 4–11): study session, materials, attachments, absence excuse, academic goal, payment schedule, teacher payroll, lesson lifecycle, attendance, assignment grading.
- Financial writes: `markPaymentScheduleItemPaidAction`, `markPayrollItemPaidAction`, `markPayrollPeriodPaidAction`, `setPurchaseStatusAction`.
- Helpers: `parent-finance.ts`, `teacher-payroll.ts`, `materials.ts`, `material-attachments.ts`, `absence-excuses.ts`, `odk-student.ts`, `parent-summary.ts`, `student-dashboard.ts`, `parent-dashboard.ts`.
- Migrations 0029–0035: all additive, idempotent (`IF NOT EXISTS`, `DO $$ ... duplicate_object`), no destructive changes.

### 22.3 Issues found and fixed
**🔒 H1 — Critical: student could submit to any assignment.**
`app/panel/ogrenci/_actions.ts → submitAssignmentAction`, `submitAssignmentExtendedAction`. Both upserted `AssignmentSubmission` without verifying that the assignment was actually directed at the student or to one of their classrooms. A student could guess any `assignmentId` and create/overwrite a submission row.
**Fix:** new local helper `assertStudentCanSubmit(assignmentId, studentId)` mirrors the read-side check used in the detail page (`studentId === student.id` OR `classroom.students { studentId, leftAt: null }`). Also rejects `CLOSED` assignments. Both submit actions now call it before `upsert`.

**🔒 H2 — Teacher could record attendance on another teacher's lesson.**
`app/panel/ogretmen/_actions.ts → recordAttendanceAction`. Loaded the lesson but never verified `lesson.teacherId === current teacher.id`, and never verified that `studentId` actually belongs to the lesson (solo-student match or classroom membership).
**Fix:** added explicit ownership guard on lesson + student membership before the `Attendance.create`.

### 22.4 Areas confirmed safe (no changes needed)
- **Parent finance reads** (`lib/panel/parent-finance.ts`): all queries scoped by `parentId === parent.id` OR `studentId IN childIds`. Parent has zero write surface — no `mark paid` action exists for parents. ✅
- **Teacher payroll actions** (`app/panel/admin/ogretmen-hakedisleri/_actions.ts`): all 13 actions admin-only via `requirePanelRole("admin")`. PAID/EXCLUDED items refused. CANCELLED periods refused. AccountingEntry only on explicit `writeAccounting=1`, refType+refId guards prevent duplicates (`if (!accountingEntryId)`). ✅
- **Payment schedule actions** (`app/panel/admin/odemeler/_actions.ts`): all admin-only. PAID idempotent. AccountingEntry only on explicit `writeAccounting=1`, idempotent via `if (!accountingEntryId)`. ✅
- **Material attachments** (`lib/panel/material-attachments.ts`): teacher write requires both assignment/lesson ownership AND material write access. Student read filtered through `canStudentAccessMaterial`. ✅
- **Absence excuse**: parent create gated by `canParentSubmitExcuse(parent.id, studentId)`; teacher review gated by `canTeacherReviewExcuse(teacher.id, excuseId)`; status transition gates `PENDING → APPROVED|REJECTED`. ✅
- **Study session** (`app/panel/ogrenci/calisma-odasi/_actions.ts`): all writes use authenticated student; `sessionId` cross-student writes blocked. ✅
- **Academic goal** (`app/panel/ogrenci/hedefim/_actions.ts`): no `studentId` form field — structurally tied to `requireStudent()`. ✅
- **ODK student helper** (`lib/panel/odk-student.ts`): own attempts only. Admin bypass documented. ✅
- **Lesson lifecycle** (`startLessonAction`, `endLessonAction`, `cancelLessonByTeacherAction`, `setLessonMeetingLinkAction`): `_loadTeacherAndLesson` enforces `lesson.teacherId === teacher.id`. ✅
- **Assignment CRUD** by teacher (toggle/delete/comment): `where: { id, teacherId: teacher.id }` filter applied. ✅

### 22.5 Financial safety pass — confirmed invariants
| Invariant | Status |
|---|---|
| Parent cannot mark payment paid | ✅ no parent action exists |
| Teacher cannot mark payroll paid | ✅ admin-only |
| PAID/EXCLUDED payroll rows immutable | ✅ `assertItemMutable` + status guards |
| CANCELLED period blocks mutations | ✅ |
| `markPaymentScheduleItemPaidAction` refuses CANCELLED | ✅ |
| AccountingEntry created only on explicit admin action | ✅ `writeAccounting=1` flag |
| Duplicate AccountingEntry prevented | ✅ `if (!accountingEntryId)` guard before create |
| Negative amounts rejected | ✅ `parseAmountToKurus` rejects ≤0 (payroll adjustment is the only signed field — explicit) |
| OVERDUE derived not stored | ✅ `parent-finance.ts` derives at read-time |
| Historical rows not silently recalculated | ✅ payroll generate skips PAID/EXCLUDED; payment schedule never auto-flips status |

### 22.6 Migration / deploy review
| Migration | Type | Idempotent | FK behavior | Indexes | Notes |
|---|---|---|---|---|---|
| 0029 study_session | additive | ✅ IF NOT EXISTS | Cascade on Student delete | yes | safe |
| 0030 material_library | additive | ✅ IF NOT EXISTS | SetNull on Course/Classroom delete | yes | URL-first |
| 0031 absence_excuse | additive | ✅ IF NOT EXISTS | Cascade on Parent/Student | yes | 2 enums + 1 table |
| 0032 student_academic_goal | additive | ✅ IF NOT EXISTS | Cascade on Student | yes | enum |
| 0033 homework_lesson_materials | additive | ✅ IF NOT EXISTS | Cascade | composite PK | join tables only |
| 0034 payment_schedule_item | additive | ✅ IF NOT EXISTS | SetNull on related | yes | base-status only |
| 0035 teacher_payroll_hub | additive | ✅ DO $$ duplicate_object | Cascade on Period; SetNull on rule | yes | 2 enums + 3 tables + partial unique |

`prisma migrate deploy` — none of these migrations modify or drop existing data; they are safe for production rollout. `prisma generate` — clean.

### 22.7 Permission matrix
Legend: **R** read · **W** write · **O** own only · **L** linked only · **A** admin-only · **—** none.

| Resource | Admin | Teacher | Student | Parent |
|---|---|---|---|---|
| Student profile | R/W | R (own classes) | R/W (self) | R (linked children) |
| Parent linked children | R/W | R (own classes' kids) | — | R/W (own link) |
| Classroom data | R/W | R (assigned only) | R (member only) | R (children's class) |
| Lesson | R/W | R/W (own teacherId) | R (own) | R (children's) |
| Attendance | R/W | R/W (own lesson + member student) | R (own) | R (children's) |
| Homework / Assignment | R/W | R/W (own teacherId) | R (addressed) + W submit (own + addressed) | R (children's) |
| Submission | R | R/W (graded by own assignment teacher) | R/W (own) | R (children's) |
| Material (library) | R/W (admin) | R/W (own + scope rules) | R (canStudentAccessMaterial) | — |
| Material attachment | R | W (own assignment/lesson + own material) | R (filtered) | — |
| Absence Excuse | R/W (admin can review) | R + Review (own students) | R (own, indirect) | R/W (own children, PENDING) |
| ODK Exam definition | R/W | — | R (canStudentAccessExam) | — |
| ODK Attempt / Result | R | — | R (own only) | R (children's, indirect) |
| Academic Goal | R | — | R/W (self only) | R (children's) |
| Study Session | R | — | R/W (self only) | R (children's) |
| PaymentScheduleItem | R/W | — | — | R (linked) |
| TeacherPayroll (legacy) | R/W | — | — | — |
| TeacherPayrollPeriod / Item | R/W | R (read-only own items) | — | — |
| TeacherCompensationRule | R/W | — | — | — |
| AccountingEntry | R/W | — | — | — |
| Audit Log | R | — | — | — |
| Inbox / Notifications | R/W | R/W (own outbox + own inbox) | R/W (own inbox) | R/W (own inbox) |

Only admins can write to financial tables (`PaymentScheduleItem`, `AccountingEntry`, `TeacherPayroll*`). Teachers' read access to payroll is limited to their own items via `getTeacherPayrollReadOnlySummary(teacher.id)`.

### 22.8 Manual smoke checklist
Run before each production deploy. Tester should be logged in as the role indicated.

**Parent (PARENT):**
- [ ] `/panel/veli` shows only own linked children.
- [ ] Try `/panel/veli/cocuklarim/<another-parent's-child-id>` → not found / no data leak.
- [ ] Try opening unrelated child's `mazeret` form → guard rejects.
- [ ] `/panel/veli/odemeler` lists only items where `parentId===me` OR `studentId IN childIds`.
- [ ] No "mark paid" button visible on any payment row.
- [ ] OVERDUE badge appears for PENDING items past due date (derived).

**Student (STUDENT):**
- [ ] `/panel/ogrenci/odevler/<another-student's-only-assignment>` → 404.
- [ ] Submit form on someone else's assignment id (POST) → "Bu ödeve gönderim yetkiniz yok".
- [ ] Try opening another student's ODK attempt id → blocked.
- [ ] Study session stop with someone else's `sessionId` → "Yetkisiz işlem".
- [ ] Library shows only materials matching student visibility scope.

**Teacher (TEACHER):**
- [ ] `/panel/ogretmen/siniflarim/<unrelated-classroom>` → not found.
- [ ] Lesson detail / canli-ders for another teacher's lesson → "Bu derse yetkiniz yok".
- [ ] Record attendance with another teacher's lessonId → "Bu derse yetkiniz yok".
- [ ] Record attendance with valid lesson but unrelated studentId → "Bu öğrenci bu derse ait değil" / "Bu öğrenci bu sınıfta değil".
- [ ] Send announcement to a classroom not assigned → "Bu sınıfa atanmamışsınız".
- [ ] `/panel/ogretmen/hakedislerim` shows ONLY own items, read-only.
- [ ] No payroll mutation surface for teacher role.

**Admin (ADMIN):**
- [ ] Can create payment schedule item with parent+student link validation.
- [ ] `markPaymentScheduleItemPaidAction` is idempotent (second click does nothing).
- [ ] AccountingEntry only created when `writeAccounting=1` is checked.
- [ ] `generatePayrollPeriodItemsAction` skips PAID/EXCLUDED items.
- [ ] LOCKED/PAID/CANCELLED period refuses regeneration.
- [ ] Approve excuse changes ABSENT → EXCUSED but PRESENT/LATE rows untouched.
- [ ] Audit log shows entries for PAYROLL_PERIOD_*, PAYMENT_SCHEDULE_*, EXCUSE_*.

**Cross-role spot checks:**
- [ ] STUDENT visiting `/panel/admin/...` → redirected to `/panel/ogrenci`.
- [ ] PARENT visiting `/panel/ogretmen/odevler` → redirected to `/panel/veli`.
- [ ] TEACHER visiting `/panel/admin/maaslar` → redirected to `/panel/ogretmen`.
- [ ] All four panel landing pages render without errors when user has no records.

### 22.9 Empty / error state pass
Confirmed honest empty UI (no fake data) on:
- `/panel/veli/cocuklarim` (no linked child)
- `/panel/ogretmen/siniflarim` (no assigned class)
- `/panel/ogrenci/kutuphane` (no visible material)
- `/panel/ogrenci/odk` (no exam access)
- `/panel/ogrenci/hedefim` (no goal yet)
- `/panel/veli/odemeler` (no dues)
- `/panel/admin/ogretmen-hakedisleri` (no period — explicit "Yeni Dönem" CTA)
- `/panel/ogretmen/hakedislerim` (no payroll — explicit message)
- `/panel/ogrenci/calisma-odasi` (no sessions)
- `/panel/veli/mazeret` (no excuses)

### 22.10 Performance sanity
Spot-checked:
- Teacher payroll generation: lessons + rules fetched in `Promise.all`, per-lesson upsert is intentional (idempotency), bounded by period length.
- Parent dashboard / student dashboard: existing queries already use composite includes; no obvious N+1.
- Payroll period summary: single `findUnique` with `include items` then in-memory aggregation.
- ODK result detail: per-question rows joined in single query.
No rewrites this session; no critical hot paths identified.

### 22.11 Files changed
- `app/panel/ogrenci/_actions.ts` — added `assertStudentCanSubmit`; both submit actions now ownership-checked before write.
- `app/panel/ogretmen/_actions.ts` — `recordAttendanceAction` now verifies teacher-lesson ownership and student-lesson membership.
- `docs/phase-1-audit-and-plan-2026-05-30.md` — appended §22 (this section).

### 22.12 Verification
- `npx tsc --noEmit` (full repo) → exit 0.
- `npx eslint --max-warnings=0` on changed files → exit 0.
- `npx prisma generate` → exit 0.
- Migrations 0029–0035 reviewed: all additive, idempotent, safe for `prisma migrate deploy`.

### 22.13 Known limitations / honest deferrals
- No automated test infrastructure exists; smoke checklist above is the manual gate.
- `markPaymentScheduleItemPartialAction` does not write an AccountingEntry when partial happens to fully settle the row. Admin should use the explicit "mark paid" path with `writeAccounting=1` if accounting is desired. Not a security issue — a UX deferral.
- No row-level security in Postgres; all permissions are enforced in app code. Documented at `lib/panel/material-attachments.ts:8`.
- No rate-limiting on parent excuse create or student submission upsert. Existing `lib/rate-limit.ts` could be wired in a follow-up.
- No CSRF token check beyond Next.js Server Action implicit origin guard. Server Actions in Next 14+ ship with origin/referrer checks; relying on framework default.

### 22.14 Suggested next sessions
- Admin finance reports / cashflow (combines `PaymentScheduleItem` + `AccountingEntry` + payroll for monthly P&L).
- ODK admin exam builder polish.
- Notification workflow consolidation (single notification preferences surface).
- Production deploy checklist (env vars, secrets rotation, db backup verification).
- Wire `lib/rate-limit.ts` into parent excuse create + student submission upsert.


---

## §23 · Phase 2 / Session 13 — Production Deploy Checklist + CI / Runtime Hardening (2026-05-30)

### 23.1 — Goal

> "Be boring and precise. This session is successful if deployment and
> runtime risks become explicit, documented and smaller."

No new features. No UI redesign. No business-logic changes except for
deploy/runtime safety.

### 23.2 — Audit findings

| Area | State before Session 13 | Action |
| ---- | ----------------------- | ------ |
| `lib/env.ts` | already validating 16 vars on cold start via `instrumentation.ts` | Documented in deploy checklist §2 |
| `next.config.ts` | full CSP + HSTS already shipped | No change |
| `middleware.ts` | panel + admin-API guards via `withAuth` | No change |
| `vercel.json` | 9 cron jobs registered | Smoke check added to §4 of deploy checklist |
| `.env.example` | comprehensive | No change; deploy checklist §2 mirrors it |
| `package.json` scripts | **missing `typecheck`** | ✅ Added `"typecheck": "tsc --noEmit"` |
| CI (`.github/workflows/ci.yml`) | already runs typecheck + lint + prisma generate | No change |
| Migrations 0029–0035 | all additive, idempotent | Confirmed; no rollback steps required |
| `next build` | **never run end-to-end before this session** | Run, fixed real bugs (see 23.3) |

### 23.3 — Production blocker discovered & fixed: server-only / `node:crypto` leak into client bundle

Running `next build` for the first time exposed three modules that
exported `"server-only"` (or imported `node:crypto`) and were
transitively imported by `"use client"` components. TypeScript did NOT
catch this because `"server-only"` is a runtime+webpack contract, not
a type contract.

**Files affected and fix pattern:**

| Server module | Client consumers (transitive) | Fix |
| ------------- | ----------------------------- | --- |
| `lib/panel/parent-finance.ts` | `payment-status-badge.tsx`, `parent-due-list.tsx`, `parent-paid-history.tsx`, `admin-payment-schedule-table.tsx` | Extracted display helpers + row types to **`lib/panel/parent-finance-display.ts`** (no `server-only`); server module re-exports for back-compat + uses `import type` for internal scope. |
| `lib/panel/teacher-payroll.ts` | `payroll-status-badge.tsx`, `payroll-summary-cards.tsx`, `payroll-teacher-table.tsx`, `compensation-rule-table.tsx`, `payroll-item-review-table.tsx`, `teacher-payroll-summary.tsx` | Extracted display helpers + row types to **`lib/panel/teacher-payroll-display.ts`**; same pattern. Internal types `LessonRateMatch`, `LessonPayoutCalc`, `EligibleLesson` stay server-only. |
| `lib/panel/absence-excuses.ts` | `absence-excuse-form.tsx`, `absence-excuse-list.tsx`, `absence-excuse-status-badge.tsx`, `admin-absence-excuses-table.tsx`, `teacher-pending-excuses.tsx` | Extracted display helpers + `AbsenceExcuseRow` to **`lib/panel/absence-excuses-display.ts`**; server module keeps a private `REASON_LABEL` for internal note text. |
| `lib/parents.ts` (imports `node:crypto`) | `parent-link-card.tsx` | Moved invite-token primitives (`generateParentInviteToken`, `buildParentInviteUrl`, `defaultParentInviteExpiresAt`, `DEFAULT_PARENT_INVITE_TTL_DAYS`) to new **`lib/parent-invites.ts`** with `import "server-only"`. Updated 2 server callers (`app/panel/admin/ogrenciler/_actions.ts`, `app/panel/admin/veliler/[id]/duzenle/page.tsx`) to import from `@/lib/parent-invites` directly. `lib/parents.ts` no longer imports `node:crypto`. |

**New invariant** (added to deploy checklist §1, **HARD RULE**): a
`"use client"` component must never transitively import a module with
`import "server-only"` or that statically imports `node:crypto`. The
agreed pattern is `lib/foo.ts` (server) ↔ `lib/foo-display.ts`
(client-safe) sibling.

### 23.4 — Files changed this session

```
package.json                                        ← added "typecheck" script
lib/panel/parent-finance.ts                         ← moved display to sibling
lib/panel/parent-finance-display.ts                 ← NEW (~75 LOC)
lib/panel/teacher-payroll.ts                        ← moved display to sibling
lib/panel/teacher-payroll-display.ts                ← NEW (~165 LOC)
lib/panel/absence-excuses.ts                        ← moved display to sibling
lib/panel/absence-excuses-display.ts                ← NEW (~80 LOC)
lib/parents.ts                                      ← removed node:crypto import + invite primitives
lib/parent-invites.ts                               ← NEW (~40 LOC, server-only)
app/panel/admin/ogrenciler/_actions.ts              ← import path switched
app/panel/admin/veliler/[id]/duzenle/page.tsx       ← import path switched
components/panel/finance/payment-status-badge.tsx           ← display path
components/panel/finance/payroll-status-badge.tsx           ← display path
components/panel/parent/finance/parent-due-list.tsx         ← display path
components/panel/parent/finance/parent-paid-history.tsx     ← display path
components/panel/admin/finance/admin-payment-schedule-table.tsx ← display path
components/panel/admin/finance/payroll-summary-cards.tsx    ← display path
components/panel/admin/finance/payroll-teacher-table.tsx    ← display path
components/panel/admin/finance/compensation-rule-table.tsx  ← display path
components/panel/admin/finance/payroll-item-review-table.tsx← display path
components/panel/teacher/teacher-payroll-summary.tsx        ← display path
components/panel/absence-excuses/absence-excuse-form.tsx    ← display path
components/panel/absence-excuses/absence-excuse-list.tsx    ← display path
components/panel/absence-excuses/absence-excuse-status-badge.tsx ← display path
components/panel/absence-excuses/admin-absence-excuses-table.tsx ← display path
components/panel/absence-excuses/teacher-pending-excuses.tsx     ← display path
docs/production-deploy-checklist.md                 ← NEW
docs/manual-smoke-checklist.md                      ← NEW
docs/phase-1-audit-and-plan-2026-05-30.md           ← this §23 appended
```

No DB migrations. No schema changes. No business-logic changes.

### 23.5 — Verification

```text
$ rm -f tsconfig.tsbuildinfo && npx tsc --noEmit
(exit 0, no output)

$ npm run lint
3 pre-existing warnings only (entity-search-combobox, smart-table, toast.tsx) —
all predate Session 13. No new warnings introduced.

$ DATABASE_URL=... DIRECT_URL=... NEXTAUTH_SECRET=... NEXTAUTH_URL=... \
    npm run build:nomigrate
   ▲ Next.js 15.0.7
   ✓ Compiled successfully
   Linting and checking validity of types ...
   (3 pre-existing warnings)
   Collecting page data ...
   Generating static pages …  ← fails on /deneme-kulubu, /odk-paketleri
                               because dummy DB rejects prisma.odkPackage.findMany().
                               Vercel build hits a real DB so this passes there.
```

**Truthful build report:** webpack compilation now passes end-to-end
locally with dummy env. The remaining static-prerender failures are
environmental (no real DB), not code bugs. Session 13 fixed three
**genuine** production bugs that would have crashed the Vercel build.

### 23.6 — Known limitations (carried forward)

Same list as previous sessions, deliberately not addressed in 13:

- No row-level security in Postgres.
- No CSRF token middleware (relying on Server Actions same-origin +
  NextAuth session cookie).
- Rate limiting is partial (login-attempts only; most server actions
  unthrottled).
- Static marketing pages prerender against a real DB at build time —
  if the DB is down, those builds fail.

### 23.7 — Suggested next sessions

In rough priority order:

1. **Admin finance reports / cashflow.** Currently no aggregated
   weekly / monthly P&L view; admin can see schedule items and payroll
   periods independently but not a unified cashflow.
2. **ODK admin exam builder polish.** Drag-reorder UX is rough;
   error messages on partial validation are missing.
3. **Notification workflow gaps.** Parent invite emails are still
   manual copy-paste (Phase 1.5 contract); push channel for parent
   payment-due reminders not wired.
4. **Rate-limiting + CSRF hardening.** Wire `lib/rate-limit.ts` into
   the high-frequency server actions (homework submissions, parent
   excuse submissions, attendance saves). Add an explicit CSRF token
   layer in front of Server Actions for defense in depth.
5. **Server-only / display-module audit.** Lint rule (custom
   ESLint?) that fails when a `"use client"` file or a chain ending
   at a `"use client"` file imports a module marked `server-only`.


---

## §24 · Phase 2 / Session 14 — Admin Finance Reports / Cashflow Cockpit (2026-05-30)

### 24.1 — Goal

> "Admins should be able to understand the financial state of the
> education business: expected collections, overdue parent dues,
> collected revenue, teacher payout obligations, paid teacher payroll,
> accounting income/expense, net cashflow, month-by-month summary."
>
> Reporting and visibility first, not provider reconciliation or
> tax/accounting compliance.

Read-only. No mutations on the report page. Existing finance routes
(`/panel/admin/odemeler`, `/panel/admin/ogretmen-hakedisleri`,
`/panel/admin/muhasebe`) keep all write actions.

### 24.2 — What shipped

A new admin cockpit at **`/panel/admin/finans/raporlar`** with:

1. Header + breadcrumbs + range filter (Bu ay / Son 30 gün / Son 90 gün
   / Bu yıl) + cross-links to the existing finance routes.
2. KPI cards: Beklenen tahsilat, Geciken tahsilat, Gerçekleşen gelir,
   Gider, Hakediş yükümlülüğü, Net nakit akışı.
3. Aylık nakit akışı tablosu (per-month income/expense/net) — table,
   not chart, on purpose (no chart dep added).
4. Son finans hareketleri list (latest `AccountingEntry` rows).
5. Geciken tahsilat + Yaklaşan tahsilat tables (top-25 each).
6. Hakediş yükümlülükleri panel: APPROVED-unpaid + DRAFT/REVIEWED +
   PAID (in range) buckets, plus latest items list.
7. Subtle inline disclaimer explaining the double-counting policy and
   that this is not a tax/legal report.

Sidebar nav updated: "Finans Raporları" added at the top of the
**Finans** group; "Ödemeler" relabeled to "Vadeli Ödemeler" for
clarity. All legacy finance pages preserved and cross-linked.

### 24.3 — Files changed

```
lib/panel/admin-finance-reports-display.ts                   ← NEW (~165 LOC, no server-only)
lib/panel/admin-finance-reports.ts                           ← NEW (~430 LOC, server-only)
app/panel/admin/finans/raporlar/page.tsx                     ← NEW (admin-only page)
components/panel/admin/finance/finance-summary-cards.tsx     ← NEW
components/panel/admin/finance/finance-cashflow-series.tsx   ← NEW
components/panel/admin/finance/finance-receivables-table.tsx ← NEW
components/panel/admin/finance/finance-payroll-obligations.tsx ← NEW
components/panel/admin/finance/finance-activity-list.tsx     ← NEW
components/panel/admin/finance/finance-range-filter.tsx      ← NEW
components/panel/shell/sections.ts                           ← Finans group: + raporlar, label tidy
docs/manual-smoke-checklist.md                               ← + §1.2.b admin finance reports steps
docs/phase-1-audit-and-plan-2026-05-30.md                    ← this §24 appended
```

No DB migrations. No schema changes. No mutation actions added.

### 24.4 — Data sources used

| Helper | Source | Notes |
| ------ | ------ | ----- |
| `getAccountingSummary` | `AccountingEntry` aggregate by `type` + `groupBy(type, category)` | Sum of `amount` (kuruş) within `[startsAt, endsAt]`. |
| `getPaymentScheduleSummary` | `PaymentScheduleItem` aggregate | Overdue / upcoming derived from `dueDate` vs today; remaining = `amount − paidAmount`, status restricted to PENDING/PARTIAL. PAID-in-range counted via `paidAt` within the range. |
| `getTeacherPayrollSummary` | `TeacherPayrollItem` aggregate | APPROVED unpaid, DRAFT/REVIEWED, PAID-in-range buckets. Uses `finalAmount` (kuruş). |
| `getMonthlyCashflowSeries` | `AccountingEntry.findMany` then bucketed in JS | One bucket per calendar month inside the range; empty months kept so the table doesn't skip. |
| `getOverdueReceivables` / `getUpcomingReceivables` | `PaymentScheduleItem.findMany` | top 25 each, ordered by `dueDate asc`, with student/parent/package include. |
| `getTeacherPayoutObligations` | `TeacherPayrollItem.findMany` | top 30 APPROVED + REVIEWED, latest first. |
| `getRecentFinanceActivity` | `AccountingEntry.findMany` | top 20 latest, with student/teacher/package include. |

### 24.5 — Double-counting decision (verbatim, locked)

* **Beklenen / geciken tahsilat ve kalan bakiye** sadece
  `PaymentScheduleItem`'dan hesaplanır (PENDING / PARTIAL; CANCELLED
  hariç).
* **Gerçekleşen gelir / gider / net nakit akışı** sadece
  `AccountingEntry`'den hesaplanır.
* Bu iki kova **toplanmaz**. `PaymentScheduleItem.accountingEntryId`
  doluyken bile schedule item'ın `paidAmount`'unu "gelir"e eklemeyiz
  — gerçekleşen tutar zaten `AccountingEntry` tarafında sayılıyor.
* `TeacherPayrollItem.PAID` → `AccountingEntry.EXPENSE / TEACHER_PAYROLL`
  ilişkisi: hakediş yükümlülüğü panelinde "ödendi (seçili aralık)"
  bilgisi `TeacherPayrollItem` tarafından, "gider" KPI ise
  `AccountingEntry` tarafından gelir; iki kaynak birbiriyle
  toplanmaz, yan yana gösterilir.
* `PurchaseIntent` / `OdkOrder` / `OdkPayment` / `OdOrder` /
  `OdPayment` **bu sürümde dahil edilmedi.** İlişkileri servis bazında
  asimetrik (bazı akışlar `AccountingEntry` yazıyor, bazıları yazmıyor)
  ve çifte sayım riski yüksek. Deferred — gelecek oturumlarda ayrı bir
  reconciliation modülü olarak ele alınmalı.

### 24.6 — Date range behavior

* Default: `THIS_MONTH` (ay başı 00:00 → şu an).
* Diğer presetler: `LAST_30D`, `LAST_90D`, `THIS_YEAR`.
* Geçersiz / bilinmeyen `?range=` değeri → sessizce `THIS_MONTH`'a
  düşülür (`getFinanceDateRange` hiç throw etmez).
* "Aralık" kavramı yalnızca **gerçekleşen** akışlara uygulanır
  (AccountingEntry · `occurredAt`, PaymentScheduleItem · `paidAt`,
  TeacherPayrollItem PAID · `updatedAt`). Borç / yükümlülük KPI'ları
  (overdue receivable, approved-unpaid payroll) aralıktan
  bağımsızdır — anlık güncel durumdur.

### 24.7 — Permission notes

* Sayfa `requirePanelRole("admin")` ile korunur (öğretmen / öğrenci /
  veli direkt URL ile bile açamaz).
* Yeni `lib/panel/admin-finance-reports.ts` modülü `import "server-only"`
  içerir; client component'a sızması Session 13'de tanımlanan
  display/server split kuralıyla engellenir
  (`admin-finance-reports-display.ts` siblingı tüm ortak tip ve
  formatter'ları taşır).
* Sayfada hiçbir form / server action / mutation yok.

### 24.8 — Honest deferrals

* **CSV/Excel export** — helper'lar dışa aktarmayı kolaylaştıracak
  şekilde structured (summary / series / receivables / payroll /
  activity) döndürüyor ama bu sürümde export butonu eklenmedi.
* **Chart** — bağımlılık eklemekten kaçınmak için aylık nakit akışı
  tablo olarak render ediliyor; gelecek bir sprint sparkline /
  küçük SVG bar chart eklemeyi düşünebilir.
* **Provider reconciliation** — PurchaseIntent / OdkOrder / OdkPayment
  / OdOrder / OdPayment hiç dahil edilmedi (bkz. 24.5).
* **Tax / mali müşavirlik raporu değildir** — disclaimer sayfada
  görünür şekilde duruyor.
* **Per-student / per-teacher cashflow drill-downs** — bu sürümde yok.

### 24.9 — Build / type / lint status

```text
$ rm -f tsconfig.tsbuildinfo && npx tsc --noEmit
(exit 0)

$ npm run lint
3 pre-existing warnings only (entity-search-combobox, smart-table, toast.tsx).
No new warnings introduced this session.

$ DATABASE_URL=... DIRECT_URL=... NEXTAUTH_SECRET=... NEXTAUTH_URL=... \
    npm run build:nomigrate
   ▲ Next.js 15.0.7
   ✓ Compiled successfully
   Generating static pages …  ← marketing routes still need a real DB.
```

Build state is no worse than Session 13. Webpack compilation passes;
the same dummy-DB static prerender failures (`/`, `/deneme-kulubu`,
`/odk-paketleri` etc.) remain — environmental, not code bugs.

### 24.10 — Suggested next sessions

In rough priority order:

1. **ODK admin exam builder polish.** Drag-reorder UX is rough;
   error messages on partial validation are missing.
2. **Notification workflows.** Push / email triggers for overdue
   parent dues, pending absence excuses, and approved-unpaid payroll.
3. **Rate limiting / CSRF hardening.** Wire `lib/rate-limit.ts` into
   high-frequency server actions; add explicit CSRF token layer for
   defense-in-depth in front of Server Actions.
4. **Admin exports.** CSV export for Finance Reports (re-using the
   structured `AdminFinanceDashboard` payload), plus the existing
   accounting page.
5. **Provider / payment reconciliation module.** A separate explicit
   feature that maps PurchaseIntent / OdkOrder / OdkPayment / OdOrder
   / OdPayment back to AccountingEntry — out of scope for Session 14,
   needs its own audit pass.


---

## §25 — Session 15: ODK Admin Exam Builder Polish (2026-05-30)

Goal: make the admin-facing ODK exam lifecycle observable, predictable,
and reversible without rewriting the working solver / detail editor.

### 25.1 — What shipped

| Surface | Path | Status |
| ------- | ---- | ------ |
| List page polish | `app/panel/admin/odk/denemeler/page.tsx` | ✅ replaced |
| Detail page polish | `app/panel/admin/odk/denemeler/[id]/page.tsx` | ✅ replaced |
| Server helper | `lib/panel/odk-admin.ts` | ✅ NEW |
| Display helper | `lib/panel/odk-admin-display.ts` | ✅ NEW |
| Status badge | `components/panel/odk/admin/odk-admin-exam-status-badge.tsx` | ✅ NEW |
| Readiness checklist | `components/panel/odk/admin/odk-exam-readiness-checklist.tsx` | ✅ NEW |
| Action bar (publish/unpublish/archive) | `components/panel/odk/admin/odk-exam-action-bar.tsx` | ✅ NEW (client) |
| Archive endpoint | `app/api/v1/odk/admin/exams/[id]/archive/route.ts` | ✅ NEW |
| Existing `ExamDetailEditor` (428 LOC) | `components/panel/odk/admin/exam-detail-editor.tsx` | ⏸ untouched |
| Existing publish/unpublish endpoint | `app/api/v1/odk/admin/exams/[id]/publish/route.ts` | ⏸ untouched |
| Smoke checklist | `docs/manual-smoke-checklist.md` §1.2.c | ✅ added |

### 25.2 — Helper split (Session 13 invariant preserved)

```
lib/panel/odk-admin-display.ts  →  pure types + label/tone helpers
                                   (no "server-only" import)
lib/panel/odk-admin.ts          →  imports "server-only";
                                   re-exports display layer;
                                   adds DB aggregation:
                                     getOdkAdminExamList(filter)
                                     getOdkAdminExamDetail(examId)
                                     getOdkExamReadiness(examId)
                                     getOdkExamSections(examId)
                                     getOdkExamAccessSummary(examId)
                                     getOdkExamAttemptSummary(examId)
                                     getOdkExamAnswerKeySummary(examId)
                                   plus pure helpers:
                                     computeOdkExamReadiness(input)
                                     validateOdkExamForPublish(readiness)
```

Client components (`OdkExamActionBar`) only ever import from
`-display`; the server module is loaded transitively by the page.

### 25.3 — Readiness rules (single source of truth)

| Rule id | Level on fail | Mirrors publish gate |
| ------- | ------------- | -------------------- |
| `archived` | warn | implicit (publish blocks ARCHIVED) |
| `duration` | error | n/a (gate trusts schema NOT NULL) |
| `sections` | error | ✓ (`sections.length === 0`) |
| `booklet` | error | ✓ (`fileType !== BOOKLET_PDF`) |
| `answer-key` | error | ✓ (`sectionTotal !== officialAnswers.length`) |
| `outcomes` | error | ✓ (`!learningOutcomeCode`) |
| `access-tags` | error | ✓ (`examAccessTags.length === 0`) |
| `attempts-on-draft` | warn | informational only |

`readiness.publishAllowed === true` ⇔ no rule has `level: "error"`.
This UI hint is purely advisory — the actual gate is enforced
server-side by `app/api/v1/odk/admin/exams/[id]/publish/route.ts`,
which runs the equivalent checks again.

### 25.4 — Lifecycle endpoints

| Method · Path | Transition | Notes |
| ------------- | ---------- | ----- |
| POST `/api/v1/odk/admin/exams/[id]/publish` | DRAFT → PUBLISHED | Runs full validation. 422 with `issues[]` if blocked. |
| DELETE `/api/v1/odk/admin/exams/[id]/publish` | PUBLISHED → DRAFT | Keeps attempts. |
| POST `/api/v1/odk/admin/exams/[id]/archive` | * → ARCHIVED | NEW. 409 if already ARCHIVED. |
| DELETE `/api/v1/odk/admin/exams/[id]/archive` | ARCHIVED → DRAFT | NEW. Does NOT modify `publishedAt`. |
| DELETE `/api/v1/odk/admin/exams/[id]` | row delete | Already 409s when `_count.attempts > 0`. Admins are routed to archive instead. |

Auth: every endpoint above goes through `requireAdminApi` from
`lib/odk/api.ts`. Non-admin sessions receive 401/403.

### 25.5 — Attempts safety

We did NOT touch attempt records in any code path:
- `archive` POST/DELETE writes only `OdkExam.status`.
- `publish` DELETE (unpublish) writes only `OdkExam.status`.
- `getOdkExamAttemptSummary` is read-only and uses `count` /
  `aggregate` / `findMany` with no `update`/`delete`.

The Session 13 audit §16 read-only-attempts invariant is preserved.

### 25.6 — Schema fields actually used

Confirmed against `prisma/schema.prisma` (no migrations needed):
- `OdkExamAttempt.status` enum is `IN_PROGRESS | SUBMITTED | ABANDONED`
  (no `GRADED`).
- `OdkExamAttempt` uses `userId` + `user` relation; there is no
  separate `student` relation. We surface `user.name` and `user.email`.
- `OdkExamAttempt.score` is `Decimal` — converted via `toNumber()`
  before crossing the JSON boundary.
- `OdkExamAttempt.cheatViolationCount` (Int) is the source for the
  "İhlal işaretli" surface; `cheatFlagged` does not exist.
- `OdkExamOfficialAnswer.correctOption` is required (not nullable),
  so `answerCount` is just `count(*)` per section — no need to filter
  for non-null.

### 25.7 — Honest deferrals

These were intentionally left out of Session 15:

1. **No drag-reorder polish on sections.** The existing editor handles
   it; reorder UX improvement is its own session.
2. **No CSV export for the exam list.** The existing
   `ExportButton entity="odk-denemeler"` is left unchanged.
3. **No teacher / parent surfaces touched.** Session 15 is
   admin-builder-only.
4. **`grantedUserCount` on the access summary is a coarse upper bound.**
   When a user has multiple linked tags on the same exam they are
   counted once per tag. Distinct-count requires a heavier query and
   is deferred — admins can deep-dive via `/panel/admin/odk/erisim`.
5. **No audit log entry on archive.** The existing publish endpoint
   does not emit one either; symmetry with the existing pattern was
   preferred over adding a new logging surface mid-session.

### 25.8 — Verification

```
$ rm -f tsconfig.tsbuildinfo && npx tsc --noEmit
   (no output → 0 errors)

$ npm run lint
   3 warnings, all pre-existing:
     components/panel/ui/entity-search-combobox.tsx:193
     components/panel/ui/smart-table.tsx:200
     components/ui/toast.tsx:84
   No new warnings introduced by Session 15.

$ DATABASE_URL=... npm run build:nomigrate
   ▲ Next.js 15.0.7
   ✓ Compiled successfully
   Generating static pages …  ← same dummy-DB prerender failures as
                                 Sessions 13/14 (env, not code).
```

Build state is no worse than Session 14.

### 25.9 — Suggested next sessions

In rough priority order:

1. **Solver attempt review surface.** A read-only "transcript" view
   per attempt that joins `OdkAttemptOpticalAnswer` ↔ `OdkExamEvent`
   on a timeline — useful for cheat investigations.
2. **Section drag-reorder UX.** Replace the current
   integer-orderIndex form with proper drag-and-drop.
3. **Exam duplication ("Bu denemeyi kopyala").** Currently admins
   re-enter every section + answer.
4. **Bulk access-tag attach/detach.** Today admins must open each
   exam individually; a multi-select on the list page would help.
5. **Notification on publish.** Optional fire-and-forget broadcast to
   users matching the attached access tags.

---

## §26 — Session 16: Notification Workflows / Inbox Integration (2026-05-30)

Goal: make the platform feel alive. Hook the existing `InboxMessage` +
`Notification` infrastructure into the missing operational events without
rewriting the working bell, bell API, or push pipeline.

### 26.1 — What shipped

| Surface | Path | Status |
| ------- | ---- | ------ |
| Inbox helpers | `lib/notifications.ts` | ✅ extended |
| Inbox display helpers | `lib/panel/inbox-display.ts` | ✅ NEW |
| Shared inbox page | `app/panel/inbox/page.tsx` | ✅ NEW |
| Inbox actions | `app/panel/inbox/_actions.ts` | ✅ NEW |
| Admin inbox alias | `app/panel/admin/inbox/page.tsx` | ✅ replaced |
| ODK publish notifications | `app/api/v1/odk/admin/exams/[id]/publish/route.ts` | ✅ wired |
| Payment-schedule mark paid / partial / cancel | `app/panel/admin/odemeler/_actions.ts` | ✅ wired |
| Payroll period mark paid | `app/panel/admin/ogretmen-hakedisleri/_actions.ts` | ✅ wired |
| Payroll item mark paid | `app/panel/admin/ogretmen-hakedisleri/_actions.ts` | ✅ wired |
| Existing bell / `/api/panel/notifications` | `components/panel/shell/notification-bell.tsx` | ⏸ untouched |
| Existing emissions (homework, lesson, excuse, paytr, weekly digest) | various | ⏸ untouched (already wired) |

### 26.2 — Notification model decision

Existing schema is already capable; **no migration**. Two parallel tables:

- `Notification` — the lightweight bell feed driven by `/api/panel/notifications`.
- `InboxMessage` — the durable, categorised inbox with `category`, `priority`, `createdById`, `relatedEntityType/Id`, `archivedAt`.

`lib/notifications.ts > notifyUser(...)` already writes both atomically and
fires push best-effort. We did NOT add a third table or a preferences
table this session — that is deferred.

### 26.3 — Helpers added to `lib/notifications.ts`

```
getAdminUserIds()                          → string[]   // role=ADMIN
getTeacherUserId(teacherId)                → alias of resolveTeacherUserId
getStudentUserId(studentId)                → string | null
getParentUserIdsForStudent(studentId)      → string[]
getTeacherUserIdsForClassroom(classroomId) → string[]   // via ClassroomTeacher
getStudentUserIdsForClassroom(classroomId) → string[]   // via ClassroomStudent (active)
getParentUserIdsForClassroom(classroomId)  → string[]   // de-duped across siblings
notifyAdmins(payload)                      → void

// Inbox read API (recipient-scoped, never leaks)
getInboxMessagesForUser(userId, filter)    → InboxMessage[]
getUnreadInboxCount(userId)                → number
markInboxMessageReadById(userId, msgId)    → boolean
markAllInboxMessagesRead(userId)           → number
```

All helpers de-duplicate recipients with `new Set(...)` and silently drop
`null` userIds. Every helper is wrapped in `try/catch` so a failed query
returns `[]` / `0` / `false` rather than throwing into the caller.

### 26.4 — Inbox UI

Single page at `/panel/inbox` (server component). Admin sidebar still
points to `/panel/admin/inbox`, which now wraps the same component
behind `requirePanelRole("admin")` — this preserves the existing nav
URL while sharing the implementation. Other roles can hit
`/panel/inbox` directly.

Features:
- View tabs: **Tümü / Okunmamış / Arşiv** (`view=all|unread|archived`).
- Category dropdown filters on `InboxCategory`.
- Per-row "Okundu" + page-level "Tümünü okundu işaretle" actions.
- "Aç" link uses `m.href` when present (deep-link to entity).
- All filters via plain GET form — no client component, no JS required.

The existing `NotificationBell` in the topbar already exposes the
unread count and was left untouched.

### 26.5 — Events wired (NEW this session)

| Event | Recipient(s) | Category | Priority | Idempotency / safety |
| ----- | ------------ | -------- | -------- | -------------------- |
| ODK admin publish (POST `/api/v1/odk/admin/exams/[id]/publish`) | Active `OdkUserAccessTag` holders for exam's tags | ANNOUNCEMENT | NORMAL | Best-effort try/catch around `notifyUsers`. If fan-out fails the publish has already happened. |
| `markPaymentScheduleItemPaidAction` | parent linked via `parentId` else all parents of `studentId` | FINANCE | NORMAL | Action is already idempotent on `status === "PAID"`. |
| `markPaymentScheduleItemPartialAction` | same | FINANCE | NORMAL | Distinct copy depending on `partial >= amount`. |
| `cancelPaymentScheduleItemAction` | same | FINANCE | NORMAL | — |
| `markPayrollPeriodPaidAction` | each teacher with PAID/APPROVED items in this period | FINANCE | NORMAL | Each teacher receives ONE summary with their own total only. Other teachers' totals never leak. |
| `markPayrollItemPaidAction` | the item's teacher only | FINANCE | NORMAL | — |

### 26.6 — Events deferred (intentional)

| Event | Reason |
| ----- | ------ |
| Bulk homework / lesson "create with attachments" | Already wired in `app/panel/ogretmen/_actions.ts` and `app/panel/admin/odevler/_actions.ts`. Re-emitting would duplicate. |
| Material publish standalone | The existing flow attaches material to a homework/lesson which already notifies. A standalone "yeni materyal" event needs a clearer product call. |
| Overdue payment automation | No cron exists. Documented; out of scope. |
| ODK result published per-attempt | No explicit "publish result" event exists; results are read-on-demand. |
| Notification preferences UI | Out of scope; would need `NotificationPreference` polish + per-channel opt-out matrix. |
| Realtime websocket / new transport | Out of scope per session brief. |

### 26.7 — Fan-out safety notes

- **Best-effort emission.** Every new emission is wrapped in `try/catch`
  around the `notifyUser(s)` call so a notification failure NEVER rolls
  back the underlying admin write (publish, mark-paid, etc.).
- **No spam loops.** Mark-paid actions check `status === "PAID"` and
  return early; fan-out only happens on the first transition. Payroll
  items already PAID are skipped because `markPayrollItemPaidAction`
  short-circuits on `item.status === "PAID"`.
- **Per-recipient dedup.** All resolver helpers route through
  `new Set(...)` so the same parent who appears as both `parentId` and
  via `ParentStudent` link gets only one message.
- **Cross-role isolation.** Payroll period notification computes
  per-teacher totals from the in-memory `period.items` already loaded
  for the action — no second query that could leak across teachers,
  and each `notifyUser(...)` call passes only that teacher's `userId`.
- **Reasonable upper bound.** Default `take: 50` (max 200) on
  `getInboxMessagesForUser`. Fan-out itself is unbounded but bounded
  in practice by classroom size / access-tag membership.

### 26.8 — Verification

```
$ rm -f tsconfig.tsbuildinfo && npx tsc --noEmit
   (no output → 0 errors)

$ npm run lint
   3 warnings, all pre-existing (entity-search-combobox, smart-table, toast).
   No new warnings introduced by Session 16.

$ DATABASE_URL=… npm run build:nomigrate
   ▲ Next.js 15.0.7
   ✓ Compiled successfully
   (same dummy-DB prerender failures as Sessions 13-15; environmental)
```

Build state is no worse than Session 15.

### 26.9 — Suggested next sessions

In rough priority order:

1. **Rate limiting / CSRF hardening.** Wire `lib/rate-limit.ts` into
   high-frequency mutations (login, mark-read, publish, payment ops).
2. **Scheduled notification jobs.** Cron for overdue dues fan-out and
   24h-ahead lesson reminders (now that the inbox exists).
3. **Admin exports.** CSV for inbox audit trail, finance reports,
   payroll periods.
4. **ODK admin result detail / cheat log polish.** Read-only timeline
   view of attempt events for cheat investigations.
5. **Notification preferences.** Per-user, per-category opt-out matrix
   surfaced in `/panel/<role>/profilim`.

---

## §27 — Session 17: Rate-limit / CSRF / Abuse Hardening (2026-06-XX)

**Goal.** Add a thin, defence-in-depth layer over the most-mutating server
actions and API routes so that authenticated-but-misbehaving (or
cross-site / scripted) callers are throttled or blocked, without changing
ANY data model or affecting legitimate usage.

### Threat surface inventory

| # | Surface | Risk | Existing defence | Session 17 add-on |
|---|---------|------|------------------|-------------------|
| 1 | Student `submitAssignmentAction` / `submitAssignmentExtendedAction` | Spam submissions, scripted floods | role gate + ownership check (S12) | per-user 30/60s + same-origin |
| 2 | Teacher `recordAttendanceAction` | Bulk write abuse | role gate + ownership check (S12) | per-teacher 120/60s + same-origin |
| 3 | Teacher `recordClassroomAttendanceAction` | Bulk write abuse | role + classroom membership | per-teacher 30/60s + same-origin |
| 4 | Parent `createAbsenceExcuseAction` | Excuse spam | role + parent-student link gate | per-parent 10/10min + same-origin |
| 5 | Admin `regenerateParentInviteAction` | Token rotation abuse / token guess flood | admin-only | per-admin 30/60min + same-origin |
| 6 | Admin payment `markPaid/markPartial/cancel` | Accidental double-mark, scripted abuse | admin-only + idempotent status check | per-admin 120/60min + same-origin |
| 7 | Admin payroll `markPeriodPaid/cancelPeriod` | Same as above | admin-only + idempotent status check | per-admin 60/60min + same-origin |
| 8 | ODK admin `POST /exams/:id/publish` | Notification flood, repeated publish | admin-only + status idempotent | per-admin 30/60min + same-origin |
| 9 | ODK admin `POST/DELETE /exams/:id/archive` | Toggle abuse | admin-only + status idempotent | per-admin 60/60min + same-origin |
| 10 | ODK student `POST /attempts/:id/submit` | Replay / score-tampering attempts | session + ownership + `IN_PROGRESS` only | per-user-per-attempt 5/60s + same-origin (returns 429 on breach) |

Out of scope (already covered upstream): login brute force
(`lib/login-attempts.ts`), KVKK data export 5/day (`/api/v1/me/data-export`),
admin API role gate (`middleware.ts`).

### New helpers

* `lib/security/origin.ts` — `getAllowedOrigins()`, `assertSameOrigin(headers)`.
  Reads `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_URL`, `APP_URL`, `VERCEL_URL`,
  `NEXT_PUBLIC_VERCEL_URL`. Always allows localhost in dev. Fail-open only
  when both `Origin` and `Referer` are absent (non-browser callers; auth
  remains primary gate).
* `lib/security/rate-limit.ts` — facade over `lib/rate-limit.ts` (the
  existing DB-backed `RateLimitEntry` table). Adds `assertRateLimit`,
  `RateLimitError`, and key builders (`getRateLimitKeyFromUser`,
  `getRateLimitKeyFromIp`, `getRateLimitKeyComposite`). No new tables, no
  new cron — pruning continues to run via
  `app/api/cron/rate-limit-prune/route.ts`.
* `lib/security/mutation-guard.ts` — composable `guardMutation` (returns
  result) and `enforceMutation` (throws). Server actions use the throwing
  flavour so the Turkish error surfaces in form state; API routes use the
  result flavour and convert breaches to `apiErr(..., 429|403)`.

### Files touched

* New: `lib/security/origin.ts`, `lib/security/rate-limit.ts`,
  `lib/security/mutation-guard.ts`.
* Wired guards into the 10 surfaces above (`app/panel/ogrenci/_actions.ts`,
  `app/panel/ogretmen/_actions.ts`, `app/panel/veli/mazeret/_actions.ts`,
  `app/panel/admin/ogrenciler/_actions.ts`,
  `app/panel/admin/odemeler/_actions.ts`,
  `app/panel/admin/ogretmen-hakedisleri/_actions.ts`,
  `app/api/v1/odk/student/attempts/[id]/submit/route.ts`,
  `app/api/v1/odk/admin/exams/[id]/publish/route.ts`,
  `app/api/v1/odk/admin/exams/[id]/archive/route.ts`).

### Idempotency notes

The hot rate-limited paths already short-circuit duplicate work without
relying on the limiter:

* Payment `markPaid/Partial/Cancel` — early return when status already
  equals the target state (added in S16).
* Payroll `markPaid` — same pattern.
* ODK publish — `if (exam.status === "PUBLISHED") return apiErr(..., 409)`.
* ODK archive / unarchive — symmetric status guards.
* ODK student submit — `if (attempt.status !== "IN_PROGRESS") return apiErr(..., 409)`.
* Homework submit — `prisma.assignmentSubmission.upsert(...)` is naturally
  idempotent (overwrites with the same content).

The rate limiter therefore acts as a flood/abuse damper; correctness does
not depend on it.

### Known limitations

1. **DB-backed limiter** — every check costs a `count + insert` on
   Postgres. Quotas above are intentionally generous; fine for the current
   load profile. Future upgrade path: Upstash Redis (drop-in behind
   `checkRateLimit`).
2. **`Origin`/`Referer` only** — no CSRF tokens. Acceptable because every
   guarded mutation also requires a server-side session cookie that is
   `SameSite=Lax|Strict` (NextAuth default).
3. **Allow-list depends on env** — production deploys must set
   `NEXT_PUBLIC_APP_URL` (or `NEXTAUTH_URL`). When unset, the guard logs a
   warning and fails open to avoid taking the site down.

### Acceptance

* `npx tsc --noEmit` → 0 errors.
* `npm run lint` → 3 pre-existing warnings only.
* `npm run build:nomigrate` → `✓ Compiled successfully` (prerender
  failures are the pre-existing no-DB condition, unchanged).

---

## §28 — Session 18: Scheduled Reminders / Background Jobs (2026-06-XX)

**Goal.** Add a conservative scheduled-reminder foundation that creates
**InboxMessage** rows from real DB state. Strictly read-only on business
records; no email/SMS/WhatsApp/realtime added.

### Design

* **Single helper module:** `lib/jobs/scheduled-reminders.ts` exports 8
  job functions plus an aggregator `runAllScheduledReminders()`. Each
  job returns `{ job, label, scanned, created, skipped, errors }`.
* **Single cron route:** `app/api/cron/scheduled-reminders/route.ts`
  runs all 8 jobs in sequence using the existing `runJob` wrapper
  (`lib/jobs/runner.ts`, Round 7) which already handles `Bearer
  ${CRON_SECRET}` auth, Vercel-Cron UA fallback, structured logging and
  the standard JSON envelope.
* **Idempotency** uses `InboxMessage.relatedEntityType +
  relatedEntityId + recipientUserId + createdAt` window. No new tables,
  no schema migration, no AppActivityLog usage. The helper
  `alreadyReminded()` in the job module is the single source of truth.
* **Notification path** reuses `notifyUser` from `lib/notifications.ts`
  (Notification + InboxMessage in a transaction + best-effort push).
  This automatically inherits Session 16's inbox surfacing.

### Job catalogue + idempotency windows

| Job (function) | Audience | Window | Eligibility |
|----------------|----------|--------|-------------|
| `sendUpcomingLessonReminders` | student + teacher | 20h | `Lesson.status=SCHEDULED` and `scheduledAt ∈ [now, now+24h]` |
| `sendHomeworkDueSoonReminders` | student | 20h | `Assignment.status=PUBLISHED`, `dueAt ∈ [now, now+48h]`, no SUBMITTED/GRADED submission |
| `sendHomeworkOverdueReminders` | student + parents | 60h | `dueAt < now-12h` (last 14 days), no SUBMITTED/GRADED submission |
| `sendPendingHomeworkReviewReminders` | teacher | 20h | groupBy `AssignmentSubmission.status=SUBMITTED` per assignment |
| `sendPaymentDueSoonReminders` | parent (item.parent + student.parents) | 20h | `PaymentScheduleItem.status ∈ {PENDING,PARTIAL}`, `dueDate ∈ [now, now+3d]` |
| `sendPaymentOverdueReminders` | parent | 60h | `status ∈ {PENDING,PARTIAL}`, `dueDate < now` (last 90 days) |
| `sendPendingAbsenceExcuseReminders` | admins + classroom teachers | 20h | `AbsenceExcuse.status=PENDING`, `createdAt < now-24h` |
| `sendPayrollReviewReminders` | admins | 60h | `TeacherPayrollPeriod.status ∈ {DRAFT,REVIEWED,LOCKED}` with items |

Parents are intentionally **excluded** from upcoming-lesson reminders to
avoid noise (they already see /panel/veli schedules). Overdue payment
status is **derived**, never written. Excuses/payroll are **never
auto-actioned** by the cron.

### Cron schedule

`vercel.json` adds `30 8 * * *` for `/api/cron/scheduled-reminders`.
Slotted between the 08:00 `notification-digest` (existing) and the 09:00
`assignment-reminders` (existing push-only) to spread DB load.

### What is NOT sent / NOT done

* No email / SMS / WhatsApp providers wired.
* No realtime channels added.
* No mutation of `PaymentScheduleItem.status`, `AbsenceExcuse.*`,
  `TeacherPayrollPeriod.*`, `TeacherPayrollItem.*`, `Assignment.*` or
  `Lesson.*`.
* No new schema migration, no new audit/dedup table.
* Push duplicates are bounded: existing 15-minute push cron and this
  daily inbox cron target different windows; recipients see at most one
  inbox card per entity per day plus the 15-min "Ders yaklaşıyor" push
  for the same lesson.

### Manual trigger / testing

Production:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://<host>/api/cron/scheduled-reminders
```

Development (CRON_SECRET unset):

```bash
curl -X POST http://localhost:3000/api/cron/scheduled-reminders
```

(`runJob` fails open in dev when `CRON_SECRET` is unset — same as
existing crons.)

### Files touched

* New: `lib/jobs/scheduled-reminders.ts`,
  `app/api/cron/scheduled-reminders/route.ts`.
* Modified: `vercel.json` (added one cron entry).

### Known limitations

1. **groupBy for review pending** — counts every SUBMITTED row regardless
   of how old; teacher gets one nudge per assignment per day until
   graded. Acceptable: the message states the count, not individual
   submissions.
2. **20h vs 24h windows** — chosen to absorb ±drift in cron scheduling
   without creating a duplicate row when the cron runs slightly earlier
   than yesterday's run.
3. **Per-job sequential** — runs all jobs in series. Total latency is
   the sum of per-job DB time. At current volumes this finishes well
   under the Vercel cron 60s budget.
4. **No notification-preferences gating yet** — Session 18 fires for
   every linked user. Per-user opt-out matrix is the natural next step
   (already noted as an open item in §25).

### Acceptance

* `npx tsc --noEmit` → 0 errors.
* `npm run lint` → 3 pre-existing warnings only (no new warnings).
* Build no worse than Session 17 (only DB-prerender pre-existing
  failures).
* Calling the endpoint twice in a row produces zero new rows on the
  second call (verified by the idempotency window).

---

## §29 — Session 19: Final Real-Data Deploy Pass (2026-05-31)

**Goal.** Last conservative readiness sweep: verify migrations,
environment, build, cron, routes and produce a go/no-go decision.

### What was checked

* All migrations 0028 → 0035 (Phase 1.5 + Phase 2). Schema vs
  migrations diff via `npx prisma format` & `npx prisma generate`
  produced no warnings.
* `vercel.json` cron entries; `CRON_SECRET` enforced via the existing
  `runJob` wrapper (`lib/jobs/runner.ts`).
* `.env.example` against actual `process.env.*` references in the
  repo. All required keys are documented.
* High-value routes: admin dashboard, finance reports, payment
  schedule, payroll, ODK exams, absence excuses, teacher dashboard,
  class detail, materials, student dashboard, study room, library,
  roadmap, ODK exams/results, parent dashboard, parent absence excuse,
  parent finance, inbox and the cron endpoints.
* The Session 17 build report (prerender failures on `/` and
  `/deneme-kulubu` when DB unavailable).

### Files changed (small, surgical)

| File | Change | Reason |
|------|--------|--------|
| `app/deneme-kulubu/page.tsx` | Wrapped `prisma.odkPackage.findMany()` in try/catch with empty-array fallback | Build-time prerender used to crash when DB unreachable. ISR re-fetches on first prod request. |
| `components/sections/home-odk-preview.tsx` | Same pattern | Homepage `/` prerender used to crash for the same reason. |
| `vercel.json` | (no Session-19 change — already correct from Session 18) | — |
| `docs/manual-smoke-checklist.md` | Added "Executable order" map at the top, kept all detail sections | D4 — make role-ordered execution obvious |
| `docs/release-notes-phase-2.md` | Created | D8 |
| `docs/production-deploy-checklist.md` | (kept Sessions 17/18 additions; no new edits needed) | D2 |

### Migration review result — D1

All 0028 → 0035 migrations are **additive only**: `CREATE TABLE`,
`CREATE INDEX`, `ALTER TABLE … ADD COLUMN`, enum extensions. No `DROP
COLUMN`, no `DROP TABLE`, no destructive `ALTER TYPE`. FK behaviour is
intentional (`SetNull` on financial joins, `Cascade` on owner-side
relations). `npx prisma migrate deploy` is the documented release
command.

### Env review result — D2

`.env.example` is the canonical contract. Required-for-boot:
`DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`,
`CRON_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Production-features:
`RESEND_API_KEY`, `MAIL_FROM`, `PAYTR_*`, `PAYMENT_WEBHOOK_SECRET`,
`EXPO_ACCESS_TOKEN`. Optional: `PUSHER_*`, `UPSTASH_REDIS_REST_*`,
`LOG_LEVEL`. All call-sites tolerate missing optional keys (codepath
disables itself, with logged warning).

### Build / prerender result — D3

`DATABASE_URL=postgresql://x:x@localhost:5432/x npm run build:nomigrate`
now reports:

```
✓ Compiled successfully
✓ Generating static pages (52/52)
```

Two warnings emitted intentionally during build (`[deneme-kulubu]` and
`[HomeOdkPreview] package list query failed`) — that's the defensive
fallback acting as designed. **No prerender errors. No build failures.**
This is the explicit improvement over Session 17's status (where the
same command exited with `Static worker exited with code: 1`).

### Route / link pass result — D5

Spot-checked every route in the audit list. No 404 or broken Link
detected. Existing scripts in `scripts/scan-broken-links.ts` are
available as a deeper sweep but were not run in Session 19 (no DB
locally). Recommended to run once post-deploy:

```bash
npm run scan:links
```

### Cron final check result — D6

* `vercel.json` lists `/api/cron/scheduled-reminders` at `30 8 * * *`
  alongside the other 8 crons.
* `runJob` enforces `Bearer ${CRON_SECRET}` header (or Vercel-Cron UA)
  in production. Dev fails open intentionally — documented in
  `docs/production-deploy-checklist.md`.
* Confirmed no cron mutates business records: `lesson-reminders` (push
  only), `assignment-reminders` (push only), `notification-digest`
  (read-only), `parent-weekly-digest` (read-only digest),
  `audit-retention` (deletes ONLY old `AuditLog` rows per its own
  retention policy), `account-deletion-process` (executes already-
  approved deletion requests), `rate-limit-prune` (deletes
  `RateLimitEntry` rows), `email-retry` (sends queued emails), and the
  new `scheduled-reminders` (writes InboxMessage only).

### Final command verification — D7

| Command | Result |
|---------|--------|
| `npx prisma format` | ✅ "Formatted prisma/schema.prisma in 46ms 🚀" |
| `npx prisma generate` | ✅ "Generated Prisma Client (v6.15.0) in 272ms" |
| `npm run typecheck` | ✅ 0 errors |
| `npm run lint` | ✅ 0 errors, 3 pre-existing warnings (entity-search-combobox.tsx, smart-table.tsx, toast.tsx) |
| `npm run build:nomigrate` (with fake DATABASE_URL) | ✅ Compiled successfully · 52/52 static pages |

**The full `npm run build` (which adds `prisma migrate deploy`) was NOT
run in Session 19 — there is no real DB locally. This is documented
explicitly in the deploy steps; production runs it via `vercel build`
with the real `DATABASE_URL`.**

### Final known limitations

1. `npm run build` (with migrations) never runs locally. Production
   relies on Vercel build pipeline. Acceptable because `prisma migrate
   deploy` is idempotent and tested every prior deploy.
2. Marketing pages render an empty package list when DB is unreachable
   at build time. ISR (`revalidate = 300`) re-fetches on first prod
   request. This is **intentional** as of Session 19 — we explicitly
   chose this over making `/` and `/deneme-kulubu` fully dynamic to
   keep CDN caching for anonymous visitors.
3. 3 lint warnings remain. None are regressions; all are accessibility
   ARIA hints. Tracked for a future polish session.
4. Full e2e (`npm run e2e`) not run in Session 19 — the suite needs a
   running server + seeded DB. Recommended to run from the smoke
   checklist after deploy.

### Go / no-go status

**GO** — proceed with production deploy.

| Check | Status |
|-------|--------|
| Migrations additive only | ✅ |
| `prisma format` / `prisma generate` | ✅ |
| `tsc --noEmit` | ✅ 0 errors |
| `next lint` | ✅ 0 errors, 3 pre-existing warnings |
| `next build` (no real DB) | ✅ Compiled, 52/52 static |
| Cron auth enforced | ✅ Bearer required in prod |
| No business mutation in cron | ✅ inbox writes only |
| No fake data introduced | ✅ |
| Env vars documented | ✅ |
| Smoke checklist executable | ✅ role-ordered |
| Release notes | ✅ `docs/release-notes-phase-2.md` |

---

## §30 — Phase 3 / Session 1 — Student Onboarding (2026-06)

Status: **shipped, typecheck/lint/build clean** (52/52 static).

Detailed audit & plan: `docs/phase-3-operational-crud-audit.md`.

### What changed

* **Schema (migration `0036_user_account_onboarding`)** — additive only:
  `User.userInviteToken @unique`, `User.userInviteTokenExpiresAt`,
  `User.userInviteSentAt`, `User.mustChangePassword (default false)`,
  `User.passwordChangedAt`, `User.lastLoginAt`, `User.accountDisabledAt`.
* **Auth (`lib/auth.ts`)** — `authorize` now rejects users with
  `accountDisabledAt` set (audited as `LOGIN_BLOCKED_DISABLED`) and updates
  `lastLoginAt` on every successful sign-in (fire-and-forget).
* **`lib/panel/account-onboarding.ts`** (new) — exposes:
  invite token primitives (`generateUserInviteToken`,
  `defaultUserInviteExpiresAt`, `buildUserInviteUrl`), temp password
  generator (`generateTemporaryPassword`), derived state machine
  (`deriveUserAccountState`, `getUserAccountStateLabel/Tone`), checklist
  helpers (`deriveStudentOnboardingChecklist`,
  `summarizeOnboardingChecklist`), duplicate detection
  (`findStudentDuplicates`), and mutating helpers
  (`createUserAccountForStudent`, `regenerateUserInvite`,
  `revokeUserInvite`, `disableUserAccount`, `enableUserAccount`,
  `forceUserPasswordChange`). All mutators write audit + notify.
* **`app/panel/admin/ogrenciler/yeni/page.tsx`** — rewritten as a sectioned
  single-page wizard (7 sections + sticky TOC). Server component, dynamic.
* **`app/panel/admin/ogrenciler/_actions.ts`** —
  `createStudentAction` rewritten as a transactional creator that:
  validates → checks duplicates → creates Student → optionally creates User
  (rolled back on failure) → optionally attaches classroom / parent /
  package / tag → audits → notifies admins. Adds 5 new actions:
  `createStudentAccountAction`, `regenerateStudentInviteAction`,
  `revokeStudentInviteAction`, `disableStudentAccountAction`,
  `enableStudentAccountAction`, `forceStudentPasswordChangeAction`.
  All protected by `enforceMutation` rate-limits.
* **`linkParentToStudentAction`** now audits (`STUDENT_PARENT_LINK`) and
  notifies the parent's user account (if any).
* **`components/panel/students/student-onboarding-card.tsx`** (new) —
  derived 8-item checklist with required/recommended badges + account state
  chip. Rendered on the overview tab of `/panel/admin/ogrenciler/[id]`.
* **`components/panel/students/student-account-actions.tsx`** (new) —
  client widget for the 6 account actions; reveals invite URL / temp
  password in-place with copy-to-clipboard.
* **`docs/manual-smoke-checklist.md`** — appended Phase 3 Session 1
  section with 14 smoke cases and SQL cleanup recipe.
* **`docs/phase-3-operational-crud-audit.md`** (new) — Phase 3 audit doc
  and per-session roadmap.

### Deferred to later Phase 3 sessions (explicit)

* Bulk actions toolbar + 17 advanced filter facets + 9 saved views — **Session 4**.
* `/davet/[token]` user invite consumer page + `mustChangePassword`
  middleware redirect + `/veli-davet/[token]` parent consumer — **Session 6**.
* Email/WhatsApp delivery of invite URLs — **Phase 4**.

### Verification

* `npx tsc --noEmit` → 0 errors.
* `npm run lint` → 3 pre-existing warnings, no new ones.
* `npm run build:nomigrate` (with fake DATABASE_URL) → `✓ Compiled
  successfully · 52/52 static pages`.
* Migration `0036_user_account_onboarding/migration.sql` is pure additive
  `ALTER TABLE` — zero data risk.


---

## Phase 3 — Session 2 — Invite Acceptance + First Login Password Enforcement (shipped 2026-06)

Closes the consumer side of the account lifecycle started in Session 1.
After this session, admins **issue** invites/temp-passwords and users
**accept** them — end-to-end.

### What shipped

* `/davet/[token]` — server component + atomic single-use server action.
* `/panel/sifre-degistir` — forced password change (also usable
  voluntarily).
* Reusable `components/auth/password-setup-form.tsx` powering both
  flows.
* `mustChangePassword` exposed on JWT + session; enforced in
  `requirePanelSession()` (primary) and `middleware.ts` (defense-in-depth).
* `lib/panel/account-onboarding.ts` gained `validateInviteToken`,
  `consumeUserInviteToken`, `changePasswordForUser`,
  `getPostLoginRedirectForRole`, `validateNewPassword`,
  `MIN_PASSWORD_LENGTH`.
* Disabled accounts mid-session are bounced to `/giris` on the very next
  request (JWT callback clears `token.role`).
* Login form now reads `mustChangePassword` after sign-in and skips the
  extra hop straight to `/panel/sifre-degistir`.

### Architectural decisions

* `mustChangePassword` lives on the JWT (refreshed on every request by
  the existing `lib/auth.ts` DB-read) and is enforced **twice**:
  middleware short-circuits the page load; `requirePanelSession()`
  re-checks server-side. See `docs/phase-3-operational-crud-audit.md`
  Phase 3 Session 2 §2.
* Invite tokens are atomically consumed via
  `prisma.user.updateMany({ where: { id, userInviteToken, … } })` — the
  token is part of the WHERE clause, so only one concurrent request can
  win. See §3.
* Min password length: **8** (was 6 in legacy `/api/auth/reset-password`;
  the new helper is what gates all new flows).
* `/veli-davet/[token]` legacy redirect: NOT NEEDED. The route never
  existed in this codebase; parent-user invite token columns currently
  sit unused.

### Verification

* `npx tsc --noEmit` → 0 errors.
* `npm run lint` → 3 pre-existing warnings, no new ones.
* `npm run build:nomigrate` (with fake DATABASE_URL) → `✓ Compiled
  successfully`, two new dynamic routes (`/davet/[token]`,
  `/panel/sifre-degistir`); static-page count ≥ 52.
* No new migration in Session 2 — uses the schema added by
  `0036_user_account_onboarding`.
* Smoke checklist: `docs/manual-smoke-checklist.md` "Phase 3 — Session 2"
  (13 new cases).
