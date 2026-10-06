# Online Dershanem Panel — Notion-inspired UX, IA & Visual Roadmap

**Status:** Plan only. No code, schema, API or route was changed.
**Audited revision:** `50026d6` on `claude/blissful-cerf-5ltp54` (includes Phase 0 `e68ec25` and Phase 1 `eb4cc65`).
**Scope:** `app/panel/**` (106 route folders, 102 `page.tsx`, ~21k lines), `components/panel/**` + `components/odk/**` (136 files, ~30k lines), `lib/panel/**`, `lib/kocum/**`, `lib/odk/**`, `lib/products/staff-*`, `lib/auth/{guards,roles,product-panels}`, `lib/panel-feature-flags.ts`, `app/globals.css`, `next.config.ts` redirects, 136 API routes under `app/api/panel/**` and `app/api/odk/**`.

**Implementation status (update as phases land):**

| Phase | State |
|---|---|
| Design Phase 0 | **Partly done.** Done: MFA reset approval queue restored on `/panel/yonetim/kisiler` (`components/panel/pending-mfa-reset-queue.tsx`); menu entries for `/panel/odk/yonetim/sonuclar`, both pilot pages, `/panel/yonetim/kalite`, `/panel/ogrenci/haftalik`; §19.7 copy fixes; `lib/panel/status-vocabulary.ts`; `.pn-scope` token layer + `data-product` on the shell; `tests/e2e/panel-design-phase0.spec.ts`. **Open:** visual-regression screenshot baseline, preservation checklist fixture. |
| Design Phase 1 | **Partly done.** Done: shell restructure (gray 240px sidebar, `WorkspaceSwitcher`, global Bildirimler with count, bottom block with Ayarlar / İşletme / account), 48px context bar with `ContextBreadcrumb`, white canvas, `.pn-scope` focus ring, nav accent bar, one `PageHeader` scale behind `PanelHeading` / `PanelPageHeader` / `AdminPageHeader`, account and panel preferences moved out of menus into the Ayarlar hub, panel-wide `error.tsx`, new loading skeleton, mobile bottom bar fits on one row. **Open:** collapsible sidebar rail, `CommandMenu` for every persona with permission predicates, remaining primitives (§18.2), ~20 hand-written `<h1>`s, staff-only bottom bar decision. |
| Design Phases 2–8 | Not started. |

**How to use this document:** §2, §3, §19 and §21 are the inventory and safety net. §5–§8 define the system. §9–§15 define each workspace. §22–§23 are the implementation order with file paths. Every proposed feature has a dependency tag:

| Tag | Meaning |
|---|---|
| `EXISTING` | Data and API exist today; UI work only (may need a new server read-model function, never a schema change) |
| `FRONTEND` | Pure presentation/token/component work |
| `PHASE-1` | Needs the staff-permission architecture. Phase 1 has **landed in `shadow` mode**; the UI can read `effectiveStaffPermissions()` today, but behaviour is only authoritative after `STAFF_PRODUCT_ASSIGNMENTS=enforce` |
| `PHASE-2` | Needs backend roadmap Phase 2 (selector/shell routing decisions) |
| `YON` | Needs Yön backend phase (Phase 3) |
| `DENEME` | Needs Deneme Ligi phase (Phase 4+: sessions, grants, scoring jobs) |

---

## 1. Executive UX Diagnosis

### 1.1 What is already strong (keep and build on)

1. **Security model is already "UI is presentation".** Every page runs its own guard (`requireRole`, `requireProductRole`, `requireStaffPermission`, `requireTeacherStaffPermission`, …, `lib/auth/guards.ts:123-231`). Navigation (`lib/panel/navigation.ts`) explicitly says hiding a menu item is not a security boundary. A redesign can freely move UI without touching authorization.
2. **One navigation source of truth.** `panelNavSections()` and `mobilePrimaryNav()` already build menus from role × product × feature flags × `activeProduct` scope × Deneme Ligi staff permissions, with tests (`lib/panel/navigation.test.ts`).
3. **A command palette and permission-filtered global search already exist.** `AdminCommandSearch` (⌘K / Ctrl+K, combobox/listbox ARIA, recent items) backed by `lib/panel/global-search.ts` + `global-search-server.ts` indexing students, parents, teachers, users, groups, lessons, orders, leads and Deneme Ligi exams.
4. **Several "next action" engines exist**: `buildStudentHomeActionPlan` (student "Şimdi / Sonra"), `buildTeacherAttentionInbox` (P0–P2), `admin-operations-center.ts` (BLOCKING / ACTION_REQUIRED / WATCH, 19 action codes), `parent-calm.ts`, `result-next-step.ts`, `odk/coach-bridge.ts` (released exam → coach plan suggestions). The target design is mostly *presenting these better*, not inventing data.
5. **Student 360 exists** with server-side tab loading and an access policy (`lib/panel/student-360/policy.ts`), used by admin and teacher.
6. **Yön domain is richer than its UI.** `WeeklyPlanTask` already has subject, topic, kind, duration, target type/value, priority, due date, actual questions/correct/wrong/blank/minutes, student note, difficulty felt, energy felt. `StudentGoal` has 7 kinds incl. `SUBJECT_NET`, `EXAM_TARGET`, `SCORE_TARGET`, `WEEKLY_STUDY_MINUTES`. `CoachingSession` has shared vs private note, meeting URL, reschedule proposal. Notes have `INTERNAL / STUDENT_VISIBLE / PARENT_VISIBLE`.
7. **The exam runner is reliability-first**: server clock offset, autosave with revisions, heartbeat, visibility/offline telemetry, `beforeunload` guard, mobile booklet/answers toggle (`components/odk/student-exam-runner.tsx`).
8. **Accessibility groundwork**: skip link, accessibility preference applier (reduced motion, high contrast, text scale), AA-corrected brand token split (`--dc-brand` vs `--dc-brand-strong`), axe specs (`tests/e2e/panel-accessibility.spec.ts`, `tests/storybook/a11y.spec.ts`).

### 1.2 What is weak

| # | Problem | Evidence |
|---|---|---|
| W1 | **Two visual generations coexist.** ~109 panel files use legacy site tokens (`text-(--site-ink)`, `--brand-olive`, `panel-surface`, `panel-card`, `site-btn`), ~95 use the newer `dc-*` tokens. Headings vary from 26px/800 to `clamp(1.45rem,3vw,2.15rem)` to `text-4xl`. | `ogretmen/plan/page.tsx:101-108`, `teacher-lesson-workspace.tsx:553`, `odk/ogrenci/denemeler/page.tsx:179`, `ui.tsx:85-91` |
| W2 | **Three competing page-header primitives** (`PanelHeading` 33 files, `PanelPageHeader` 21, `AdminPageHeader` 14) plus ~20 hand-written `<h1>`s. No breadcrumb anywhere except Student 360's single back link. | `components/panel/ui.tsx`, `admin-page-header.tsx` |
| W3 | **Card-on-gray everywhere.** Canvas is `#F6F8F7`, every section is a white 14px-radius bordered card (`PanelCard`, 49 files). KPI tiles (`PanelMetric`, `MetricCard`, `PanelStatCard`) appear on student home, ODK home, admin ops, result page. This is the "generic SaaS dashboard" look the brief rejects. | `panel-shell.tsx:337`, `globals.css:505`, `ogrenci/page.tsx:309-331`, `odk-home.tsx:55-77` |
| W4 | **No real product homes for Yön.** Student `activeProduct=OK` lands on the cross-product `/panel/ogrenci`. Coach-only teachers land on `/panel/ogretmen/plan` (a stacked list of every student's calendar + desk) — the Phase 1 PR calls this a known limitation. There is no coach home, no coach-student workspace, and `adaptivePlan` (the Yön plan) defaults to **off**. | `lib/products/product-entry.ts:27`, `lib/panel-feature-flags.ts:28` |
| W5 | **Exam workspace is a 9-section scroll** with numbered headings out of order ("1. Planlama", "8. Güvenlik", "2. PDF", "4. Yayın", "7. Atama", "9. Önizleme"), permission-gated panels appearing/disappearing in place. | `odk/yonetim/sinavlar/[id]/page.tsx:117-181`, `admin-exam-editor.tsx:378-900` |
| W6 | **Student 360 has 11 flat tabs** (Genel, Dersler, Ödevler, Öğretmenler, Veliler, Takvim, Gelişim, Denemeler, Koçluk, Risk, Hesap) — no product grouping, no activity timeline although `StudentTimelineEvent` with viewer visibility exists. | `lib/panel/student-360.ts:38-66` |
| W7 | **Legacy/internal copy leaks.** `productLabel()` still returns `onlinekoçum.` / `onlinedenemekulübüm.`; eyebrows read "ODK yönetimi / ODK öğrenci"; "ODK yayın kapıları", "Integrity inceleme", "Provisioning"; raw enums printed (`{item.kind}` on the coach desk, `{user.status}` in Kişiler, `TYT · SCORED` in search results); MATH_ONLY-era copy ("Sıradaki matematik denemene hazırlan"). | §19.4 lists every location |
| W8 | **Functionality already orphaned or unreachable.** (a) `/panel/yonetim/kullanicilar` list is redirected to `/kisiler` by `next.config.ts:110`, so its **pending MFA-reset approval queue** (`ApproveMfaResetButton`, `kullanicilar/page.tsx:533-571`) and role/product/status filters are unreachable. (b) No UI entry for `/panel/yonetim/pilot`, `/panel/odk/yonetim/pilot`, `/panel/yonetim/kalite`, `/panel/ogrenci/profil`. (c) Admin sidebar has no "Puanlama ve yayın" (`/panel/odk/yonetim/sonuclar`) although staff nav does. (d) Student weekly digest `/panel/ogrenci/haftalik` is reachable only from a notification. | §19 risk column |
| W9 | **Mobile = desktop squeezed.** Fixed 4-item bottom bar chosen by heuristics; topbar slot horizontally scrolls; tables flip to cards indiscriminately (`PanelTable` always cards on mobile). | `navigation.ts:395-500`, `panel-table.tsx` |
| W10 | **Client-heavy.** 95 of 136 panel/ODK components are `"use client"`, including large read-mostly ones (`group-360-view.tsx` 1094 lines, `teacher-lesson-workspace.tsx` 1014, `mock-exam-workspace.tsx` 837). | `grep "use client"` |
| W11 | **Command palette is role-gated, not permission-gated.** Deneme Ligi commands are `roles: ["ADMIN"]`; a TEACHER holding EXAM_OPERATOR in enforce mode never sees "Deneme operasyonunu aç". Students and parents have no palette. | `lib/panel/global-search.ts:143-155` |
| W12 | **Product accents are hard-coded per component.** Yön blue `#0754c9`, Deneme Ligi purple `#5b2599` live as literals in `components/account/product-panel-card.tsx:53-70`; the panel itself only knows OD green. | |

### 1.3 Diagnosis in one sentence

The panel's **data and permission architecture is ahead of its interface**: the work is to (1) unify the visual system, (2) restructure the shell around a workspace switcher + breadcrumb page header, (3) turn existing engines into calm "next action" homes per product, and (4) consolidate scattered admin/exam pages into object workspaces — while restoring the few capabilities that have already gone missing.

---

## 2. Current Functionality Inventory

Every route below was opened. "Key actions" lists mutations or important interactions (API or server action). Quality: **G** good, **F** fair, **W** weak (UX/visual, not correctness).

### 2.1 Shared / account routes

| Route | Guard | Purpose | Key actions | Q |
|---|---|---|---|---|
| `/panel` | session | Role router → `postAuthenticationPath` | redirect only | — |
| `/panel/urun-sec` | session | Product selector (ACTIVE / PILOT_CLOSED / PREPARING / LOCKED cards) | `POST /api/panel/active-product`; MFA + password-change redirects; locked CTAs | G |
| `/panel/ayarlar`, `/panel/ayarlar/[section]` | active user | Account hub (profile, education, children, contact, billing, consents, security), completion meter | server actions `saveProfileSettings`, `saveEducationSettings`, `saveContactSettings`, `saveBillingSettings`, `saveConsentSettings`, `addPendingChild`, `cancelPendingChild` | G |
| `/panel/bildirimler` | active user | Notification inbox + preferences, type filter, pagination | `POST /api/panel/notifications/read`, `/notifications/preferences` | F |
| `/panel/erisilebilirlik` | active user, flag `accessibilityProfile` | Accessibility preferences, academic accommodation view | `POST /api/panel/accessibility/preferences` | F |
| `/panel/veri-kullanimi` | flag `offlineMode` | Low-data / offline writes preferences | `/api/panel/network/preferences` | F |
| `/panel/guvenlik` | active user | MFA (TOTP enroll, passkey, code verify) | `/api/auth/mfa/*` | F |
| `/panel/oturumlar` | session | Active sessions management | session revoke | F |
| `/panel/parola` | session | Change password | `/api/auth/change-password` | F |

Shell-level capabilities (in `PanelShell`): skip link; unread notification dot; sessions shortcut; avatar → account (`/panel/ayarlar` for student/parent, `/panel/guvenlik` for staff); product switch link; business workspace switch (`İşletme paneline geç`) derived from real business assignment; admin "View As" preview picker + banner; admin teacher-mode switch + banner; ⌘K search (ADMIN/TEACHER); `AccountCompletionBanner`; `PanelFeatureProvider`; `OfflineSyncProvider`; `AccessibilityPreferenceApplier`; logout.

### 2.2 Student

| Product | Route | Guard | Purpose | Key actions | Q |
|---|---|---|---|---|---|
| Shared | `/panel/ogrenci` | panel role STUDENT | "Bugün": greeting, Şimdi (primary next action), Sonra list, "Bugünün tamamı" unified list, Bu hafta KPI tiles, plan card, latest Deneme card, net trend; OD start card; NoProductAccess | complete plan task from home (`/api/panel/adaptive-plan/tasks/[id]/complete`), Dino explanation, tracked links | F |
| Shared | `/panel/ogrenci/odevler` | role | "Çalışmalar": OD assignments list | submit (`/api/panel/assignments/[id]/submissions`) | F |
| OD | `/panel/ogrenci/takvim` | role | Lessons table, upcoming/completed filter | `.ics` export (`/api/panel/calendar/export`), join/open | F |
| OD | `/panel/ogrenci/takvim/[id]` | role | Lesson detail: teacher note, given work, next goal | open materials/assignment | F |
| OD | `/panel/ogrenci/materyaller` | role | Materials list | download (`/api/panel/materials/[id]/file`) | W (legacy tokens) |
| OD | `/panel/ogrenci/tekrar` | role, flag `reviewQueue` | Spaced review queue | respond / defer (`/api/panel/review-queue/[id]/*`) | F |
| OD | `/panel/ogrenci/telafi` | role, flag `recoveryPackage` | Missed-lesson recovery packages | complete items, checkpoint | F |
| OD/OK | `/panel/ogrenci/check-in` | OD or OK, flag `studentCheckIn` | Weekly check-in + help request | `POST /api/panel/student-check-ins` | F |
| OD/OK | `/panel/ogrenci/denemeler` | OD or OK, flag `mockExamAnalysis` | External (school/publisher) mock exam entry & error analysis | create/update/delete `MockExam` (`/api/panel/mock-exams*`) | F |
| Shared | `/panel/ogrenci/analiz` | role, flag `progressInsights` | "Gidişatın": academic + behavioural blocks, weekly goal | set weekly goal (`/api/panel/student/weekly-goal`) | F |
| Shared | `/panel/ogrenci/gelisim` | role | Redirect → `/analiz` or home | — | — |
| Shared | `/panel/ogrenci/haftalik` | role, flag `parentWeeklyDigest` | Calm weekly digest | feedback | F (no nav entry) |
| Shared | `/panel/ogrenci/dino` | panel role, flag `dinoAi` | Dino chat | `POST /api/panel/dino` | F |
| Shared | `/panel/ogrenci/profil` | panel role | Read-only profile + links to password/sessions | — | W (**orphan**, superseded by `/panel/ayarlar`) |
| Yön | `/panel/ogrenci/kocluk` | product OK | Coach card, coaching sessions, Yapılacaklar, goal summary, quick links | session reschedule request (`/api/panel/coaching-sessions/[id]`) | F |
| Yön | `/panel/ogrenci/plan` | product OK, flag `adaptivePlan` | Adaptive weekly plan (883-line client component): preferences, generate, tasks, complete | `/api/panel/adaptive-plan/{generate,preferences}`, `/api/panel/kocum/tasks/[id]/complete`, request change | F |
| Yön | `/panel/ogrenci/hedefler` | product OK | Goal list (cards) | read-only | F |
| DL | `/panel/odk/ogrenci` | product ODK | `OdkHome` STUDENT: metric cards + primary card | — | W |
| DL | `/panel/odk/ogrenci/denemeler` | product ODK | Sections: Devam eden, Başlayabileceğin, Yaklaşan, Sonuçlar (cards) | open | F |
| DL | `/panel/odk/ogrenci/denemeler/[id]` | product ODK | `StudentExamStart`: rules, Meet link, start | `POST /api/odk/student/exams/[id]/start` | F |
| DL | `/panel/odk/ogrenci/denemeler/[id]/coz` | product ODK | Runner | answers, heartbeat, events, timings, submit; booklet | G (reliability) / F (visual) |
| DL | `/panel/odk/ogrenci/denemeler/[id]/sonuc` | product ODK | Result: metric tiles, Ders bazlı, Kazanım görünümü, next-step recommendations, Zaman analizi, Soru cevap dökümü, answer-key PDF | Dino explanation, tracked links to plan/review | F |

### 2.3 Parent

| Product | Route | Purpose | Key actions | Q |
|---|---|---|---|---|
| Shared | `/panel/veli` | `ParentCalmHome` "Çocuğum nasıl gidiyor?" with child switcher, attention, weekly summary, academic, coaching | child switch (query) | G |
| Shared | `/panel/veli/analiz` | Academic progress | — | F |
| Shared | `/panel/veli/takip` | redirect → home/analiz | — | — |
| Shared | `/panel/veli/haftalik` | Teacher weekly digest (flag) | feedback (`/api/panel/weekly-digests/[id]/feedback`) | F |
| OD | `/panel/veli/takvim` | Lessons | — | F |
| OD | `/panel/veli/odevler` | Assignments (read-only) | — | F |
| OD | `/panel/veli/ogretmenler` | Teachers | — | F |
| OD | `/panel/veli/denemeler` | External mock exams (flag) | parent can record? (uses `MockExamWorkspace`) | F |
| Yön | `/panel/veli/kocluk` | Coach, this week, coach summary (PARENT_VISIBLE only) | — | F |
| DL | `/panel/odk/veli`, `/panel/odk/veli/raporlar` | `OdkHome` PARENT, `AudienceReports` | — | F |
| Shared | `/panel/veli/dino` | Dino (flag) | chat | F |
| Shared | `/panel/veli/hesap` | Linked students, payments, package change request | server action `requestPackageMeeting` | F |
| Shared | `/panel/veli/bildirimler` | redirect → `/panel/bildirimler` | — | — |

### 2.4 Teacher (OD) and Coach (Yön)

There is **no COACH platform role**: a coach is a `TEACHER` with `ProductStaffAssignment COACH@OK` (legacy `isCoach`). Pages are split by staff permission only where Phase 1 added it.

| Product | Route | Guard | Purpose | Key actions | Q |
|---|---|---|---|---|---|
| OD (+OK block) | `/panel/ogretmen` | role TEACHER | "Bugün ne yapmam gerekiyor?": `CoachAttention` (Yön signals) + `TeacherWorkspaceHome` (lessons, pending work, risky students, upcoming) | links, Dino | F |
| OD | `/panel/ogretmen/takvim` | role | Weekly lesson calendar | open lesson | F |
| OD | `/panel/ogretmen/ders/[id]` | role | Lesson workspace (1014 lines): attendance, notes, assignment creation, templates, quick close | `/api/panel/lessons/[id]*`, `/api/panel/assignments`, `/api/panel/teacher/templates*` | F |
| OD | `/panel/ogretmen/odevler` | role | Assignment manager | create/update, review submissions, progress | F |
| OD | `/panel/ogretmen/gruplar` | role | "Öğrencilerin" roster, risky filter | — | F |
| OD | `/panel/ogretmen/ogrenci/[id]` | role | Student 360 (teacher view) | tab-specific | F |
| OD | `/panel/ogretmen/materyaller` | role | Material manager | upload/update/delete | F |
| OD | `/panel/ogretmen/tekrar` | role, flag | Review monitor | create review items | F |
| OD | `/panel/ogretmen/telafi` | role, flag | Recovery manager | generate/publish packages | F |
| OD | `/panel/ogretmen/analiz` | role, flag | Group trend | — | F |
| OD | `/panel/ogretmen/denemeler` | role, flag | External mock exam analysis | — | F |
| OD | `/panel/ogretmen/ai-yardimci` | role, flag | AI drafts | create/review drafts | F |
| Yön | `/panel/ogretmen/plan` | `ok:coaching:write`, flag `adaptivePlan` | Coach desk: pending suggestions, per-student week calendar (drag/drop) + desk (add task, apply template, copy plan, note with visibility, weekly summary), plan approval list | `/api/panel/kocum/{tasks,templates/[id]/apply,plans/[id]/copy,notes,summaries,suggestions/[id]/review,tasks/[id]/reschedule}`, `/api/panel/adaptive-plan/[id]/approve` | W (legacy tokens, stacked) |
| Yön | `/panel/ogretmen/hazirlik/[id]` | `od:lesson:teach` or `ok:coaching:write` | Session prep: last week plan, lesson & exam signals, record session, goals, this week's plan | server actions `recordCoachingSession`, `setStudentGoal` | F |
| Yön | `/panel/ogretmen/yardim` | role, flag `studentCheckIn` | Help requests | respond / feedback | F |
| Yön | `/panel/ogretmen/mudahale` | role, flag | Intervention inbox | create, update, generate | F |
| Yön | `/panel/ogretmen/ozetler` | role, flag | Weekly digest review | generate, publish | F |
| DL | `/panel/odk/ogretmen`, `/panel/odk/ogretmen/raporlar` | `odk:report:read_related` | Related students' Deneme reports | — | F |

### 2.5 Deneme Ligi staff (EXAM_EDITOR / EXAM_OPERATOR / RESULT_PUBLISHER / REPORT_VIEWER / PRODUCT_MANAGER) and Admin

| Route | Guard | Purpose | Key actions | Q |
|---|---|---|---|---|
| `/panel/odk` | — | entry redirect | — | — |
| `/panel/odk/yonetim` | any ODK staff permission | ADMIN: `OdkHome` (metrics, pilot readiness); staff: `OdkStaffHome` (permitted module tiles) | — | W |
| `/panel/odk/yonetim/sinavlar` | any of `ODK_EXAM_LIST_PERMISSIONS` | Exam list + `AdminExamCreate` (new exam / new series) | `POST /api/odk/admin/exams`, `/exam-series` | F |
| `/panel/odk/yonetim/sinavlar/[id]` | same, each panel by permission | Exam workspace: JSON import (answer key/outcomes), editor (planning, PDFs, questions + outcomes, publish controls, security policy, scoring shortcut), assignment, preview, results review & release, integrity review | `/api/odk/admin/exams/[id]/{,files,questions,imports/*,ready,schedule,score,rescore,assignments,preview,results,release,release/preview}`, `/api/odk/admin/attempts/[id]` | W (structure) |
| `/panel/odk/yonetim/operasyon` | `odk:ops:live` | Live operations console with refresh | refresh | F |
| `/panel/odk/yonetim/sonuclar` | `odk:result:score` | Scoring & release list | link to exam | F (missing from ADMIN nav) |
| `/panel/odk/yonetim/raporlar` | `odk:report:read_all` | Audience reports (admin) | — | F |
| `/panel/odk/yonetim/paketler` | `odk:package:manage` | Package ↔ entitlement ↔ exam contract view | — | F |
| `/panel/odk/yonetim/pilot` | ADMIN | Deneme Ligi pilot runs & release gates | create/update pilot runs | F (**orphan**) |

### 2.6 Admin (education + operations)

| Route | Purpose | Key actions | Q |
|---|---|---|---|
| `/panel/yonetim` | `AdminOperationsCenter` (action items, risk, summary tiles, health) + `AdminPreviewEntry` | links | F |
| `/panel/yonetim/mudahale` | Intervention inbox (flag) | create/update/generate | F |
| `/panel/yonetim/isler` | Activation desk (1007 lines): first-lesson metrics, job table, onboarding, lead status, email retry, order-user link | `/api/panel/orders/[id]/{user,onboarding}`, `/api/panel/leads/[id]`, `/api/panel/email-outbox/[id]/retry` | F |
| `/panel/yonetim/basvurular` | Self-signups: tabs, contact control, child account creation | `/api/panel/signups/*` | F |
| `/panel/yonetim/kisiler` | People hub, role tabs (`sekme`), search, create user, bulk ops | `POST /api/panel/users`, `/users/bulk` | F |
| `/panel/yonetim/kullanicilar` | **Unreachable** (redirected). Contains filters (rol/urun/durum), create user, row actions, **pending MFA reset approvals** | `/api/panel/mfa-resets/[id]/approve` | — |
| `/panel/yonetim/kullanicilar/[id]` | User detail (743 lines): profile form, accessibility accommodation, **product access**, **staff responsibilities (Access Center)**, MFA reset request, row actions, archive with impact, teacher offboarding, admin preview launch, student-teacher link, signup profile | `/api/panel/users/[id]/{,products,staff-roles,accessibility,mfa-reset,status,archive-impact,offboarding,reset-password,coach-profile}`, `/api/panel/student-teachers` | F |
| `/panel/yonetim/ogrenciler` | Student list (q, urun, durum, paging) | row actions | F |
| `/panel/yonetim/ogrenciler/[id]` | Student 360 (admin) + "Öğrenci Panelini Gör" | preview | F |
| `/panel/yonetim/veliler` | Parent list + link/update/remove relationship | `/api/panel/relationships*` | F |
| `/panel/yonetim/egitmenler` | Teachers list (groups, students, fill rate) | — | F |
| `/panel/yonetim/egitim` | Groups, lesson planning, assignments, materials, setup wizard | `/api/panel/{groups,lessons,lessons/preview-series,setup,users}` | F |
| `/panel/yonetim/gruplar/[id]` | Group 360 (1094 lines) | `/api/panel/groups/[id]{,/members}` | F |
| `/panel/yonetim/takvim` | Weekly lesson calendar with teacher/group filters | — | F |
| `/panel/yonetim/kocluk` | Yön ops: 3 counters, signals, intervention table with **assign/transfer coach form** (capacity override reason), coach load, recent sessions, students without goals | server action `assignCoach` | F |
| `/panel/yonetim/kazanimlar` | Curriculum versions/outcomes (flag) | `/api/panel/curriculum/*` | F |
| `/panel/yonetim/denemeler` | External mock-exam analysis (flag) | — | F |
| `/panel/yonetim/siparisler`, `/[id]` | Orders list; order detail (payment, access, onboarding, provisioning) | server action `retryOrderProvisioning`, order-user link | F |
| `/panel/yonetim/analitik`, `/[metric]` | Management analytics with definitions | export | F |
| `/panel/yonetim/raporlar` | 30-day operations & audit report | export | F |
| `/panel/yonetim/kayitlar` | Audit log with type filter | — | F |
| `/panel/yonetim/ozellikler` | Feature snapshot | — | G |
| `/panel/yonetim/kalite` | Cohort learning quality (flag `cohortQuality`) | — | F (**orphan**) |
| `/panel/yonetim/pilot` | OD pilot cohorts & readiness gates | `/api/panel/pilot-cohorts*` | F (**orphan**) |
| `/panel/yonetim/isletme/[section]` | Separate **İşletme** workspace (CRM, marketing, finance, AI & automation, platform) with own nav; 40 server actions | many | out of scope (shell only) |

---

## 3. Current Information Architecture

### 3.1 Route trees

```text
/panel
├── urun-sec                      product selector (all roles)
├── ayarlar[/section] · bildirimler · erisilebilirlik · veri-kullanimi · guvenlik · oturumlar · parola
├── ogrenci/…                     STUDENT — OD + Yön mixed in one tree
├── veli/…                        PARENT — OD + Yön mixed in one tree
├── ogretmen/…                    TEACHER — OD + Yön (coach) mixed in one tree
├── yonetim/…                     ADMIN — OD + Yön ops + commerce + system; isletme/* separate workspace
└── odk/                          Deneme Ligi has its own tree per audience
    ├── ogrenci/denemeler/[id]/{coz,sonuc}
    ├── veli/raporlar
    ├── ogretmen/raporlar
    └── yonetim/{sinavlar/[id],operasyon,sonuclar,raporlar,paketler,pilot}
```

### 3.2 How product scope works today

* `Session.activeProduct` (written by `/panel/urun-sec`) is **presentation only**.
* Student/parent menus are rebuilt with the single scoped product; teacher/admin menus filter items via `NAV_ITEM_SCOPE` (`navigation.ts:256-284`); items not in that table are "shared" and appear in every scope.
* In ODK scope the "Bugün" item is rewritten to the ODK home; in OD/OK scope it is the role root.
* Teacher in ODK scope under `enforce` gets a menu built from staff permissions (`staffOdkNavItems`).
* Entry routing: `resolveProductEntryPath` — OK teacher → `/panel/ogretmen/plan`; ODK staff → `resolveOdkStaffHome` (single module / staff home / report workspace).

### 3.3 Current sidebar (as built)

| Persona | Sections → items |
|---|---|
| Student | BUGÜN (Bugün, Çalışmalar) · DERSLER (Dersler, Kaynaklar)* · PLAN (Koçluk, Plan†, Hedefler)* · DENEMELER (Deneme Ligi / dış denemeler)* · GELİŞİM (Analiz/Gelişim, Check-in†, Dino†) · AYARLAR (Hesap ayarları, Bildirimler, Erişilebilirlik†, Veri kullanımı†) |
| Parent | BUGÜN (Bugün, Akademik gelişim, Haftalık özet†) · DERSLER (Dersler, Ödev, Öğretmenler)* · KOÇLUK* · DENEMELER* · HESAP (Dino†, Hesap ve paket, + common) |
| Teacher | BUGÜN · DERSLER (Dersler, Çalışmalar) · ÖĞRENCİLER · KOÇLUK (Haftalık plan†, Tekrar†, Yardım†, Müdahale†, Haftalık özet†, Telafi†) · ÖLÇME (Analiz†, Denemeler†, Kulüp deneme raporları†) · KAYNAKLAR (Kaynaklar, AI yardımcı†) · AYARLAR |
| Admin | BUGÜN (Operasyon merkezi, Operasyon, Provisioning) · KİŞİLER (Yeni kayıtlar, Kişiler) · EĞİTİM (Ders/grup/ödev, Takvim, Koçluk, Kazanımlar†) · DENEMELER (Deneme yönetimi, Canlı Operasyon, Sonuç ve kulüp raporları, Kulüp paketleri, Sonuç analizi†) · SİSTEM (Siparişler, Analitik, Özellikler, İşlem geçmişi, Raporlar) · GENEL |
| DL staff (enforce) | DENEME LİGİ (Bugün→home, permitted modules, Öğrenci deneme raporları) · AYARLAR |

`*` product-gated · `†` feature-flag-gated. Up to **25 items** for admin, **18** for teacher — far beyond the 5–8 target.

### 3.4 IA problems

1. Teacher "KOÇLUK" mixes OD items (Tekrar, Telafi) with Yön items (plan, yardım) — scope filtering hides this only when a product is selected.
2. Yön has no home and no coach-student workspace; Deneme Ligi has homes but they are KPI tiles.
3. Admin people management is split across 6 routes (`kisiler`, `kullanicilar` (dead), `ogrenciler`, `veliler`, `egitmenler`, `basvurular`) + user detail.
4. Deneme Ligi exam lifecycle is split between a long scroll detail page, `sonuclar`, `operasyon` and `raporlar`, without an exam-centric navigation.
5. Three "operations" concepts for admin: Operasyon merkezi, Operasyon (`mudahale`/`raporlar`), Provisioning (`isler`).

---

## 4. UX Principles

The 15 brief principles stand. These are the operational rules that make them testable in review:

| # | Rule | How a reviewer checks it |
|---|---|---|
| P1 | **Every page answers one persona question** (§70 of brief) and states it in the page description, not in a hero. | The page's `PageHeader.description` reads as the answer, e.g. "3 görev, 1 koç görüşmesi". |
| P2 | **One primary button per page header.** Others go to a `⋯` menu or secondary buttons. | `PageHeader.primaryAction` is a single node. |
| P3 | **White canvas, no card unless it is an object, a grouped summary or an actionable queue.** | No `PanelCard` wrapping a single list/table/form section; sections are separated by headings + 1px rules. |
| P4 | **Product colour only on: active nav, workspace icon, badges, tiny markers, charts, selected rows.** Never on page backgrounds, headers or buttons. Primary buttons stay neutral-dark (ink) everywhere. | Grep for accent tokens used on `bg-` of containers. |
| P5 | **Density follows persona** (§5.7). | Row height token per workspace. |
| P6 | **Never show a capability the viewer cannot use.** Menus/commands/buttons are filtered by the same predicate the server uses (`navigation.ts`, `staff-permission-matrix.ts`), and server guards stay authoritative. | Permission E2E: hidden UI + direct URL 403/404. |
| P7 | **No internal vocabulary in UI.** No `ODK`, `OK`, enum names, model names, "provisioning", "integrity". | Copy lint (§19.4). |
| P8 | **Cross-product signals are one line, not a duplicate page.** | Signals render via a shared `ProductSignal` row with a product dot. |
| P9 | **Every list has a real empty state, every async region a skeleton and an error with retry.** | Storybook states per component. |
| P10 | **Keyboard first, never keyboard only.** ⌘K accelerates; sidebar remains complete. | a11y spec. |
| P11 | **Server components by default.** Client islands only for interaction. | New primitives ship as RSC unless they own state. |
| P12 | **Exam runner and live ops trade aesthetics for reliability and density.** | Separate visual rules (§11.6, §15.5). |

**How it is Notion-inspired without being Notion:** we borrow the *structure* (quiet sidebar, page-as-document with title + properties + body, database tables with views, breadcrumbs, ⌘K, side peek drawers, slash-like quick add) but keep our own *identity*: Manrope typography (not Notion's system/serif mix), our green/blue/purple product accents, Turkish education vocabulary, education-specific objects (lesson, plan task, deneme, net) with domain status badges, the Dino mascot as a contextual helper, and education-calm motion. We do **not** copy: emoji page icons, cover images, free-form block editing, the Notion gray (#F7F6F3) palette, or the toggle-list aesthetic for operational screens.

---

## 5. Panel Design System

### 5.1 Token architecture

Today the panel consumes `dc-*` (from `app/globals.css:195-260`, shared with the public site) **and** legacy `--site-*`, `--brand-olive`, `--pd-*`, plus panel CSS classes (`panel-surface`, `panel-card`, `panel-quick-action`, `panel-primary-button`, `panel-input`, `panel-label`, `site-btn`).

Target: a dedicated **panel layer** scoped to the panel shell, built on the shared foundation, so public marketing can evolve independently.

```text
foundation (shared, unchanged)      --dc-ink, --dc-line, --dc-brand-strong, --dc-font-sans …
        │
panel layer (new, .pn-scope)        --pn-canvas, --pn-sidebar, --pn-text-*, --pn-border-*,
        │                           --pn-hover, --pn-selected, --pn-accent-{od,yon,dl}, --pn-row-h-*
        │
Tailwind @theme aliases             bg-pn-canvas, text-pn-muted, border-pn-subtle, …
        │
panel primitives                    components/panel/ui/* (new folder; old ui.tsx re-exports during migration)
```

* Scope class: `PanelShell` root currently uses `site-scope dc-panel-bg`. Add `pn-scope`; keep `site-scope` until all legacy-token usages are migrated (Design Phase 8 removes it from the panel).
* Product accent is set by a `data-product="od|yon|dl"` attribute on the shell root from `navScope`, driving `--pn-accent` (and `--pn-accent-soft`). Components use `--pn-accent` only for P4 uses.
* Do not delete `dc-*` or `--pd-*`; public pages, `components/account/*`, auth screens use them.

### 5.2 Colour

**Neutral foundation (light):**

| Token | Value | Use |
|---|---|---|
| `--pn-canvas` | `#FFFFFF` | main workspace background (replaces `#F6F8F7`) |
| `--pn-sidebar` | `#F7F8F7` | sidebar, mobile drawer |
| `--pn-surface-subtle` | `#FAFBFA` | table header, property panel, code/inline blocks |
| `--pn-hover` | `rgba(20,32,28,.045)` | row/nav hover |
| `--pn-selected` | `rgba(20,32,28,.07)` | selected row, active nav background (neutral) |
| `--pn-border` | `#E9ECEA` | section rules, table borders |
| `--pn-border-strong` | `#D9DEDB` | inputs, focusable borders |
| `--pn-text` | `#14201C` (= `--dc-ink`) | primary text |
| `--pn-text-secondary` | `#4E5C56` (= `--dc-ink-body`) | body secondary |
| `--pn-text-muted` | `#5F6E67` | metadata, labels (AA on white: 5.4:1) |
| `--pn-focus` | `#0C7C57` 2px + 2px offset | focus ring (same in all products for predictability) |

Note: today `--dc-ink-muted`, `--dc-ink-faint`, `--dc-ink-ghost` are near-identical (`#5C6B65/#5F6E67/#64736C`) because they were darkened for contrast; collapse them into one `--pn-text-muted` in the panel layer.

**Product accents (existing brand values, currently hard-coded in `product-panel-card.tsx`):**

| Product | Accent (text/icon, AA) | Soft (badge bg) | Marker/chart (non-text) |
|---|---|---|---|
| onlinedershanem. (OD) | `#0C7C57` | `#EDF7F2` | `#14976B` |
| Yön Koçluk (OK) | `#0754C9` | `#E8F1FE` | `#0673F5` |
| Deneme Ligi (ODK) | `#5B2599` | `#F1EAFA` | `#6C35AC` |

**Semantic (status) colours** — shared across products, never product-tinted:

| Tone | Text | Soft bg | Use |
|---|---|---|---|
| neutral | `#4E5C56` | `#F1F3F2` | draft, archived, info-less |
| info | `#1E4E8C` | `#EAF2FB` | upcoming, scheduled |
| success | `#1F6B45` | `#E8F4EC` | done, published, active |
| warning | `#7A5A0B` | `#FDF5DC` | needs attention, pending |
| critical | `#9A2B1F` | `#FBEAE6` | failed, overdue, blocking |
| live | `#9A2B1F` + pulsing dot | `#FBEAE6` | live exam only |

The existing pastel `--pd-pastel-*` tokens map onto these (sky→info, mint→success, yellow→warning, blush→critical, lavender→**retired** in panel to avoid confusion with Deneme Ligi purple).

Dark mode: out of scope for this roadmap (the panel has no dark mode today; `[data-theme=dark]` rules target public `.pd-*`). Define tokens so a later dark map is a single block.

### 5.3 Typography

Font: keep **Manrope** (brand), JetBrains Mono for codes/timers/nets. Scale (desktop / mobile):

| Role | Size / line / weight | Tracking | Replaces |
|---|---|---|---|
| Page title | 24/32/700 · mobile 20/28 | -0.015em | 26–36px 800 headings, `clamp()` heroes |
| Section title (h2) | 15/22/650 | -0.005em | `text-sm font-extrabold` + uppercase labels |
| Sub-section (h3) | 13.5/20/650 | 0 | ad-hoc `text-sm font-bold` |
| Property label | 12.5/18/500 muted | 0 | `MetaItem` uppercase 11px labels |
| Body | 14/22/400 | 0 | 14.5/15px body |
| Secondary | 13/20/400 secondary | 0 | |
| Metadata | 12/16/500 muted | 0 | `text-[12.5px] text-dc-ink-faint` |
| Caption / table header | 11.5/16/600 muted | 0.01em, **no uppercase** | `uppercase tracking-[.08em]` eyebrows (73 files) |
| Numeric (nets, timer) | tabular-nums Mono 13–20 | 0 | `font-black` numbers |

Rules: no uppercase eyebrows inside the panel (except exam family codes like `TYT` rendered as a badge); `font-black`/`extrabold` reserved for the exam timer only; one `<h1>` per page owned by `PageHeader`.

### 5.4 Spacing, radius, borders, elevation

* 4px base grid. Page gutter 32px desktop / 16px mobile. Content max widths: **document pages 760px**, **workspace homes 960px**, **tables/ops full width** (min 1040, fluid).
* Section spacing 32px; between header and first section 24px; row padding by density (§5.7).
* Radius: controls/badges 6px, drawers/dialogs/cards 10px, avatar full. Retire 14px (`PanelCard`), 22px (`--dc-radius-card`), `rounded-2xl` (56 files) inside the panel.
* Borders: 1px `--pn-border`; sections separated by a top rule, not boxed.
* Elevation: none for in-flow content. Only popovers/menus (`0 4px 16px rgba(20,32,28,.08)`), drawers (`-8px 0 24px rgba(20,32,28,.08)`), dialogs.

### 5.5 States

| State | Treatment |
|---|---|
| Hover | `--pn-hover` background on rows/nav; no scale/lift |
| Active/selected | `--pn-selected` bg + 2px accent bar on the left (nav) or checkbox (rows) |
| Focus | 2px `--pn-focus` outline, 2px offset, never removed |
| Disabled | 45% opacity text, `not-allowed`, with a tooltip/explanation when the reason is permission or state |
| Loading | skeleton rows with shimmer disabled under reduced motion |
| Read-only (closed exam session, released result) | lock icon + muted surface + no input affordances |

### 5.6 Status vocabulary (single source)

Create `lib/panel/status-vocabulary.ts` (FRONTEND): `statusPresentation(domain, value) → { label, tone }`. Absorbs `lib/odk/presentation.ts#examStatusPresentation`, `OdkStatusBadge`, `STUDENT_360_*_LABELS`, the inline `changeRequestCategory` ternaries in `teacher-plan-review.tsx`, and every place that prints a raw enum (§19.4).

| Domain | Values → label (tone) |
|---|---|
| Lesson | upcoming → Yaklaşan (info) · live → Şimdi (live) · completed → Tamamlandı (success) · cancelled → İptal (neutral) |
| Assignment | assigned → Bekliyor (neutral) · submitted → Teslim edildi (info) · reviewed → Değerlendirildi (success) · overdue → Gecikti (critical) |
| WeeklyPlan | DRAFT → Taslak (neutral) · CHANGE_REQUESTED → Değişiklik istendi (warning) · APPROVED → Yayında (success) · ARCHIVED → Arşiv (neutral) |
| WeeklyPlanTask | PLANNED → Planlandı · IN_PROGRESS → Devam ediyor (info) · DONE → Tamamlandı (success) · PARTIAL → Kısmen (warning) · COULD_NOT → Yapılamadı (critical) · SKIPPED → Atlandı (neutral) |
| CoachingSession | PLANNED → Planlandı (info) · COMPLETED → Yapıldı (success) · MISSED → Kaçırıldı (critical) · CANCELLED → İptal (neutral) · reschedule requested → Yeni saat önerildi (warning) |
| OdkExam (staff) | DRAFT Taslak · READY Hazır · SCHEDULED Planlandı · LIVE Canlı · ENDED Bitti · SCORED Puanlandı · RELEASED Yayınlandı · ARCHIVED Arşiv |
| OdkExam (student) | Yaklaşan · Başlayabilirsin · Devam ediyor · Teslim edildi · Sonuç bekleniyor · Sonuç açıklandı · Kaçırıldı |
| OdkAttempt | IN_PROGRESS Devam ediyor · SUBMITTED Teslim · AUTO_SUBMITTED Süre doldu · REVIEW_REQUIRED İnceleme gerekli · VOID Geçersiz |
| User | ACTIVE Aktif · SUSPENDED Askıda · ARCHIVED Arşiv · invite pending Davet bekliyor · password pending İlk giriş bekliyor |
| Membership provenance | PURCHASED Satın alındı · MANUAL Manuel erişim · PILOT Pilot · expired Süresi doldu |

### 5.7 Density levels

| Level | Row height | Font | Used by |
|---|---|---|---|
| Comfortable | 48px | 14 | Student, Parent |
| Standard | 40px | 13.5 | Teacher, Coach |
| Compact | 36px | 13 | Admin, DL staff lists |
| Dense | 32px | 12.5, tabular | Live operations, integrity, results tables |

Implemented as `data-density` on the content wrapper; primitives read `--pn-row-h`.

### 5.8 Motion

Allowed: drawer slide 160ms ease-out, menu/popover fade+2px translate 120ms, accordion height 150ms, status change crossfade 120ms. Removed: page entrance animations, hover lift/scale, `panel-celebration` confetti-style animation (`globals.css:2095` — keep only under an explicit student "completed week" moment, and never under reduced motion). All motion off under `prefers-reduced-motion` and the in-app reduced-motion preference.

### 5.9 Charts

Keep charts hand-rolled SVG (no chart dependency exists today; do not add one). Allowed charts: Deneme net trend (sparkline + small line), plan adherence (12-week bar strip), participation distribution (staff reports), coach load bar. Every chart has a text summary sentence above it (existing pattern: `trendCaption` in `ogrenci/page.tsx`) and an accessible table fallback.

---

## 6. Global Shell

### 6.1 Target layout

```text
┌──────────────┬───────────────────────────────────────────────────────────────┐
│ [▣ Yön ▾]    │ Yön Koçluk / Planım / Bu hafta            ⌘K  🔔  ⋯          │ ← 48px context bar
│  Taha Berk   │───────────────────────────────────────────────────────────────│
│              │                                                               │
│ 🔍 Ara    ⌘K │  Bu hafta                                    [+ Görev ekle]   │ ← PageHeader (in content)
│ 🔔 Bildirim 3│  14 görev · 9 tamamlandı · Cuma koç görüşmesi                 │
│              │  [Liste] [Hafta]                                             │
│ ● Bugün      │  ───────────────────────────────────────────────────────────  │
│   Planım     │                                                               │
│   Hedefler   │  Page content (sections, tables, property rows)              │
│   Koçum      │                                                               │
│   Check-in   │                                                               │
│              │                                                               │
│ ─────────    │                                                               │
│ Dino'ya sor  │                                                               │
│ Ayarlar      │                                                               │
│ (TB) Taha  ⋯ │                                                               │
└──────────────┴───────────────────────────────────────────────────────────────┘
  240px, #F7F8F7     canvas #FFF, content max-width per page type
  collapsible → 56px
```

### 6.2 Sidebar

* **Width** 240px; collapsible to a 56px icon rail (state in a cookie so RSC can render it without flash; `localStorage` fallback). Hidden below 1024px (drawer).
* **Top: workspace switcher** (replaces the bottom `"<product> · Panel değiştir"` link and the separate `İşletme paneline geç` link):
  * Button shows product logo mark (16px), product name (`onlinedershanem.` / `Yön Koçluk` / `Deneme Ligi` / `İşletme`) and the user's name below in muted text.
  * Menu lists: accessible product workspaces (from the same `loadProductPanelStates` used by `/panel/urun-sec`, ACTIVE only; PILOT_CLOSED shown disabled with reason), business workspace if `getBusinessAccess` returns units, "Tüm çalışma alanları" → `/panel/urun-sec`. Selection posts to `/api/panel/active-product` exactly like `ProductPanelCard` and navigates to `resolveProductEntryPath`. `EXISTING`
  * During admin View-As, the switcher is replaced by the preview identity chip; switching is disabled (matches today's `!preview` conditions).
* **Global block** (all personas): Ara (⌘K) · Bildirimler (unread count, replacing the topbar dot) · for staff also "Gelen kutusu"/"Bugün" depending on workspace.
* **Product-local block**: 5–8 items (§7). Nested children via disclosure (one level only), e.g. "Kişiler & Erişim ▸ Öğrenciler / Veliler / Öğretmenler / Koçlar / Personel".
* **Bottom block**: Dino'ya sor (if `dinoAi` and persona has Dino), Ayarlar (opens account hub; contains Bildirim tercihleri, Erişilebilirlik, Veri kullanımı, Güvenlik, Oturumlar, Parola — removing these four items from every menu), account row (avatar, name, `⋯` menu: Profil & hesap, Güvenlik, Oturumlar, Çıkış). Admin-only `⋯` items: "Öğretmen modu", "Kullanıcı olarak görüntüle" (moved out of the topbar).
* Active item: neutral `--pn-selected` bg + 2px `--pn-accent` left bar + accent icon colour.

### 6.3 Context bar (replaces the 64px topbar)

48px, white, bottom border. Left: mobile menu button (<1024) + **breadcrumb** (`Workspace / Section / Object`), truncating middle segments. Right: ⌘K trigger (icon on mobile), notifications (mobile only — desktop has it in the sidebar), page `⋯` overflow when the page provides one. The parent **child switcher** (`topbarSlot` today) moves into the PageHeader of parent pages as a property-style selector ("Öğrenci: Ayşe ▾"), so it no longer competes with the breadcrumb.

Breadcrumb data: each page passes `breadcrumb={[{label, href}]}` to `PanelShell` (new optional prop; default derives from nav item match). `FRONTEND`

### 6.4 Banners

Order (top of content, full width, 40px, dismissible where allowed): admin View-As banner → admin teacher-mode banner → offline/sync status → account completion. Restyle to neutral bar with a coloured left marker (warning/info), not tinted full-width blocks.

### 6.5 Mobile (<1024)

* Drawer from the left with the exact sidebar content (single source; `PanelMobileNav` already reuses `panelNavSections`).
* Sticky 48px context bar; page title in content (not duplicated in the bar) but the bar shows the last breadcrumb segment once the title scrolls out (IntersectionObserver, client island).
* Bottom tab bar **only for student and parent** (4 items + "Menü"), derived from the workspace's first 4 primary items, not heuristics. Staff get no bottom bar (their work is list/detail; the bar steals 64px). Page-level **sticky bottom action** (e.g. "Denemeyi Başlat", "Check-in gönder", "Kaydet") replaces it where useful.

### 6.6 Shell behaviours that must survive (regression list)

Skip link; `PanelFeatureProvider`; `OfflineSyncProvider` (scope, available, enabled, lowDataMode); `AccessibilityPreferenceApplier`; unread count (never for previewed subject); sessions link; account link per role; product switch (hidden during preview, business workspace); business workspace switch derived from real assignment; View-As picker + banner; teacher-mode switch + banner; ⌘K for ADMIN/TEACHER; `AccountCompletionBanner` (not in preview / business); logout; `homeHref` resolution incl. staff ODK home; nav scope resolution; `staffOdkPermissions` in enforce; `mobileQuickItems` for İşletme; `noStore()` in preview/teacher mode.

---

## 7. Navigation by Persona (final)

Notation: `→` route (existing unless marked **new**). Global block (Ara, Bildirimler) and bottom block (Dino, Ayarlar, account) are omitted from each list. Items still respect feature flags and product access; nothing below grants access.

### 7.1 Student

| Workspace | Primary items |
|---|---|
| **onlinedershanem.** | Bugün → `/panel/ogrenci` (OD-scoped rendering) · Dersler → `/panel/ogrenci/takvim` · Çalışmalar → `/panel/ogrenci/odevler` · Kaynaklar → `/panel/ogrenci/materyaller` · Tekrar & telafi → `/panel/ogrenci/tekrar` (tabs: Tekrar / Telafi `/panel/ogrenci/telafi`) · Gidişatım → `/panel/ogrenci/analiz` (child: Dış denemelerim `/panel/ogrenci/denemeler`) |
| **Yön Koçluk** | Bugün → **new** `/panel/ogrenci/yon` · Planım → `/panel/ogrenci/plan` · Hedeflerim → `/panel/ogrenci/hedefler` · Koçum → `/panel/ogrenci/kocluk` · Check-in → `/panel/ogrenci/check-in` · Haftalık özet → `/panel/ogrenci/haftalik` (restores nav entry) |
| **Deneme Ligi** | Bugün → `/panel/odk/ogrenci` · Denemelerim → `/panel/odk/ogrenci/denemeler` · Sonuçlarım → `/panel/odk/ogrenci/denemeler?durum=sonuc` (filter view, same route) · Gelişimim → `/panel/odk/ogrenci?bolum=gelisim` anchor (or a later dedicated route) |

Mobile bottom bar = first four items of the active workspace.

### 7.2 Parent

| Workspace | Primary items |
|---|---|
| **onlinedershanem.** | Genel bakış → `/panel/veli` · Dersler → `/panel/veli/takvim` · Ödevler → `/panel/veli/odevler` · Öğretmenler → `/panel/veli/ogretmenler` · Akademik gelişim → `/panel/veli/analiz` · Haftalık özet → `/panel/veli/haftalik` |
| **Yön Koçluk** | Genel bakış → **new** `/panel/veli/yon` (or `/panel/veli/kocluk` promoted, see §10.4) · Bu hafta → `/panel/veli/kocluk#hafta` · Koç notları → `/panel/veli/kocluk#notlar` |
| **Deneme Ligi** | Genel bakış → `/panel/odk/veli` · Raporlar → `/panel/odk/veli/raporlar` |
| Bottom | Hesap ve paket → `/panel/veli/hesap` (moved to bottom block next to Ayarlar) |

### 7.3 Teacher (OD)

Bugün → `/panel/ogretmen` · Dersler → `/panel/ogretmen/takvim` · Çalışmalar → `/panel/ogretmen/odevler` · Öğrenciler → `/panel/ogretmen/gruplar` · Takip ▸ (Tekrar `/tekrar`, Telafi `/telafi`, Analiz `/analiz`, Dış denemeler `/denemeler`) · Kaynaklar → `/panel/ogretmen/materyaller` (child: AI yardımcı `/ai-yardimci`)

### 7.4 Coach (TEACHER with COACH@OK, Yön workspace)

Bugün → **new** `/panel/ogretmen/yon` (coach workspace home) · Öğrencilerim → **new** `/panel/ogretmen/yon/ogrenciler` (table) · Planlar → `/panel/ogretmen/plan` (desk, restyled) · Görüşmeler → **new** `/panel/ogretmen/yon/gorusmeler` (list of `CoachingSession`) · Yardım istekleri → `/panel/ogretmen/yardim` · Haftalık özetler → `/panel/ogretmen/ozetler` · Müdahaleler → `/panel/ogretmen/mudahale`

Coach student workspace: `/panel/ogretmen/hazirlik/[id]` evolves in place (label "Öğrenci çalışma alanı"); no URL change required (see §10.3).

### 7.5 Deneme Ligi staff (built from permissions — `staffOdkNavItems` extended)

| Role mix | Primary items |
|---|---|
| EXAM_EDITOR | Bugün → `/panel/odk/yonetim` · Denemeler → `/panel/odk/yonetim/sinavlar` (default view "Hazırlıkta") |
| EXAM_OPERATOR | Bugün · Denemeler (view "Planlanan / Canlı") · Canlı operasyon → `/panel/odk/yonetim/operasyon` |
| RESULT_PUBLISHER | Bugün · Puanlama ve yayın → `/panel/odk/yonetim/sonuclar` · Sonuç raporları → `/panel/odk/yonetim/raporlar` |
| REPORT_VIEWER | Öğrenci raporları → `/panel/odk/ogretmen/raporlar` (single item; lands directly) |
| PRODUCT_MANAGER | Bugün · Denemeler · Paketler → `/panel/odk/yonetim/paketler` · Sonuç raporları |

Rule: "Bugün" (staff home) appears only when ≥2 work modules (current `resolveOdkStaffHome` rule). `PHASE-1`

### 7.6 Admin

Admin keeps every workspace; the sidebar shows the **selected workspace's** admin items plus a shared admin block. Target per workspace:

| Workspace | Primary items |
|---|---|
| **Operasyon (default admin landing, cross-product)** | Gelen kutusu → `/panel/yonetim` (Operations Inbox) · Kişiler & Erişim → `/panel/yonetim/kisiler` (children: Öğrenciler, Veliler, Öğretmenler, Koçlar, Personel, Yeni kayıtlar `/basvurular`) · Siparişler → `/panel/yonetim/siparisler` · Aktivasyon → `/panel/yonetim/isler` · Müdahaleler → `/panel/yonetim/mudahale` · Sistem ▸ (Analitik, Raporlar, İşlem geçmişi `/kayitlar`, Özellikler, Kontrollü yayın `/pilot` + `/odk/yonetim/pilot`, Kalite `/kalite`) |
| **onlinedershanem.** | Eğitim → `/panel/yonetim/egitim` (Gruplar, Ders planlama, Ödevler, Materyaller) · Takvim → `/panel/yonetim/takvim` · Kazanımlar → `/panel/yonetim/kazanimlar` · Dış deneme analizi → `/panel/yonetim/denemeler` |
| **Yön Koçluk** | Koçluk operasyonu → `/panel/yonetim/kocluk` (queues + coach directory) |
| **Deneme Ligi** | Bugün → `/panel/odk/yonetim` · Denemeler · Canlı operasyon · Puanlama ve yayın (**restored** `/sonuclar`) · Raporlar · Paketler |

That yields ≤8 primary items in each admin workspace, with Operasyon's shared block always reachable from the workspace switcher ("Operasyon" entry for ADMIN only). `FRONTEND` (+ `PHASE-2` for the "Operasyon" pseudo-workspace if backend wants `activeProduct` to carry it; otherwise store it as a nav scope `null`).

### 7.7 Navigation data changes

* `lib/panel/navigation.ts`: replace section arrays with a `WorkspaceNav = { primary: Item[]; children?: Record<id, Item[]> }` per (role, scope). Keep `NAV_ITEM_SCOPE` semantics; keep `staffOdkNavItems`; add Yön coach items gated by `ok:coaching:write` (via `effectiveStaffPermissions`, `PHASE-1`). Remove common items from menus (moved to Ayarlar hub).
* Keep `panelNavHrefs()` contract for dead-link tests; extend tests to assert ≤8 primary items per workspace and that every orphan route in §19 has an entry point.

---

## 8. Shared Interaction Patterns

### 8.1 Page types and their header

`PageHeader` (new, RSC): `breadcrumb?`, `title`, `description?`, `properties?` (inline property chips), `primaryAction?`, `secondaryActions?`, `overflow?`, `tabs?` (link tabs driven by `searchParams`, like `student360TabHref`), `meta?`.

| Page type | Structure | Examples |
|---|---|---|
| Workspace home | title = greeting or workspace question; description = one-sentence state; sections: Şimdi / Dikkat / Bu hafta / Son | student Bugün, coach Bugün, DL staff Bugün, admin Gelen kutusu |
| List (database) | title + count; primary "Yeni …"; view tabs (saved filters); toolbar (search, filters, column menu); table | Kişiler, Denemeler, Siparişler, Öğrencilerim |
| Detail (object) | back breadcrumb; title; status badge; property block; tabs; body | Student 360, user detail, exam workspace, order, group |
| Operational queue | title + counts by severity; grouped rows with inline actions | Ops inbox, coach Needs attention, help requests, interventions |
| Editor | title (editable where relevant), readiness checklist in right rail, sticky save bar | exam content, plan desk, lesson workspace |
| Report | title + period selector; summary sentence; table first, chart second | result page, analytics, audience reports |
| Settings | two-column: section nav left, forms right | `/panel/ayarlar/*`, Ayarlar hub |

### 8.2 Tables (database experience)

Build **one** server-first table primitive, not a data-grid library:

* `EntityTable` (RSC shell) — semantic `<table>`, sticky header, density from context, row link (whole row clickable via a primary cell link, not `onClick`), column definitions with `hideBelow` breakpoints.
* `TableToolbar` (client island) — search input (debounced, writes `?q=`), filter chips (`?durum=`, `?urun=`, `?rol=` … as today), column visibility menu (cookie-persisted), view tabs.
* `RowSelection` (client island) — only where bulk actions exist today (`user-bulk-operations.tsx`: users) or are planned (assignments, exam assignment).
* Sorting/paging stay **server-side via searchParams** (pattern already in `kullanicilar`, `ogrenciler`, `veliler`, `siparisler`). Pagination component unified.
* **Saved views**: implement as named presets of searchParams defined in code per table (e.g. Denemeler: Hazırlıkta / Planlanan / Canlı / Puanlama bekliyor / Yayınlandı). No user-defined saved views in v1 (no backend). `FRONTEND`
* Mobile: tables keep horizontal scroll with a sticky first column **for operational data** (staff); for student/parent lists use stacked rows (`PanelTable`'s card mode kept only there).

Pages that become tables: Kişiler (all views), Öğrenciler, Veliler, Öğretmenler, Koçlar (new view), Personel (new view), Yeni kayıtlar, Siparişler, Aktivasyon jobs, Audit log, Denemeler (staff), Puanlama ve yayın, Canlı operasyon attempts, Integrity review, Exam assignments, Exam results, Paketler, Coach "Öğrencilerim", admin coach directory, teacher roster (Öğrencilerim/gruplar), teacher assignment list, Deneme list (student: compact table on desktop), result subjects, result questions, lesson list (student Dersler).

### 8.3 Cards — where they remain

Only for: (a) the single **"Şimdi" next-action** block on homes; (b) **objects shown as a set** where the object has an image/identity (coach identity card, product membership objects in Access, package objects, Deneme "next exam" block); (c) **readiness/attention groups** in editor right rails. Everything else becomes sections, rows, properties or tables.

### 8.4 Drawers (side peek) vs full page

Drawer component: right side, 480px (720px "wide" variant), URL-addressable via `?onizle=<type>:<id>` so back button closes it and links are shareable; focus-trapped; Escape closes; never opens a modal on top (P: no modal-in-modal — destructive confirmations inside a drawer use an inline confirm step).

| Use a drawer | Use a full page |
|---|---|
| Student quick preview from any table (summary properties, products, next session, last exam, "Öğrenci 360'ı aç") | Student 360 |
| User quick info in Kişiler | User detail (Access Center, security, history) |
| Coach assignment / transfer (from Yön ops queue rows) | Coach directory |
| Plan task detail & edit (student and coach) | Weekly plan |
| Coach note create/edit, session record | Coach student workspace |
| Exam preview (from lists, ops) | Exam workspace |
| Attempt detail / integrity review | Live operations console |
| Order quick view (payment, provisioning status, retry) | Order detail (`/siparisler/[id]`) |
| Help request reply | Help request inbox |
| Product access grant/revoke, staff responsibility grant (from user detail) | — |

### 8.5 Dialogs

Create small object (group, series, manual access grant), confirm destructive (archive user, revoke access, release results, rescore, void attempt), step-up MFA prompts (existing step-up flows), submit exam confirmation. Dialog copy always states consequence and reversibility ("Sonuçlar 312 öğrenciye açılacak. Geri alınamaz.").

### 8.6 Forms

* Property-style forms on detail pages (label left 160px, control right) for profile/settings; stacked labels on mobile.
* Inline edit for single properties (status, due date, priority) with optimistic update only where the API returns the new version (plan tasks use `version`; exam answers use revisions).
* Server actions keep `useActionState` patterns already used in `/panel/ayarlar`.
* Error summary at top + field errors; never toast-only for validation.

### 8.7 Search and command palette

**Keep and extend `AdminCommandSearch` → rename `CommandMenu`** (`components/panel/command-menu.tsx`), mounted for all personas.

| Persona | Commands | Entity search |
|---|---|---|
| Student | navigate to any item in own workspaces; switch workspace; "Check-in yap", "Planıma görev ekle" (Yön), "Denemeyi aç" | own lessons, assignments, materials, plan tasks, Deneme exams (**new** server search scoped by `session.userId` — `EXISTING` data) |
| Parent | navigate; switch child; switch workspace | none in v1 |
| Teacher/Coach | navigate; "Ders planla", "Ödev oluştur", "Öğrenci 360 aç…" | students in own groups/coach assignments, groups, lessons (existing `runGlobalSearch` scopes) |
| DL staff | "Yeni deneme", "Canlı operasyonu aç", "Puanlama bekleyenler", exam search | exams (existing EXAM kind) |
| Admin | all above + create student/group, orders, users, leads (if business permission) | all existing kinds |

Command filtering must move from `roles: […]` to a predicate `(viewer) => boolean` that can read staff permissions (`effectiveStaffPermissions`) and product access. `PHASE-1`. Results display translated statuses (fix `TYT · SCORED`). The palette is never the only path: every command target is in the sidebar or a page.

### 8.8 Empty, loading, error

`EmptyState` (new; replaces `PanelEmpty` mt-5 card): icon (16px, muted) + one-line title + one-line guidance + optional single action, rendered inline in the section (no card). Copy rules: say what will appear and when, in the persona's voice. Examples:

* Student DL: "Henüz planlanmış bir Deneme Ligi sınavın yok. Yeni deneme açıldığında burada görünecek."
* Coach: "Bu hafta onay bekleyen plan yok."
* DL publisher: "Bu hafta yayınlanmayı bekleyen sınav yok."
* Admin inbox: "Şu an aksiyon gerektiren bir şey yok. Son kontrol 09:42."

`loading.tsx` per workspace segment (today only `/panel` and `/panel/yonetim` + `isletme/[section]`) with skeletons matching the page type. `error.tsx` per segment with retry (`reset()`), a human summary and a support code. Optimistic UI only for: plan task complete/reschedule (versioned), exam answer save (already revision-based), notification read. Admin mutations stay pessimistic with inline pending state.

---

## 9. OD Target Experience (Öğren)

### 9.1 Student — Bugün (`/panel/ogrenci`, OD scope)

* **Current:** cross-product home: greeting H1, warning-tinted "Şimdi" card, "Sonra" card list, "Bugünün tamamı" (8 items), "Bu hafta" card with 3 KPI tiles, weekly plan card + latest Deneme card + net trend card. Same page regardless of `activeProduct`.
* **Problems:** three overlapping lists (Şimdi/Sonra/Bugünün tamamı); KPI tiles with low information ("Yaklaşan deneme: 1"); warning tone for a normal next action; cross-product cards dominate the OD workspace; legacy "onlinedenemekulübüm." copy (`ogrenci/page.tsx:367`).
* **Keep:** `buildStudentHomeActionPlan` (now/next actions, reason codes), product event tracking (`student_next_action_viewed/clicked`), `CompleteHomeAction`, Dino explanation of the reason, OD start card, NoProductAccess, unified-today feed, plan/exam/trend data.
* **Target / Structure (OD scope):**
  1. `PageHeader`: "Günaydın, Taha." · description "Bugün 2 ders, 1 ödev teslimi."
  2. **Şimdi** — single neutral card: action title, reason (muted), one CTA (+ "Tamamlandı" for plan tasks), "Neden?" Dino link.
  3. **Bugün** — one list merging today's lessons, due assignments, review items, recovery items (from `unifiedToday` filtered to OD + `nextActions` deduped). Each row: time · title · product dot · status badge · action.
  4. **Bu hafta** — compact property strip: "Dersler 3/5 · Ödevler 2/4 teslim · Tekrar 6 bekliyor" (text, not tiles).
  5. **Diğer çalışma alanların** — one row per other entitled product: "Yön: 4 görev kaldı → Planım", "Deneme Ligi: TYT-3 Cumartesi 10:00 → Aç". Only entitled products (P6/§52).
  6. **Akademik gidişat** — 2-line insight + link to Gidişatım; net sparkline only if ODK entitled.
* **Primary action:** the Şimdi CTA. **Secondary:** "Takvime ekle (.ics)" in overflow.
* **Data:** `EXISTING` (`getStudentHomeData`, `buildStudentHomeActionPlan`); scope-aware filtering is `FRONTEND` reading `session.activeProduct` (presentation only).
* **Mobile:** Şimdi pinned first; Bugün list full width; bottom bar.
* **Risk:** Medium (home is the most-used page; event tracking must keep identical names/properties).

### 9.2 Student — Dersler (`/takvim`) and Ders detayı (`/takvim/[id]`)

* **Keep:** upcoming/completed filter, `.ics` export, join/open CTAs, lesson detail sections (teacher note, given work, next goal), recovery link.
* **Target:** list page with view tabs "Yaklaşan / Tamamlanan" (existing `?durum=`), rows: date-time · subject · teacher · status · action ("Derse katıl" only within join window). Detail = document page: title "Matematik — Türev", properties (Tarih, Öğretmen, Grup, Durum, Katılım), sections "Öğretmen notu", "Verilen çalışma" (rows linking to Çalışmalar), "Sonraki hedef", "Telafi" if missed.
* **Data:** `EXISTING`. **Mobile:** stacked rows; sticky "Derse katıl" when live. **Risk:** Low.

### 9.3 Student — Çalışmalar (`/odevler`)

* **Keep:** `StudentAssignmentList` submission flow, evidence/rubric (flag `assignmentEvidence`).
* **Target:** list with tabs "Bekleyen / Teslim edilen / Değerlendirilen"; row → drawer with assignment detail + submission form (current inline form moves into the drawer). Yön plan tasks are **not** mixed here (they live in Planım), but a plan task generated from an assignment shows a "Planında" property.
* **Data:** `EXISTING`. **Risk:** Medium (submission upload inside a drawer: test file upload + offline queue).

### 9.4 Student — Kaynaklar, Tekrar & telafi, Gidişatım, Dış denemelerim

* **Kaynaklar:** table (title, subject, lesson, type, date, download). Restyle from legacy tokens. `EXISTING`, Low.
* **Tekrar & telafi:** one page with tabs (two existing routes kept; tab links between them). Review queue rows with respond/defer inline; recovery packages as checklist objects. `EXISTING`, Low-Medium.
* **Gidişatım (`/analiz`):** report pattern: summary sentence, "Akademik" table by subject (trend arrows), "Çalışma davranışı" property rows, weekly goal property with inline edit (existing API). External mock exams become child page "Dış denemelerim" (`/ogrenci/denemeler`, label clarifies "okul/yayınevi denemeleri"). `EXISTING`, Low.

### 9.5 Teacher (OD)

| Page | Target | Data | Risk |
|---|---|---|---|
| Bugün `/panel/ogretmen` | Workspace home: **Şimdi** (next lesson with "Ders alanını aç"), **Dikkat** (`buildTeacherAttentionInbox` rows grouped P0/P1/P2 with inline CTA), **Bugünün dersleri** (table), **Bekleyen işler** (assignment reviews, lesson closes). `CoachAttention` moves to the Yön coach home; on the OD home it is replaced by a one-line cross-workspace signal ("Yön: 2 plan onay bekliyor → Koç masası") only for coaches. | `EXISTING` | Medium |
| Dersler `/takvim` | Week view (existing) + list toggle; lesson row → `/ders/[id]`. | `EXISTING` | Low |
| Ders alanı `/ders/[id]` | Editor/document: header properties (grup, saat, durum), tabs "Hazırlık / Ders / Kapanış"; attendance as table; notes; assignment creation as drawer; templates as menu. Convert read-only parts to RSC, keep forms as islands. | `EXISTING` | **High** (1014-line client component, quick-close flow) |
| Çalışmalar `/odevler` | Table: ödev · grup · teslim tarihi · teslim oranı · bekleyen değerlendirme; row → detail drawer with submissions table + review drawer. | `EXISTING` | Medium |
| Öğrenciler `/gruplar` | Database table: öğrenci · grup · katılım · ödev · son deneme · risk; views "Tümü / Riskli" (`?filtre=risky`); row → Student 360; hover preview drawer. | `EXISTING` | Low |
| Takip ▸ Tekrar, Telafi, Analiz, Dış denemeler | Same pages restyled to list/report patterns. | `EXISTING` | Low |
| Kaynaklar `/materyaller` + AI yardımcı | Table + upload dialog; AI drafts list with review drawer. | `EXISTING` | Low |

### 9.6 Admin (OD workspace)

* **Eğitim `/yonetim/egitim`:** split the 384-line page into tabs: Gruplar (table → Group 360) · Ders planlama (lesson series form with preview/conflicts) · Ödevler (`TeacherAssignmentManager`) · Materyaller · Kurulum sihirbazı (only while setup incomplete). `EXISTING`. Risk Medium.
* **Grup 360 `/yonetim/gruplar/[id]`:** detail pattern: properties (öğretmen, kapasite, seviye, ürün), tabs Öğrenciler / Dersler / Ödevler / Gidişat / Geçmiş. Convert 1094-line client view to RSC + islands for membership edits. Risk **High**.
* **Takvim, Kazanımlar, Dış deneme analizi:** restyle; Kazanımlar keeps version workflow.

### 9.7 Parent (OD)

Genel bakış keeps `ParentCalmHome` structure (already calm) but drops cards for sections: "Dikkat edilmesi gereken" (only when present), "Bu hafta" property rows, "Akademik gelişim" sentence + subject table, product signal rows for Yön/DL. Dersler/Ödevler/Öğretmenler become read-only tables. Child selector moves into the PageHeader property row. `EXISTING`. Risk Low.

---

## 10. Yön Target Experience (Planla)

### 10.1 Student — Yön Bugün (**new** `/panel/ogrenci/yon`)

* **Current:** none; closest is `/panel/ogrenci/kocluk` (coach card, sessions, Yapılacaklar, goal summary, quick links) and the shared home.
* **Target question:** "Bugün ne yapmalıyım?"
* **Structure:**
  1. `PageHeader` "Bugün" · description "4 görev · ~2 sa 10 dk · Perşembe 19:00 koç görüşmesi".
  2. **Bugünün planı** — checklist rows from the current approved plan (`WeeklyPlanTask` where `scheduledFor` = today or FLEXIBLE due this week): checkbox (complete), title, subject · topic, target ("40 soru" / "30 dk"), priority marker for HIGH/URGENT. Row click → task drawer (actual questions/correct/wrong/blank, minutes, difficulty, energy, student note — all existing fields).
  3. **Öncelikli gecikenler** — overdue PLANNED/PARTIAL tasks (max 3) with "Bugüne taşı" (reschedule API exists for coach — student reschedule is `YON` if not allowed today; otherwise show "Koçuna bildir").
  4. **Sıradaki görüşme** — property row: date, coach, meeting link (`CoachingSession.meetingUrl`), "Yeni saat iste" (existing reschedule request).
  5. **Bu hafta** — progress line "9/14 görev · 6 sa 40 dk / 10 sa" + 7-day mini strip.
  6. **Koçundan son not** — latest `STUDENT_VISIBLE`/`PARENT_VISIBLE` CoachNote or session `sharedNote` (never `privateNote`, never INTERNAL; enforce via `canViewerSeeCoachNote`).
  7. **Hedeflerim** — 2–3 property rows ("TYT Matematik 30 net · şu an 24").
  8. **Check-in** — state row: "Bu haftanın check-in'i bekliyor → Check-in yap" or "Gönderildi, Salı".
* **Primary action:** complete the next task (row checkbox); header primary "Planı aç".
* **Data:** `EXISTING` for tasks, sessions, notes, goals, check-ins. Plan exists only when `adaptivePlan` is on **or** coach-created plan exists — verify `WeeklyPlan` creation path without the flag (coach desk is flag-gated: `ogretmen/plan/page.tsx:23`). Turning `adaptivePlan` on in production is a product decision → `YON`.
* **Mobile:** checklist first, sticky "Check-in yap" when pending. **Risk:** Medium (new route + nav `today` rewrite for OK scope, mirroring the existing ODK rewrite in `applyScope`).

### 10.2 Student — Planım (`/panel/ogrenci/plan`)

* **Current:** `StudentAdaptivePlan` (883 lines): preference fields, generate, task cards, complete, request change; Dino explanation.
* **Problems:** card per task; preferences mixed with the plan; heavy client component.
* **Keep:** preferences (`/adaptive-plan/preferences`), generate (`/adaptive-plan/generate`), task complete (`/kocum/tasks/[id]/complete`), request change (`/adaptive-plan/[id]/request-change`), plan status & version handling, Dino explanation.
* **Target / Structure:**
  * Header: "Bu hafta" · status badge (Taslak / Değişiklik istendi / Yayında) · description "14 görev · 9 tamamlandı · tahmini 11 sa". Primary: "Değişiklik iste" (when APPROVED) or "Planı oluştur" (when none). Overflow: "Tercihlerim" (opens drawer with `PreferenceFields`).
  * View tabs **Liste | Hafta** (`?gorunum=`):
    * **Liste**: grouped by day (Pzt…Paz + "Esnek"), Notion-like rows:
      ```text
      Pazartesi · 14 Eki                                   3/4
      ☑ Matematik — Türev · 40 soru            45 dk   ● Yüksek
      ☐ Türkçe — Paragraf · 30 soru            30 dk
      ☐ TYT Fen tekrar                          40 dk
      ```
      Columns (desktop, hideable): Ders, Konu, Hedef, Süre, Öncelik, Durum, Zorluk, Enerji, Not.
    * **Hafta**: 7 columns, read-only for the student (drag/drop only for coach).
  * Task drawer: properties + "Gerçekleşen" form (questions/C/W/B, minutes, difficulty 1–5, energy 1–5, note) + status buttons (Tamamlandı / Kısmen / Yapamadım).
* **Data:** `EXISTING` (all fields in schema). Whether students may write actuals via current endpoint must be verified per field (`/kocum/tasks/[id]/complete` payload); extra fields → `YON`.
* **Mobile:** Liste only; day sections collapsible; drawer full-screen sheet. **Risk:** Medium-High (rewrite of a large client component; keep Storybook `student-adaptive-plan.stories.tsx` states).

### 10.3 Student — Hedeflerim, Koçum, Check-in

* **Hedeflerim (`/hedefler`)**: property list grouped "Sınav hedefi" (EXAM_TARGET, SCORE_TARGET), "Ders netleri" (SUBJECT_NET), "Haftalık" (WEEKLY_STUDY_MINUTES, WEEKLY_QUESTION_COUNT, PLAN_COMPLETION), "Odak" (SUBJECT_FOCUS):
  ```text
  YKS hedefi          SAY 25K            koçunla 2 Eyl'de belirlendi
  TYT Matematik       30 net             şu an 24 · ▲ 3
  Haftalık çalışma    18 sa              bu hafta 11 sa
  ```
  Read-only for students (goals are set by coach via `setStudentGoal`). "Current value" from latest DL/mock data is `EXISTING` (DL nets) / `FRONTEND` join. Risk Low.
* **Koçum (`/kocluk`)**: personal page: coach identity card (name, photo if any, short bio from coach profile `PATCH /users/[id]/coach-profile` data), Sıradaki görüşme (date, meeting link, "Yeni saat iste"), Ortak notlar (session `sharedNote` + visible CoachNotes, newest first), Yapılacaklar (action items = tasks with `sourceType=MANUAL_COACH` this week), Geçmiş görüşmeler (table). Remove duplicated "Hızlı erişim" and goal summary (now in Yön Bugün). `EXISTING`. Risk Low.
* **Check-in (`/check-in`)**: single-column form with sticky submit; copy "onlinekoçum." fallback group name fixed (`check-in/page.tsx:56`). `EXISTING`. Risk Low.

### 10.4 Parent — Yön

`/panel/veli/kocluk` becomes the parent Yön home (no new route needed; nav "Genel bakış" points here in OK scope): sections "Bu hafta" (plan completion %, sessions), "Koç" (identity + next session), "Koç notları" (PARENT_VISIBLE only + `WeeklyCoachSummary` published), "Hedefler" (read-only). Copy "Bu hesapta onlinekoçum. bulunmuyor." → "Bu hesapta Yön Koçluk bulunmuyor." `EXISTING`. Risk Low.

### 10.5 Coach — Workspace home (**new** `/panel/ogretmen/yon`)

* **Current:** `CoachAttention` block on the OD teacher home (overdue session / plan not approved), `/panel/ogretmen/plan` as entry for coach-only teachers.
* **Target question:** "Who needs my attention and what should happen next?"
* **Structure:**
  1. Header "Bugün" · description "3 görüşme · 5 öğrenci dikkat bekliyor".
  2. **Bugünkü görüşmeler** — table: saat · öğrenci · odak · son plan uyumu · [Hazırlık] (→ student workspace) · [Katıl] (meeting URL). Source `CoachingSession` via active `CoachAssignment`. `EXISTING`.
  3. **Dikkat bekleyenler** — queue grouped by reason, each row inline action:
     | Reason | Source | Status |
     |---|---|---|
     | Plan onay bekliyor | `WeeklyPlan` DRAFT/CHANGE_REQUESTED (requiresPlanApproval) | `EXISTING` |
     | Bu hafta planı yok | coach students without current plan | `EXISTING` |
     | Görüşme gecikti | `coachingOverdue` rule (`lib/panel/coaching.ts`) | `EXISTING` |
     | Check-in eksik | `StudentCheckIn` missing this week | `EXISTING` |
     | Yanıtsız yardım isteği | `StudentHelpRequest` open | `EXISTING` |
     | Düşük plan uyumu | `buildWeeklyKocumMetrics` < threshold | `EXISTING` (threshold = product decision) |
     | Deneme sonrası öneri bekliyor | `WeeklyPlanSuggestion` PENDING (created by `odk/coach-bridge.ts`) | `EXISTING` |
     | Yeni saat önerisi | `CoachingSession.rescheduleRequestedAt` | `EXISTING` |
  4. **Öğrencilerim** — compact database table (top 10, "Tümünü gör" → `/panel/ogretmen/yon/ogrenciler`): Öğrenci · Sınav (target exam) · Haftalık uyum (bar + %) · Son deneme (net, Δ) · Sonraki görüşme · Durum badge.
* **Primary action:** "Hazırlığa başla" for the next session. Secondary: "Plan masası".
* **Data:** all `EXISTING`; needs a server read-model `lib/kocum/coach-workspace-server.ts` (no schema). Entry routing change in `resolveProductEntryPath` (OK → new home) is `PHASE-1` (enforce) / `YON` (Phase 3 owner per Phase 1 PR notes).
* **Mobile:** sessions list then queue; table → stacked rows. **Risk:** Medium.

### 10.6 Coach — Student workspace (`/panel/ogretmen/hazirlik/[id]`, evolved)

* **Current:** last week plan card, lesson & exam signals, record session form, goals (with `setStudentGoal`), this week's plan.
* **Target:** document-style page with properties and tabs:
  ```text
  ← Öğrencilerim
  Taha Berk                                         [Görüşmeyi kaydet]
  12. sınıf · YKS SAY · Yön aktif · Veli: Ayşe B.      ⋯
  [Özet] [Plan] [Görüşmeler] [Notlar] [Deneme Ligi] [Yardım]
  ```
  * **Özet**: snapshot properties (hedef, bu hafta uyum, son check-in enerji/engel, son deneme net + Δ), "Sıradaki adım" suggestion, recent activity (visible-to-staff timeline).
  * **Plan**: this student's `CoachWeekCalendar` + `CoachDeskPanel` (moved here from the stacked desk page) + plan approval for this plan + pending suggestions for this student.
  * **Görüşmeler**: session history table; record session (drawer, existing server action `recordCoachingSession`) with **separate fields** "Öğrenciyle paylaşılan not" (`sharedNote`) and "Özel not (yalnız koç ve yönetim)" (`privateNote`).
  * **Notlar**: three clearly labelled lanes — **İç not** (INTERNAL, lock icon, gray), **Öğrenci görebilir** (STUDENT_VISIBLE, eye icon), **Veli görebilir** (PARENT_VISIBLE, family icon). Visibility selector defaults to İç not (as today) and the composer shows a preview line "Bu notu: Taha ve velisi görebilir". Private notes require `ok:note:read_private` (`PHASE-1`).
  * **Deneme Ligi**: latest result, net trend, weak outcomes, "Plan önerisi oluştur" (suggestion review exists).
  * **Yardım**: this student's help requests with reply.
* **Keep:** both server actions, goal setting form (moves to Özet "Hedefler" with drawer), all existing signals.
* **Data:** `EXISTING`. The current guard allows `od:lesson:teach` **or** `ok:coaching:write` — the Yön-write tabs must render read-only for OD-only teachers (server actions already enforce `assertAssignedCoach`). **Risk:** Medium-High (privacy: note lanes must be tested with student/parent viewers).

### 10.7 Coach — Planlar desk (`/panel/ogretmen/plan`)

Keep as a **batch approval desk**: table of this week's plans (öğrenci · durum · görev sayısı · kapasite · değişiklik nedeni · son güncelleme) with row → plan drawer (calendar + approve). Pending suggestions as a queue at top with Kabul/Reddet. Per-student desk tools move to the student workspace (§10.6) but remain reachable from the drawer. Raw `{item.kind}` → translated suggestion kind. Legacy tokens removed. `EXISTING`. Risk Medium.

### 10.8 Admin — Yön operations (`/panel/yonetim/kocluk`)

* **Current:** 3 counters, signals card, intervention table with inline assign/transfer form (coach select, cadence, override reason), coach load, recent sessions, students without goals.
* **Target structure:**
  1. Header "Koçluk operasyonu" · description "6 öğrenci koç bekliyor · 1 koç kapasite üstünde".
  2. **Kuyruklar** (view tabs with counts): Koç bekleyen (OK membership, no active assignment) · Kapasite üstü koçlar · Plan yayınlanmadı · Görüşme gecikti · Check-in eksik · Hedefi olmayan. Rows have inline "Koç ata" → **drawer** with coach picker showing capacity bars, cadence, override reason (required when over capacity — existing rule in `assignCoach`).
  3. **Koç dizini** — table: Koç · Öğrenci (n/kapasite bar) · Bugünkü görüşme · Gecikmiş görüşme · Plan onay bekleyen · Dikkat. Row → coach drawer (students list, capacity edit via coach profile).
* **Keep:** `assignCoach` server action and audit, capacity override reason, cadence, transfer, recent sessions (as coach drawer section), students without goals (queue).
* **Data:** `EXISTING` except "Check-in eksik" aggregation (data exists; query new) → `EXISTING`. **Risk:** Medium.

---

## 11. Deneme Ligi Target Experience (Ölç)

### 11.1 Student — Deneme Ligi Bugün (`/panel/odk/ogrenci`)

* **Current:** `OdkHome` STUDENT: eyebrow "ODK öğrenci", "Sıradaki matematik denemene hazırlan.", metric tiles, primary card.
* **Target structure (answers the 5 questions):**
  1. **Sıradaki deneme** (dominant object block): family badge (LGS/TYT/AYT), title, date-time, duration, state ("Cumartesi 10:00'da açılır" / "Şimdi başlayabilirsin" / "Devam ediyor — 42 dk kaldı"), primary CTA "Denemeye git" / "Devam et".
  2. **Son sonuçlar** — compact table (3 rows): deneme · tarih · net · Δ · "Sonuç".
  3. **Gelişimim** — summary sentence + net sparkline (own history only; no league/ranking visuals in v1).
  4. **Odak konular** — top 3 weak outcomes from latest released result with entitlement-aware actions (§11.5).
* **Data:** `EXISTING` (`listStudentExams`, result data). **Risk:** Low.

### 11.2 Student — Denemelerim (`/panel/odk/ogrenci/denemeler`)

* **Current:** four card sections (Devam eden, Başlayabileceğin, Yaklaşan, Sonuçlar); legacy brand copy (`:177`).
* **Target:** list with view tabs **Yaklaşan · Açık · Tamamlanan** (+ "Tümü"), desktop table columns: Deneme · Tür · Tarih · Durum · Süre · Sonuç · Aksiyon; states from §5.6 (Yaklaşan, Başlayabilirsin, Devam ediyor, Teslim edildi, Sonuç bekleniyor, Sonuç açıklandı, Kaçırıldı). In-progress exam pinned at top as a single attention row.
* **Data:** `EXISTING` ("Kaçırıldı" derivable from window end + no attempt). **Mobile:** stacked rows. **Risk:** Low.

### 11.3 Student — Exam detail / pre-start (`/denemeler/[id]`)

* **Keep:** rules, Meet link (`meetRequired/meetUrl`), start API, late-entry handling, attempt limit, existing pre-start checks in `StudentExamStart`.
* **Target structure:** title + family badge; property block: Soru sayısı · Oturumlar (DENEME for LGS) · Süre · Başlangıç–bitiş · Geç giriş · Deneme hakkı; "Kurallar" short list; **Hazırlık kontrolü** checklist (bağlantı ✓ online status, cihaz/ekran genişliği uyarısı <768px, Meet bağlantısı açıldı mı); access state banner (not yet open / closed / used). Primary sticky CTA **Denemeyi Başlat** (disabled with reason until window opens; confirmation dialog stating timer starts server-side).
* **Data:** `EXISTING` (sessions `DENEME`). **Risk:** Low-Medium (start must remain idempotent; don't change API).

### 11.4 Student — Exam runner (`/denemeler/[id]/coz`)

* **Audit (keep all):** server clock offset; deadline countdown with <5 min alert; autosave per answer with `revision`; save state indicator; online/offline state; `beforeunload` warning; heartbeat while visible; visibility/offline/session events to `/events`; per-question timings to `/timings`; marked ("?") vs answered ("✓") vs visited ("●") palette; mobile view toggle booklet/answers; submit confirmation; submit error handling; booklet from `/booklet` (PDF).
* **Visual rules (reliability over Notion):** fixed full-height layout, no sidebar/shell chrome (keep runner outside `PanelShell` as today), high-contrast neutral, large hit targets (min 44px options), tabular Mono timer, no animation except save-state fade, no layout shift when save state changes.
* **Layouts:**
  * Desktop ≥1280: booklet 62% | answer panel 38% (timer, section, palette 10-column grid, options A–E, Mark, prev/next, Teslim et).
  * Tablet 768–1279 (primary LGS device): booklet top 60vh scroll, answer panel bottom sheet docked (palette collapsible); landscape uses desktop split at 50/50.
  * Mobile <768: explicit toggle **Kitapçık | Cevaplar** (existing); answer-only mode recommended ("Kitapçığı kâğıttan çözüyorsan Cevaplar görünümünü kullan"); palette as full-screen sheet.
* **LGS session UI (`DENEME`):** Sözel: timer + section label + palette scoped to Sözel. **Oturum bitti** confirmation screen (answers count, unanswered, "Oturumu kapat"). **Ara**: minimal full-screen state "Sözel tamamlandı · Sayısal 14:32'de açılır" with countdown, no answer UI. **Sayısal**: fresh timer; Sözel answers visible as **locked** (read-only badge, no inputs). Requires per-session deadlines, server-enforced session close and break windows in `OdkExamAttempt`/`OdkExamSection` → **`DENEME`** (not present in schema: `OdkExamSection.durationMinutes` exists but there is no session/break concept).
* **Risk:** **High** — change visuals only after a frozen E2E (`odk-exam-flow.spec.ts`) plus new runner visual snapshots at 390/768/1024/1440; no logic edits in the same PR.

### 11.5 Student — Result (`/denemeler/[id]/sonuc`)

* **Current:** metric tiles, "Ders bazlı" cards, Kazanım görünümü cards with progress, next-step attention cards, Zaman analizi, Soru cevap dökümü, answer key link, Dino explanation.
* **Target structure:**
  1. **Result header** (document title area): exam title · family · date; property row: **Net 74,25** (large Mono) · Doğru 81 · Yanlış 27 · Boş 12 · Süre 2 sa 41 dk · Δ önceki deneme +3,5.
  2. **Dersler** — table: Ders | D | Y | B | Net | Süre (right-aligned tabular).
  3. **Analiz** — two columns: Güçlü alanlar / Geliştirilecek alanlar (outcome rows with accuracy bars); "Zaman" sentence ("Fen bölümünde soru başına 1,8 dk — ortalamanın üstünde").
  4. **Sorular** — filterable table (Tümü / Yanlış / Boş / İşaretlediğim; by subject), columns: No · Ders · Kazanım · Cevabın · Doğru · Süre; row → drawer with question asset if available.
  5. **Trend** — small line of own nets (≥2 results).
  6. **Sonraki adım** — §11.6 crossover rows + "Dino'ya sor: sonucumu açıkla" (existing action).
* **AYT track view:** tabs **Benim alanım | Tüm bölümler**. Default from `StudentProfile` AYT field (SAY | EA | SOZ | DIL — `education.prisma:67`): SAY → MAT + FEN; EA → MAT + EDB-SOS1; SÖZ → EDB-SOS1 + SOS2. Show raw nets only, labelled "Ham net"; any score estimate is a separate, explicitly labelled future block. Mapping section codes → track is `FRONTEND` if section codes are stable in `sectionBreakdown`; otherwise `DENEME`.
* **Data:** `EXISTING`. **Mobile:** header properties wrap 2×3; tables scroll horizontally only for Sorular. **Risk:** Medium.

### 11.6 Product crossover rules (result, homes, Student 360)

`lib/odk/result-next-step.ts` produces recommendations; render them through a single `NextStepRow` that resolves the action by entitlement (server-side, from `getAccessibleProducts`):

| Learner has | Action shown |
|---|---|
| OD | "Tekrar materyallerini aç" → `/panel/ogrenci/tekrar` or material link |
| Yön (OK) | "Koçuna plan önerisi gönder" — existing automatic `coach-bridge` suggestion; button confirms/adds a note (`YON` if a student-initiated suggestion endpoint is needed) |
| neither | "Kendi çalışma listene ekle" (personal goal/plan task needs `YON`; v1: copy to a checklist in result page, local only → avoid; prefer "Konuyu not al" disabled until backend) |

Never show OD/Yön actions to learners without that membership; never word them as owned features ("Yön Koçluk ile…" upsell is a separate, clearly marked block, off by default).

### 11.7 Parent and teacher (Deneme Ligi)

* Parent `/panel/odk/veli` + `/raporlar`: calm report: child selector, latest result header (net, D/Y/B), subject table, "kendi önceki denemeleriyle" trend, plain-language summary. Remove "Matematik denemelerini…" MATH_ONLY copy (`audience-reports.tsx:119`). `EXISTING`.
* Teacher/report viewer `/panel/odk/ogretmen/raporlar`: database table of related students × latest exam (net, Δ, weak outcomes), row → student result drawer; filter by group/exam. `EXISTING` (`odk:report:read_related`).

### 11.8 Deneme Ligi staff home (`/panel/odk/yonetim`)

* **Current:** ADMIN → metric-tile `OdkHome`; staff → module tiles (`OdkStaffHome`).
* **Target (one component for both, filtered by permissions):**
  ```text
  Deneme Ligi                                            [+ Yeni deneme]*
  Bu hafta 2 deneme · 1 tanesi yayın bekliyor

  Dikkat bekleyenler
   ! TYT-4 hazırlıkta: 3 soru kazanımsız          → Hazırlığa git    (edit)
   ! AYT-2 bitti, 18 deneme puanlanmadı           → Puanla           (score)
   ● LGS-3 puanlandı, yayın bekliyor              → Yayın önizleme   (release)
   ● 4 deneme bütünlük incelemesi bekliyor        → İncele           (integrity)
   ● 12 atanmış öğrencinin erişimi yok            → Atamalar         (assign)  [DENEME for grants]
  ─────────────
  Yaklaşan        table: deneme · tür · tarih · durum · hazırlık %
  Canlı şimdi     (operator) live counts → Canlı operasyon
  Son etkinlik    imports, schedule changes, releases (OdkImportAudit, AnswerKeyRevision, exam timestamps)
  ```
  `*` only with `odk:exam:edit`. Each attention row is shown only if the viewer holds the row's permission.
* **Data:** readiness issues (`getOdkExamReadiness`) `EXISTING`; unscored attempts after end `EXISTING`; SCORED-not-RELEASED `EXISTING`; integrity counts `EXISTING`; "assigned student without access" needs grant/entitlement join → `DENEME`; "scoring job failed" has no persisted failure state today → `DENEME` (interim: "puanlama tamamlanmadı" derived from attempts without `OdkAttemptScore` after `endsAt`). Pilot readiness card stays ADMIN-only.
* **Risk:** Medium (`PHASE-1` for permission filtering, already available in shadow).

---

## 12. Student 360 (final structure)

Routes unchanged: `/panel/yonetim/ogrenciler/[id]` (admin), `/panel/ogretmen/ogrenci/[id]` (teacher/coach). Tab param stays `?sekme=`; old values become aliases.

```text
← Öğrenciler                                                [Öğrenci panelini gör]* [⋯]
Taha Berk                                                   ● Risk: orta
12. sınıf · YKS SAY · Aktif

Ürünler        onlinedershanem. · Yön Koçluk · Deneme Ligi
Grup/öğretmen  12-SAY-A · Mehmet Y. (Mat), Elif K. (Fiz)
Koç            Zeynep A. · sonraki görüşme Perşembe
Veli           Ayşe Berk (birincil, akademik görünür)
Son aktivite   bugün 09:12

[Genel] [Öğrenme] [Yön] [Deneme Ligi] [Etkinlik] [Risk & müdahale]† [Hesap & paket]‡
```

| New tab | Contains (old tabs / panels) | Visible to | Data |
|---|---|---|---|
| **Genel** | Overview + **Bugün** section (next lesson, today's Yön tasks, next DL exam) + Öğretmenler (property + admin edit drawer `StudentTeacherLinkForm`) + Veliler (property + admin relationship drawer) | admin, OD teacher, coach | `EXISTING` |
| **Öğrenme** | Dersler, Ödevler, Takvim, Gelişim (academic) as sub-views `?gorunum=dersler|odevler|takvim|gelisim`; plus attendance and recovery | admin, OD teacher (`od:student:read`), coach read-only summary | `EXISTING` |
| **Yön** | Koçluk: coach, goals, current plan + adherence, sessions, notes (lanes by permission: INTERNAL/private only with `ok:note:read_private`), help requests, check-ins | admin, assigned coach; OD teacher sees adherence summary only | `EXISTING` + `PHASE-1` for note permission |
| **Deneme Ligi** | ODK results (latest, nets, trend, weak outcomes, upcoming), **separately** external mock exams ("Okul ve kurum denemeleri") | admin, coach, teacher with `odk:report:read_related` | `EXISTING` |
| **Etkinlik** | Cross-product timeline from `StudentTimelineEvent` filtered by `timelineVisibilitiesForViewer('STAFF'|…)` + lesson/assignment/exam events | admin, staff with any relation | `EXISTING` (visibility filter exists since Phase 0) |
| Risk & müdahale † | RiskPanel + intervention actions | admin, teachers with `interventionInbox` | `EXISTING` |
| Hesap & paket ‡ | CommercePanel (memberships with provenance, orders) | `access.canViewCommerce` (admin) | `EXISTING` |

Alias map (must ship with the change to keep deep links/tests): `genel→genel`, `dersler→ogrenme&gorunum=dersler`, `odevler→ogrenme&gorunum=odevler`, `takvim→ogrenme&gorunum=takvim`, `gelisim→ogrenme&gorunum=gelisim`, `ogretmenler→genel#iliskiler`, `veli→genel#iliskiler`, `kocluk→yon`, `denemeler→deneme-ligi`, `risk→risk`, `paket→paket`. Update `STUDENT_360_TABS`, `student360TabHref`, and `policy.ts` data-loading flags (`needsTeachersTab`, `needsCoaching`, …) accordingly.

Visibility depends on permission, not on role alone: an OD teacher in `enforce` without `ok:coaching:write` must not see private Yön notes; a coach without OD relation sees the Öğrenme tab as summary only. `PHASE-1`.

Risk: **Medium-High** (shared by two personas; heavy tests in `stories/student-360-panels.stories.tsx`).

---

## 13. Operations Center (cross-product admin home)

`/panel/yonetim` → **Gelen kutusu** ("Notion inbox + Linear triage").

```text
Gelen kutusu                                   [Filtre: Tümü ▾]  [Yenile]
Bugün 14 aksiyon · 2 kritik · son kontrol 09:42

Kritik (2)
 ⛔ Ödeme alındı, hesap açılmadı · Sipariş #4821 · 3 sa      [Hesabı bağla]
 ⛔ Puanlama tamamlanmadı · AYT-2 · 18 deneme                [Puanla]
Aksiyon (9)
 ▲ OD   Öğrenci gruba atanmamış · Ali K.                     [Grup ata]
 ▲ Yön  Koç bekliyor · Selin D. (Yön aktif, 4 gün)           [Koç ata]  → drawer
 ▲ Yön  Koç kapasite üstü · Zeynep A. 18/15                  [Yeniden dağıt]
 ▲ DL   Yayın bekliyor · LGS-3                               [Yayın önizleme]
 ▲ Güv. MFA sıfırlama onayı bekliyor · Mehmet Y.             [Onayla]   ← restored capability
İzle (3) …
─────────
Sistem sağlığı  DB ● · Arka plan ● · E-posta ● · Ödeme ● · Meta ● · Yedek ●
Bugün           12 ders · 340 aktif öğrenci · 2 deneme · 5 yeni sipariş   (one text line, links)
```

| Group | Items | Source | Tag |
|---|---|---|---|
| OD | student without group, no parent, inactive group teacher, lesson missing plan, cancelled lesson, unnoted lesson, high-risk student, open help request | existing `OpsActionCode`s | `EXISTING` |
| Yön | student without coach (OK membership, no assignment), coach over capacity, plan overdue (`STALE_PLAN`), session overdue | `yonetim/kocluk` queries → add codes `YON_NO_COACH`, `YON_COACH_OVER_CAPACITY`, `YON_SESSION_OVERDUE` | `EXISTING` data, new codes |
| Deneme Ligi | exam incomplete (readiness issues within N days of start), awaiting release, unscored after end, integrity reviews, assigned without access | ODK queries | `EXISTING` except access → `DENEME` |
| Commerce | paid not provisioned (`PAID_NO_ACCOUNT`, provisioning failed/pending/retry), invite pending; ODK orders provisioning | existing + `odkOrder` provisioning | `EXISTING` |
| Security | pending MFA reset approvals (from dead `kullanicilar` page), privileged staff without MFA ("MFA kurulumu bekleniyor") | `mfaResetRequest`, Phase 1 badge logic | `EXISTING` / `PHASE-1` |
| System | cron/health/partial data | existing | `EXISTING` |

Keep severity model (BLOCKING/ACTION_REQUIRED/WATCH → Kritik/Aksiyon/İzle) and `admin-operations-center.test.ts`. Summary tiles become a single text line. Row actions open drawers where the action is small (assign coach, link order to user, approve MFA reset); otherwise navigate. Risk: Medium.

The separate "Operasyon" (`/mudahale` or `/raporlar`) and "Provisioning" (`/isler`) items remain as pages but leave the top of the sidebar (Müdahaleler, Aktivasyon).

---

## 14. People & Access (Kişiler & Erişim)

### 14.1 List — `/panel/yonetim/kisiler`

Views (tabs, `?sekme=`): **Tümü · Öğrenciler · Veliler · Öğretmenler · Koçlar · Personel · Yeni kayıtlar**.

* Restore filters from the unreachable `kullanicilar` list: rol, ürün, durum + search + paging (server-side). Merge `ogrenciler`, `veliler`, `egitmenler` list features into views (keep those routes as redirects **only after** parity is proven; until then keep them and link from views). "Koçlar" = teachers with COACH@OK (capacity, students). "Personel" = teachers with any non-TEACHER staff role (Deneme Ligi roles, PRODUCT_MANAGER) + admins.
* Columns (Tümü): Ad · Rol · Ürünler (product dots with provenance tooltip) · Sorumluluklar (badges: Öğretmen, Koç, Editör, Operatör, Yayıncı, Rapor) · Durum (translated) · Son giriş · ⋯.
* Bulk actions (existing `/api/panel/users/bulk`): status change etc.; selection only in views where bulk applies.
* Primary: "Yeni kişi" (dialog with `CreateUserForm` steps). Row → user detail; hover/`Space` → quick drawer.
* Data: `EXISTING` (staff badges from `ProductStaffAssignment` = `PHASE-1`, landed). Risk: Medium (filter parity).

### 14.2 User detail — `/panel/yonetim/kullanicilar/[id]`

```text
← Kişiler
Mehmet Yılmaz                                 Aktif   [Kullanıcı olarak görüntüle] [⋯]
Öğretmen · mehmet@… · son giriş dün 21:04

[Profil] [Ürünler] [Sorumluluklar] [İlişkiler] [Güvenlik] [Geçmiş]
```

| Tab | Contents (existing component) |
|---|---|
| Profil | `AdminUserProfileForm`, accessibility accommodation (`AdminAccessibilityAccommodationForm`), signup profile card |
| Ürünler | membership **objects** (below) + grant dialog (`AdminProductAccessForm` logic, Phase 0 semantics: never overwrite purchased memberships) |
| Sorumluluklar | Access Center (`AdminStaffResponsibilitiesForm`): rows per (product, role) with since/by/reason, revoke with reason + step-up; coach capacity; last-holder warning; MFA badge; history toggle |
| İlişkiler | groups, students (teacher), children (parent), coach assignments, student-teacher links (`StudentTeacherLinkForm`), parent links (from `veliler` page forms) |
| Güvenlik | MFA status, MFA reset request (`RequestMfaResetForm`) + **pending approval if requested by another admin**, sessions, account state actions (suspend/activate, reset password via `UserRowActions`) |
| Geçmiş | audit log filtered by subject (from `/kayitlar` data) |
| ⋯ menu | Archive (with impact analysis dialog `ArchiveUserAction`), Teacher offboarding (`TeacherOffboardingForm`) |

### 14.3 Product access as objects

```text
Deneme Ligi                                   ● Aktif
Satın alındı · 01 Eyl 2026 → 31 May 2027
Paket: YKS Deneme Ligi · Sipariş #4821  →
                                              [Erişimi sonlandır]

Yön Koçluk                                    ● Aktif
Manuel erişim · 4 Eki 2026'da Admin K. tarafından
Neden: pilot öğrenci                          [Erişimi sonlandır]
```

Provenance fields come from `ProductMembership` (source, startsAt, expiresAt, order link). Revoke uses `revokeProductMembership` (never delete). `EXISTING`. Risk Medium (Phase 0 P0-2 invariant must be covered by test: purchased memberships untouched by UI).

---

## 15. Exam Workspace (creation → live → publication)

### 15.1 Creation

`/panel/odk/yonetim/sinavlar` primary "Yeni deneme" → **dialog** (replacing the inline `AdminExamCreate` block): Tür (LGS/TYT/AYT) · Şablon (`exam-templates.ts`) · Seri (optional, "Yeni seri" secondary link opens nested step inside the same dialog, not a second modal) · Ad · Eğitim yılı → **Taslak oluştur** → navigate to the workspace. Existing API `POST /api/odk/admin/exams` / `exam-series`. `EXISTING`. Risk Low.

### 15.2 Workspace tabs (`/panel/odk/yonetim/sinavlar/[id]?sekme=`)

Header: back · title · family badge · status badge · version · property row (Başlangıç, Süre, Atanan, Katılım). Primary action changes with lifecycle and permission: DRAFT+edit → "Hazır olarak işaretle"; READY+schedule → "Planla"; ENDED+score → "Puanla"; SCORED+release → "Yayın önizleme".

| Tab | Existing source | Permission | Tag |
|---|---|---|---|
| Genel | header + readiness checklist + timeline of lifecycle dates | any exam-list permission | `EXISTING` |
| İçerik | Editor §2 PDFs (booklet, answer-key PDF), JSON import panel (answer key, outcomes) | `odk:exam:edit` | `EXISTING` |
| Sorular | Editor §3 questions + outcomes (+ primary outcome), filters "Kazanımsız", "Anahtarsız" | `odk:exam:edit` (answer key never sent otherwise — keep) | `EXISTING` |
| Oturumlar | LGS Sözel/Sayısal, break duration | edit | `DENEME` |
| Zamanlama | Editor §1 planning (start/end/late entry/meet), §4 publish controls (ready, schedule), §8 security policy (auto submit etc.) | `odk:exam:schedule` | `EXISTING` |
| Katılımcılar | `AdminAssignmentPanel` (assignment), later grants | `odk:exam:assign` (+ `odk:grant:manage` → `DENEME`) | `EXISTING`/`DENEME` |
| Önizleme | `AdminPreviewPanel` | edit | `EXISTING` |
| Canlı | link-out summary to `/operasyon?deneme=<id>` with live counts | `odk:ops:live` | `EXISTING` |
| Puanlama & yayın | scoring shortcut (score, rescore — step-up), `AdminResultsReviewPanel` (results, release preview, release — step-up) | `odk:result:score` / `odk:key:revise` / `odk:result:release` | `EXISTING` |
| Bütünlük | `AdminIntegrityReviewPanel` | `odk:integrity:review` | `EXISTING` |
| Raporlar | audience report for this exam | `odk:report:read_all` | `EXISTING` |
| Geçmiş | `OdkImportAudit`, `OdkAnswerKeyRevision`, status timestamps | any | `EXISTING` (read model new) |

Tabs a viewer cannot use are **not rendered** (today panels are already conditionally rendered by `hasStaffPermission`). Keep the anchor ids `adim-json`, `adim-sonuc`, `adim-integrity` as tab aliases (`#adim-sonuc` → `?sekme=puanlama`) because other pages link to them.

### 15.3 Readiness (editor right rail, visible on Genel/İçerik/Sorular)

```text
Hazırlık durumu                       4/5
✓ Yapı (90 soru, 4 bölüm)
✓ Kitapçık PDF
! 3 soruda kazanım yok          → Sorular?filtre=kazanimsiz
✓ Cevap anahtarı
✓ Güvenlik politikası
```

Driven by `getOdkExamReadiness(id).issues` (`EXISTING`). Each issue links to the exact filter.

### 15.4 Lists

* **Denemeler** (staff) table: Deneme · Tür · Seri · Durum · Başlangıç · Hazırlık · Atanan · Katılım · ⋯; saved views Hazırlıkta / Planlanan / Canlı / Puanlama bekliyor / Yayınlandı / Arşiv; default view depends on role (editor → Hazırlıkta, operator → Planlanan, publisher → Puanlama bekliyor).
* **Puanlama ve yayın** (`/sonuclar`): queue table with the publish workflow states; restored in admin nav.

### 15.5 Live operations (`/panel/odk/yonetim/operasyon`)

Operations console, **dense** density, not Notion styling: exam selector + session state chip; counters as a single row (Başlamadı · Devam ediyor · Bağlantı koptu · Teslim · Otomatik teslim · İnceleme); attempts table with filters (status, integrity level, last heartbeat age), sticky header, 32px rows, Mono times; integrity alerts panel on the right (≥1280) / tab (<1280); manual refresh + auto-refresh indicator (`OdkOperationsRefresh`). Row → attempt drawer (events timeline, integrity review actions). `EXISTING`. Risk Medium.

### 15.6 Publication

Release flow stays two-step (preview → release, step-up). Dialog states the audience count and irreversibility; after release, show "Yayınlandı · 312 öğrenciye bildirim gönderildi" and the coach-bridge suggestion count if available.

---

## 16. Responsive Strategy (320 → 1440)

| Width | Shell | Content | Tables | Exam runner |
|---|---|---|---|---|
| 320 | drawer; 48px context bar shows workspace icon + truncated breadcrumb; bottom bar for student/parent (icons + 10px labels) | 16px gutter; PageHeader title 20px; primary action becomes sticky bottom button | student/parent: stacked rows; staff: horizontal scroll with sticky first column + "kaydır" hint | answers-only mode recommended; palette sheet |
| 390 | same | property rows stack (label above value) | same | toggle Kitapçık/Cevaplar |
| 768 | drawer; no bottom bar for staff | two-column property block | staff tables may fit with hidden columns (`hideBelow: md`) | tablet layout: booklet top, answer sheet bottom (portrait) / 50:50 (landscape) |
| 1024 | sidebar appears as 56px rail by default; expandable overlay | full layout, drawers overlay content | full tables | split layout |
| 1440 | full 240px sidebar | content max-widths (§5.4); exam/ops full width | ops: right alert panel | 62/38 split |

Rules: no `overflow-x` on the page body; topbar slot horizontal scrolling (`.panel-topbar-slot`) removed with the child switcher moving into the page header; drawers become full-screen sheets <768; dialogs full-width bottom sheets <480. Test viewports already used by `responsive-smoke.spec.ts` and `public-yon-brand.spec.ts` patterns — add 320/390/768/1024/1440 for each persona home, one list, one detail, runner, result.

---

## 17. Accessibility (requirements)

1. **Landmarks:** `<nav aria-label="Çalışma alanı menüsü">` (sidebar), `<header>` context bar, `<main id="panel-content" tabIndex=-1>` (exists), drawers `role="dialog" aria-modal="true"` with labelled title.
2. **Skip link** kept (`Ana içeriğe geç`), plus "Menüye geç" when sidebar collapsed.
3. **Focus:** visible 2px ring everywhere; focus returns to trigger after drawer/dialog/menu close; focus trap in dialogs/drawers; route change moves focus to `<h1>` (client island in PageHeader) — today only skip-link focus exists.
4. **Keyboard:** sidebar items reachable by Tab; disclosure groups with `aria-expanded`; tables: row link is the first cell link (no `onClick` rows); bulk-select checkboxes labelled with row name; ⌘K/Ctrl+K and "/" open search, Esc closes; drawers close on Esc; drag-and-drop on coach calendar must keep the existing "Tarihi değiştir" button alternative.
5. **Tables:** real `<table>`, `<caption>` (visually hidden when needed), `scope="col"`, sort state with `aria-sort`; mobile stacked rows keep `data-label` semantics (existing `PanelTable` fixed index bug — keep).
6. **Status:** never colour-only; badges include text; live exam dot has `sr-only` "canlı"; progress bars keep `role="progressbar"` with values (existing).
7. **Contrast:** AA 4.5:1 for text incl. muted (`#5F6E67` on `#FFF` = 5.4:1; on sidebar `#F7F8F7` ≈ 5.1:1); product accents used as text only in their AA variants (§5.2).
8. **Reduced motion:** honour OS + in-app preference (`AccessibilityPreferenceApplier`); disable shimmer, drawer slide → fade.
9. **Text scale:** `data-panel-text-scale="large"` (exists, `globals.css:2098`) must not break layouts: test 112.5% at 390 and 1024.
10. **Exam runner:** options are buttons with `aria-pressed`; timer has `aria-live="polite"` announcements at 15/5/1 minutes only (not every second); session-locked answers announced as "kilitli".
11. **Automation:** extend `tests/e2e/panel-accessibility.spec.ts` to every persona home, list, detail and drawer state; Storybook a11y for all new primitives.

---

## 18. Component Strategy

### 18.1 Existing → target

| Component | Decision | Notes |
|---|---|---|
| `panel-shell.tsx` | **REFINE** | Keep data fetching + providers; replace sidebar/topbar markup with `Sidebar`, `WorkspaceSwitcher`, `ContextBar`; add `breadcrumb` prop; `data-product`, `data-density` |
| `panel-nav.tsx`, `panel-mobile-nav.tsx` | **REFINE** | Render new nav model; drawer reuses sidebar; bottom bar only student/parent |
| `admin-command-search.tsx` | **REFINE → `CommandMenu`** | Mount for all personas; permission predicates |
| `ui.tsx` `PanelHeading`, `PanelPageHeader` (+ `panel-page-header.tsx` re-export), `admin-page-header.tsx` | **MERGE → `PageHeader`** | ~68 files; codemod-able |
| `PanelCard`, `PanelCardTitle` | **REPLACE → `Section`** (+ keep a `Card` for §8.3 cases) | 49 files |
| `PanelMetric`, `PanelStatCard`, `odk-home` `MetricCard` | **REMOVE AFTER MIGRATION** → `PropertyStrip` / inline numbers | |
| `PanelStatusBadge`, `OdkStatusBadge` | **MERGE → `StatusBadge`** + `status-vocabulary.ts` | |
| `PanelEmpty`, `empty-state.tsx` (`PanelEmptyState`) | **MERGE → `EmptyState`** | |
| `PanelAttentionCard` | **REFINE → `Callout`** (neutral with tone marker) | |
| `PanelActionRow`, `PanelTaskRow` | **MERGE → `ListRow`** (+ `CheckRow` for tasks) | |
| `PanelTable`, `ResponsiveDataTable` | **MERGE → `EntityTable`** | keep mobile card mode as option |
| `PanelFilterLink` | **REPLACE → `ViewTabs` / `FilterChip`** | |
| `PanelProgress` | **KEEP** (restyle) | |
| `PanelSectionLabel` | **REMOVE AFTER MIGRATION** | uppercase labels retired |
| `parent/child-switcher.tsx` | **REFINE** | renders as PageHeader property select |
| `student-360/*` | **REFINE** | regroup into 6–7 tabs; panels reused |
| `student-adaptive-plan/*` | **REFINE (split)** | `PlanList`, `PlanWeek`, `TaskDrawer`, `PreferencesDrawer` |
| `kocum/coach-week-calendar.tsx`, `coach-desk-panel.tsx`, `suggestion-review-buttons.tsx` | **REFINE / MOVE** | into coach student workspace |
| `coach-attention.tsx` | **MOVE** | into coach home queue builder |
| `teacher-workspace-home.tsx` | **REFINE** | |
| `admin-operations-center.tsx` | **REFINE → Inbox** | |
| `odk/odk-home.tsx`, `odk/odk-staff-home.tsx` | **MERGE** | one permission-filtered staff home; student/parent homes separate RSC |
| `odk/admin-exam-editor.tsx` (983 lines) | **REFINE (split by tab)** | `ExamPlanningForm`, `ExamFilesPanel`, `ExamQuestionsTable`, `ExamPublishControls`, `ExamSecurityForm`, `ExamScoringActions` |
| `odk/student-exam-runner.tsx` | **KEEP logic, REFINE layout** | separate visual PR from any logic |
| `odk/student-exam-start.tsx`, `audience-reports.tsx`, admin panels | **REFINE** | |
| `group-360-view.tsx`, `teacher-lesson-workspace.tsx`, `mock-exam-workspace.tsx` | **REFINE (RSC split)** | high risk; last |
| Forms (`create-user-form`, `admin-product-access-form`, `admin-staff-responsibilities-form`, …) | **KEEP** logic, restyle inputs | |
| `site-btn`, `panel-primary-button`, `panel-quick-action`, `panel-input`, `panel-label` CSS classes | **REPLACE → `Button`, `Input`, `Select`, `Field`** | remove from panel in Phase 8 |
| Business workspace components | **KEEP AS-IS** | shell only |

### 18.2 New primitives (do not build a library; build exactly these)

`Button` (primary=ink, secondary, ghost, danger; sizes sm/md) · `IconButton` · `Input` · `Select` · `Textarea` · `Field` (label, hint, error) · `Checkbox` · `StatusBadge` · `ProductDot` · `PageHeader` · `ViewTabs` · `Section` · `PropertyList` / `PropertyRow` · `PropertyStrip` · `ListRow` / `CheckRow` · `EntityTable` (+ `TableToolbar`, `RowSelection`, `Pagination`) · `Drawer` (URL-driven) · `Dialog` / `ConfirmDialog` · `DropdownMenu` · `Tooltip` · `Skeleton` · `EmptyState` · `Callout` · `CommandMenu` · `WorkspaceSwitcher` · `Breadcrumbs` · `DetailLayout` (main + right rail, used for readiness / properties) · `NextStepRow` · `Sparkline`.

Accessibility-heavy primitives (Dialog, Drawer, DropdownMenu, Tooltip) — evaluate a headless dependency (e.g. Radix primitives) vs. hand-rolled; current code hand-rolls (`admin-command-search.tsx`). Recommendation: one headless dependency for Dialog/Popover/Menu to get focus management right; check `known-dependency-risks.md` policy before adding.

Location: `components/panel/ui/<name>.tsx`; `components/panel/ui.tsx` becomes a re-export barrel during migration. Every primitive gets a story in `stories/panel-primitives.stories.tsx` (exists) with a11y test.

---

## 19. Functionality Preservation Matrix (mandatory)

Treatment codes: **KEEP** as-is · **K+R** keep + redesign · **MOVE** · **CONS** consolidate · **HIDE** hide contextually · **DEPR** deprecate later. Risk L/M/H.

### 19.1 Shared and shell

| Existing capability | Current route / component | Persona | Target location | Treatment | Risk |
|---|---|---|---|---|---|
| Role routing after login | `/panel` | all | same | KEEP | L |
| Product selector with 4 states, MFA/password redirects | `/panel/urun-sec` | all | same page + `WorkspaceSwitcher` menu | K+R | M |
| Product switch link | shell sidebar footer | all | `WorkspaceSwitcher` | MOVE | M |
| Business workspace switch / return | shell | admin, business staff | `WorkspaceSwitcher` ("İşletme") | MOVE | M |
| Account hub (7 sections, server actions) | `/panel/ayarlar/*` | all | same; becomes "Ayarlar" hub incl. notifications prefs, accessibility, data usage, security, sessions, password | K+R + CONS | L |
| Notification inbox + prefs + mark read | `/panel/bildirimler` | all | same; sidebar global item with count | K+R | L |
| Unread dot | topbar | all | sidebar count + mobile bar icon | MOVE | L |
| Accessibility prefs | `/panel/erisilebilirlik` | all (flag) | Ayarlar hub section (route kept) | MOVE (nav) | L |
| Data usage prefs | `/panel/veri-kullanimi` | all (flag) | Ayarlar hub section | MOVE (nav) | L |
| MFA enroll/verify | `/panel/guvenlik` | all | Ayarlar → Güvenlik | MOVE (nav) | L |
| Sessions management | `/panel/oturumlar` + shield icon | all | Ayarlar → Oturumlar; account `⋯` | MOVE | L |
| Change password | `/panel/parola` | all | Ayarlar → Güvenlik | MOVE (nav) | L |
| Skip link, feature provider, offline sync, a11y applier | shell | all | shell | KEEP | M |
| Account completion banner | shell | all (not preview/business) | banner area | K+R | L |
| View-As preview picker, banner, launch from user/student pages | shell, `AdminPreview*` | admin | account `⋯` menu + banner + user detail button | MOVE | M |
| Admin teacher mode switch + banner | shell | admin | account `⋯` + banner | MOVE | M |
| ⌘K command search + entity search | shell | admin, teacher | `CommandMenu` for all personas | K+R | M |
| Logout | shell | all | account `⋯` | MOVE | L |
| Dino chat | `/ogrenci/dino`, `/veli/dino` | student, parent (flag) | bottom "Dino'ya sor" + page | K+R | L |
| Dino explanation inline | `DinoExplanationAction` | student, teacher | contextual "Neden?" links | K+R | L |
| Read-only student profile page | `/panel/ogrenci/profil` (orphan) | student | redirect to `/panel/ayarlar` after verifying no unique data | DEPR | L |

### 19.2 Student

| Capability | Current | Target | Treatment | Risk |
|---|---|---|---|---|
| Next action + reason + tracking events | `/panel/ogrenci` | OD Bugün "Şimdi" (same events) | K+R | M |
| Complete plan task from home | `CompleteHomeAction` | Yön Bugün checklist + OD Şimdi when task | K+R | M |
| Unified today list | `/panel/ogrenci` | OD Bugün "Bugün" list (dedup) | CONS | M |
| Weekly KPI tiles | `/panel/ogrenci` | property strip | K+R | L |
| Latest Deneme card, net trend | `/panel/ogrenci` | cross-product signal row + DL home | MOVE | L |
| OD start card, NoProductAccess | `/panel/ogrenci` | same states | KEEP | L |
| Assignments + submission | `/ogrenci/odevler` | list + drawer | K+R | M |
| Lessons list, filter, .ics | `/ogrenci/takvim` | list | K+R | L |
| Lesson detail | `/ogrenci/takvim/[id]` | document page | K+R | L |
| Materials download | `/ogrenci/materyaller` | table | K+R | L |
| Review queue respond/defer | `/ogrenci/tekrar` | "Tekrar & telafi" tab | K+R + CONS | L |
| Recovery packages | `/ogrenci/telafi` | "Tekrar & telafi" tab | K+R + CONS | L |
| Check-in + help request | `/ogrenci/check-in` | Yön nav (and OD if no Yön) | K+R | L |
| External mock exam entry/analysis | `/ogrenci/denemeler` | OD "Gidişatım ▸ Dış denemelerim" | MOVE | L |
| Progress insights + weekly goal | `/ogrenci/analiz` | Gidişatım | K+R | L |
| Weekly calm digest | `/ogrenci/haftalik` (notification only) | Yön nav "Haftalık özet" | K+R (restore entry) | L |
| Coach card, sessions, reschedule request | `/ogrenci/kocluk` | Koçum | K+R | L |
| Adaptive plan: prefs, generate, complete, request change | `/ogrenci/plan` | Planım list/week + drawers | K+R | **H** |
| Goals list | `/ogrenci/hedefler` | property list | K+R | L |
| DL home | `/odk/ogrenci` | redesigned | K+R | L |
| DL exam list | `/odk/ogrenci/denemeler` | table with views | K+R | L |
| Exam start (rules, Meet, start) | `/denemeler/[id]` | pre-start page with checklist | K+R | M |
| Runner (autosave, heartbeat, events, timings, submit, booklet, mobile toggle) | `/coz` | same logic, new layout | KEEP logic / K+R layout | **H** |
| Result sections + answer-key PDF + Dino + next steps | `/sonuc` | redesigned result | K+R | M |

### 19.3 Parent

| Capability | Current | Target | Treatment | Risk |
|---|---|---|---|---|
| Calm home + child switcher | `/veli` | Genel bakış, switcher in header | K+R | L |
| Academic progress | `/veli/analiz` | Akademik gelişim | K+R | L |
| Teacher weekly digest + feedback | `/veli/haftalik` | same | K+R | L |
| Lessons / assignments / teachers (read-only) | `/veli/takvim`, `/odevler`, `/ogretmenler` | tables | K+R | L |
| External mock exams | `/veli/denemeler` | OD workspace child | K+R | L |
| Coaching (PARENT_VISIBLE only) | `/veli/kocluk` | Yön Genel bakış | K+R | M (privacy) |
| DL home + reports | `/odk/veli`, `/raporlar` | calm report | K+R | L |
| Account & package + package meeting request | `/veli/hesap` | bottom block "Hesap ve paket" | MOVE (nav) | L |
| Dino | `/veli/dino` | bottom block | MOVE (nav) | L |

### 19.4 Teacher / coach

| Capability | Current | Target | Treatment | Risk |
|---|---|---|---|---|
| Teacher home (lessons, pending, risky, upcoming) | `/ogretmen` | OD Bugün | K+R | M |
| Yön attention block on teacher home | `CoachAttention` | coach home queue | MOVE | M |
| Lesson calendar | `/ogretmen/takvim` | Dersler | K+R | L |
| Lesson workspace (attendance, notes, assignments, templates, quick close) | `/ogretmen/ders/[id]` | tabbed editor | K+R | **H** |
| Assignment manager + submission review | `/ogretmen/odevler` | table + drawers | K+R | M |
| Roster + risky filter | `/ogretmen/gruplar` | Öğrenciler table | K+R | L |
| Student 360 (teacher) | `/ogretmen/ogrenci/[id]` | regrouped tabs | K+R | M-H |
| Materials CRUD + upload | `/ogretmen/materyaller` | Kaynaklar | K+R | L |
| Review monitor, recovery manager, group analysis, mock exams, AI drafts | respective routes | Takip ▸ / Kaynaklar ▸ | K+R | L |
| Coach desk: suggestions review, calendar drag/drop + reschedule, add task, apply template, copy plan, note with visibility, weekly summary, plan approval | `/ogretmen/plan` | batch desk + student workspace | K+R + MOVE | **H** |
| Session prep, record session, set goal | `/ogretmen/hazirlik/[id]` | coach student workspace | K+R | M-H |
| Help requests respond/feedback | `/ogretmen/yardim` | Yön "Yardım istekleri" + student tab | K+R | L |
| Intervention inbox create/update/generate | `/ogretmen/mudahale` | Yön "Müdahaleler" | K+R | L |
| Weekly digest generate/publish | `/ogretmen/ozetler` | Yön "Haftalık özetler" | K+R | L |
| DL related reports | `/odk/ogretmen/raporlar` | report table | K+R | L |

### 19.5 Deneme Ligi staff

| Capability | Current | Target | Treatment | Risk |
|---|---|---|---|---|
| Staff home (module tiles) / admin ODK home (metrics, pilot readiness) | `/odk/yonetim` | unified attention home | CONS | M |
| Exam list + create exam/series | `/odk/yonetim/sinavlar` | table + create dialog | K+R | L |
| JSON import (answer key, outcomes) | exam detail | İçerik tab | MOVE | M |
| Planning fields, files, questions/outcomes, publish controls (ready/schedule), security policy, scoring shortcut (score/rescore) | `AdminExamEditor` | Genel/İçerik/Sorular/Zamanlama/Puanlama tabs | MOVE + K+R | **H** |
| Assignment | `AdminAssignmentPanel` | Katılımcılar tab | MOVE | M |
| Preview | `AdminPreviewPanel` | Önizleme tab | MOVE | L |
| Results review + release preview + release (step-up) | `AdminResultsReviewPanel` | Puanlama & yayın tab | MOVE | **H** |
| Integrity review | `AdminIntegrityReviewPanel` | Bütünlük tab + ops drawer | MOVE | M |
| Answer key sent only to editors | page-level `canEdit ? questions : []` | must remain in tab loader | KEEP | **H** |
| Live ops console + refresh | `/odk/yonetim/operasyon` | dense console | K+R | M |
| Scoring & release list | `/odk/yonetim/sonuclar` | queue; **add to admin nav** | K+R | L |
| Reports (all) | `/odk/yonetim/raporlar` | report table | K+R | L |
| Packages contract view | `/odk/yonetim/paketler` | table | K+R | L |
| ODK pilot runs & gates | `/odk/yonetim/pilot` (orphan) | Admin Sistem ▸ Kontrollü yayın | K+R (restore entry) | L |

### 19.6 Admin

| Capability | Current | Target | Treatment | Risk |
|---|---|---|---|---|
| Operations center (actions, risk, tiles, health) | `/yonetim` | Gelen kutusu | K+R | M |
| Admin preview entry | `/yonetim` `AdminPreviewEntry` | account `⋯` + user detail | MOVE | L |
| Intervention inbox | `/yonetim/mudahale` | Müdahaleler | K+R | L |
| Activation desk (metrics, jobs, onboarding, lead status, email retry, order link) | `/yonetim/isler` | Aktivasyon (table + drawers) | K+R | M |
| Self-signups + contact control + child account | `/yonetim/basvurular` | Kişiler ▸ Yeni kayıtlar | MOVE | M |
| People hub + create + bulk | `/yonetim/kisiler` | Kişiler & Erişim | K+R | M |
| **Role/product/status filters** | `/yonetim/kullanicilar` (**unreachable**) | Kişiler views | **restore** (CONS) | M |
| **Pending MFA reset approvals** | `/yonetim/kullanicilar` (**unreachable**) | Inbox Security group + user detail Güvenlik | **restore** (MOVE) | **H** (security process currently has no UI) |
| User detail (profile, a11y accommodation, product access, staff responsibilities, MFA reset request, row actions, archive impact, offboarding, preview, student-teacher link) | `/yonetim/kullanicilar/[id]` | tabbed detail | K+R | **H** |
| Student list | `/yonetim/ogrenciler` | Kişiler ▸ Öğrenciler | CONS (keep route until parity) | M |
| Student 360 admin + "Öğrenci Panelini Gör" | `/yonetim/ogrenciler/[id]` | regrouped | K+R | M-H |
| Parent list + relationship link/update/remove | `/yonetim/veliler` | Kişiler ▸ Veliler + user detail İlişkiler | CONS | M |
| Teacher list | `/yonetim/egitmenler` | Kişiler ▸ Öğretmenler | CONS | L |
| Education mgmt (groups, lessons, series preview, assignments, materials, setup wizard) | `/yonetim/egitim` | tabs | K+R | M |
| Group 360 + members | `/yonetim/gruplar/[id]` | detail | K+R | **H** |
| Lesson calendar filters | `/yonetim/takvim` | same | K+R | L |
| Coach ops: queues, assign/transfer with capacity override, coach load, sessions, no-goal list | `/yonetim/kocluk` | queues + directory + drawer | K+R | M |
| Curriculum versions/outcomes | `/yonetim/kazanimlar` | same | K+R | L |
| External mock analysis | `/yonetim/denemeler` | OD workspace | K+R | L |
| Orders list/detail, provisioning retry | `/yonetim/siparisler*` | table + detail (+ drawer) | K+R | M |
| Analytics + metric definitions + export | `/yonetim/analitik*` | Sistem ▸ Analitik | K+R | L |
| Ops & audit reports + export | `/yonetim/raporlar` | Sistem ▸ Raporlar | K+R | L |
| Audit log | `/yonetim/kayitlar` | Sistem ▸ İşlem geçmişi + user "Geçmiş" tab | K+R | L |
| Feature snapshot | `/yonetim/ozellikler` | Sistem ▸ Özellikler | KEEP | L |
| Cohort quality | `/yonetim/kalite` (orphan) | Sistem ▸ Kalite (flag) | restore entry | L |
| OD pilot cohorts | `/yonetim/pilot` (orphan) | Sistem ▸ Kontrollü yayın | restore entry | L |
| İşletme workspace (CRM, marketing, finance, AI, platform) | `/yonetim/isletme/*` | unchanged, shell switcher only | KEEP | L |

### 19.7 Copy & internal-term leaks to fix (FRONTEND)

| Location | Current | Target |
|---|---|---|
| `lib/auth/roles.ts:95-96` `productLabel` | `onlinekoçum.` / `onlinedenemekulübüm.` | `Yön Koçluk` / `Deneme Ligi` (check all callers incl. emails/notifications before changing; consider a separate `productDisplayName()` for panel UI and leave legal/commerce strings) |
| `app/panel/odk/ogrenci/denemeler/[id]/page.tsx:54`, `odk/ogrenci/denemeler/page.tsx:177`, `ogrenci/page.tsx:367`, `veli/denemeler/page.tsx:110` | onlinedenemekulübüm. | Deneme Ligi |
| `ogrenci/check-in/page.tsx:56`, `ogretmen/yardim/page.tsx:63`, `lib/panel/teacher-workspace-server.ts:340,349`, `lib/panel/teacher-attention-server.ts:65` | `"onlinekoçum."` group fallback | "Yön Koçluk" |
| `ogretmen/plan/page.tsx:103` | "onlinekoçum. planı" | "Yön · Plan masası" |
| `veli/kocluk/page.tsx:86` | "Bu hesapta onlinekoçum. bulunmuyor." | "Bu hesapta Yön Koçluk bulunmuyor." |
| `components/panel/student-360/AcademicPanel.tsx:114`, `lib/panel/student-360.ts:358` | onlinekoçum. | Yön Koçluk |
| `yonetim/kocluk/page.tsx:295` | "onlinekoçum. operasyon sinyalleri" | "Yön operasyon sinyalleri" |
| `lib/panel/navigation.ts:205,244,245`, `urun-sec/page.tsx:31` | "Kulüp deneme raporları", "Sonuç ve kulüp raporları", "Kulüp paketleri", "Kulüp paketlerini incele" | "Deneme Ligi raporları", "Sonuç raporları", "Deneme Ligi paketleri", "Deneme Ligi paketlerini incele" |
| `components/odk/odk-home.tsx:28-43` | eyebrows "ODK yönetimi/öğretmen/öğrenci/veli"; "Sıradaki matematik denemene hazırlan." | remove eyebrows; "Sıradaki denemen" |
| `components/odk/audience-reports.tsx:111,119` | "ODK öğrenci raporları", "Matematik denemelerini…" | "Deneme Ligi raporları", family-neutral copy |
| `app/panel/odk/yonetim/pilot/page.tsx:118`, `odk-pilot-control.tsx:46,105,129` | "ODK yayın kapıları", "ODK kontrollü pilot" | "Deneme Ligi yayın kapıları" |
| `admin-integrity-review-panel.tsx:113` | "Integrity inceleme" | "Bütünlük incelemesi" |
| `lib/panel/domain-vocabulary.ts:47` | "Provisioning" | "Erişim açılışı" / "Aktivasyon" |
| `ogretmen/plan/page.tsx` `{item.kind}` | raw `WeeklyPlanSuggestionKind` | translated label |
| `yonetim/kisiler/page.tsx:347,391,428`, `isler/page.tsx:344,869` | raw `{user.status}`, `{row.status}`, `{order.status}` | `StatusBadge` |
| `lib/panel/global-search-server.ts` exam detail | `TYT · SCORED` | `TYT · Puanlandı` |
| `odk/yonetim/sinavlar/[id]/page.tsx` header | "Matematik" / "Tam deneme" structure label, "LIVE sonrası…" | "Tam deneme / Matematik denemesi", "Sınav başladıktan sonra…" |
| Stale comments: `kullanicilar/page.tsx:36-38` (no coach model), `egitmenler/page.tsx:26-27` | — | update when touched |

Role voice: Student "sen", direct, short; Parent "siz", explanatory; Teacher/Coach "siz", professional; Ops terse ("3 deneme yayın bekliyor").

---

## 20. Backend Dependencies

### 20.1 Phase alignment

| Backend phase | State | What the UX roadmap can rely on |
|---|---|---|
| Phase 0 — security/data integrity | **landed** (`e68ec25`) | Timeline visibility filter, membership-safe product form, coach vs OD-teacher split, `canViewAcademic` |
| Phase 1 — staff authorization | **landed in `shadow`** (`eb4cc65`) | `ProductStaffAssignment`, `effectiveStaffPermissions`, staff nav for ODK, Access Center, MFA/step-up for privileged staff. UI may read permissions now; only `enforce` makes them authoritative |
| Phase 2 — selector/shell | pending | Workspace switcher behaviour, `activeProduct` semantics for ADMIN "Operasyon" scope, staff entry routing |
| Phase 3 — Yön | pending | Coach home as entry route, student-initiated reschedule/suggestions, production `adaptivePlan` rollout, adherence thresholds |
| Phase 4+ — Deneme Ligi | pending | LGS sessions + breaks, per-exam grants (`odk:grant:manage`), scoring job state, assigned-without-access detection |

### 20.2 Feature → dependency

| Feature | Tag |
|---|---|
| Tokens, typography, primitives, PageHeader, EntityTable, Drawer, StatusBadge, EmptyState | `FRONTEND` |
| Shell restructure, breadcrumbs, sidebar collapse, Ayarlar hub consolidation | `FRONTEND` |
| Workspace switcher (product list, business, selector link) | `EXISTING` (+ `PHASE-2` for admin "Operasyon" scope semantics) |
| Copy cleanup / product labels | `FRONTEND` |
| Restore orphan entries (pilot ×2, kalite, haftalık), admin "Puanlama ve yayın" nav item | `FRONTEND` |
| Restore MFA reset approval queue | `EXISTING` |
| Restore Kişiler filters (rol/ürün/durum) | `EXISTING` |
| Kişiler "Koçlar" / "Personel" views, staff badges | `PHASE-1` (data exists; authoritative at enforce) |
| Command palette for all personas; permission-based commands | `EXISTING` (student/parent search new server fn) + `PHASE-1` (staff predicates) |
| OD student home (scoped), lists, details | `EXISTING` |
| Teacher OD pages | `EXISTING` |
| Yön student home `/panel/ogrenci/yon` | `EXISTING` data; plan presence depends on `adaptivePlan` rollout → `YON` |
| Planım list/week + task drawer actuals | `EXISTING` (verify write payload) / `YON` for missing student-writable fields |
| Goals property list | `EXISTING` |
| Coach home + student workspace + note lanes | `EXISTING` data, `PHASE-1` (`ok:coaching:write`, `ok:note:read_private`), `YON` for entry routing |
| Admin Yön queues + coach directory + assign drawer | `EXISTING` |
| DL student home/list/pre-start/result redesign | `EXISTING` |
| Runner visual redesign (single session) | `FRONTEND` |
| LGS session/break UI, session-locked answers | `DENEME` |
| AYT "Benim alanım" | `FRONTEND` if section codes stable, else `DENEME` |
| DL staff attention home | `EXISTING` + `PHASE-1`; "scoring failed" and "assigned without access" → `DENEME` |
| Exam workspace tabs | `EXISTING`; Oturumlar + grants tabs → `DENEME` |
| Operations Inbox (Yön/DL/Security groups) | `EXISTING` (new action codes); DL access group → `DENEME` |
| Student 360 regrouping + Etkinlik | `EXISTING`; permission-sensitive tabs `PHASE-1` |
| Product access objects with provenance | `EXISTING` |

### 20.3 Non-blocking rule

Design work never edits `lib/auth/guards.ts`, `lib/products/staff-*`, API route guards or Prisma schema. If a page needs a new read model, add a `*-server.ts` read function under `lib/panel`/`lib/kocum`/`lib/odk` using existing guards; any write needs a backend PR first.

---

## 21. Page-by-Page Redesign Matrix (every route)

Pattern: H = workspace home, L = list/table, D = detail, Q = queue, E = editor, R = report, S = settings, F = form, X = redirect/none. Phase = Design Phase (§22).

| Route | Pattern | Primary action | Data | Mobile | Risk | Phase |
|---|---|---|---|---|---|---|
| `/panel` | X | — | — | — | L | — |
| `/panel/urun-sec` | H (selector) | Panele gir | EXISTING | stacked cards | M | 1 |
| `/panel/ayarlar` | S | — | EXISTING | section list → page | L | 1 |
| `/panel/ayarlar/[section]` | S | Kaydet | EXISTING | sticky save | L | 1 |
| `/panel/bildirimler` | L | Tümünü okundu say | EXISTING | rows | L | 1 |
| `/panel/erisilebilirlik` | S | Kaydet | EXISTING | — | L | 1 |
| `/panel/veri-kullanimi` | S | Kaydet | EXISTING | — | L | 1 |
| `/panel/guvenlik` | S | MFA kur | EXISTING | — | M | 1 |
| `/panel/oturumlar` | L | Diğer oturumları kapat | EXISTING | rows | L | 1 |
| `/panel/parola` | F | Parolayı değiştir | EXISTING | — | L | 1 |
| `/panel/ogrenci` | H | Şimdi CTA | EXISTING | Şimdi first | M | 2 |
| `/panel/ogrenci/odevler` | L+drawer | Teslim et | EXISTING | rows, sheet | M | 2 |
| `/panel/ogrenci/takvim` | L | Derse katıl | EXISTING | rows | L | 2 |
| `/panel/ogrenci/takvim/[id]` | D | Derse katıl / Materyal | EXISTING | — | L | 2 |
| `/panel/ogrenci/materyaller` | L | İndir | EXISTING | rows | L | 2 |
| `/panel/ogrenci/tekrar` | Q | Yanıtla | EXISTING | rows | L | 2 |
| `/panel/ogrenci/telafi` | Q | Tamamla | EXISTING | rows | L | 2 |
| `/panel/ogrenci/analiz` | R | Haftalık hedefi ayarla | EXISTING | — | L | 2 |
| `/panel/ogrenci/denemeler` | L+F | Deneme ekle | EXISTING | form sheet | L | 2 |
| `/panel/ogrenci/gelisim` | X | — | — | — | L | — |
| `/panel/ogrenci/dino` | page | Sor | EXISTING | full | L | 2 |
| `/panel/ogrenci/profil` | X (deprecate) | — | — | — | L | 2 |
| `/panel/ogrenci/check-in` | F | Gönder | EXISTING | sticky submit | L | 3 |
| `/panel/ogrenci/haftalik` | R | — | EXISTING | — | L | 3 |
| **new** `/panel/ogrenci/yon` | H | Görevi tamamla | EXISTING / YON | checklist first | M | 3 |
| `/panel/ogrenci/plan` | E (list/week) | Değişiklik iste / Planı oluştur | EXISTING / YON | list only | H | 3 |
| `/panel/ogrenci/hedefler` | D (properties) | — | EXISTING | stacked | L | 3 |
| `/panel/ogrenci/kocluk` | D | Görüşmeye katıl | EXISTING | — | L | 3 |
| `/panel/odk/ogrenci` | H | Denemeye git | EXISTING | — | L | 4 |
| `/panel/odk/ogrenci/denemeler` | L | Aç / Devam et | EXISTING | rows | L | 4 |
| `/panel/odk/ogrenci/denemeler/[id]` | D (pre-start) | Denemeyi Başlat | EXISTING | sticky CTA | M | 4 |
| `/panel/odk/ogrenci/denemeler/[id]/coz` | runner | Teslim et | EXISTING (+DENEME sessions) | toggle | H | 4 |
| `/panel/odk/ogrenci/denemeler/[id]/sonuc` | R | Sonraki adım | EXISTING | wrap | M | 4 |
| `/panel/ogretmen` | H | Ders alanını aç | EXISTING | — | M | 2 |
| `/panel/ogretmen/takvim` | L/week | — | EXISTING | list | L | 2 |
| `/panel/ogretmen/ders/[id]` | E | Dersi kapat | EXISTING | tabs | H | 8* |
| `/panel/ogretmen/odevler` | L+drawer | Ödev oluştur | EXISTING | rows | M | 2 |
| `/panel/ogretmen/gruplar` | L | — | EXISTING | scroll | L | 2 |
| `/panel/ogretmen/ogrenci/[id]` | D (360) | contextual | EXISTING/PHASE-1 | tabs scroll | M-H | 6 |
| `/panel/ogretmen/materyaller` | L | Materyal yükle | EXISTING | rows | L | 2 |
| `/panel/ogretmen/tekrar` | L | Tekrar oluştur | EXISTING | rows | L | 2 |
| `/panel/ogretmen/telafi` | L | Paket oluştur | EXISTING | rows | L | 2 |
| `/panel/ogretmen/analiz` | R | — | EXISTING | — | L | 2 |
| `/panel/ogretmen/denemeler` | R | — | EXISTING | — | L | 2 |
| `/panel/ogretmen/ai-yardimci` | L+drawer | Taslak oluştur | EXISTING | — | L | 2 |
| **new** `/panel/ogretmen/yon` | H | Hazırlığa başla | EXISTING / PHASE-1 / YON | — | M | 3 |
| **new** `/panel/ogretmen/yon/ogrenciler` | L | — | EXISTING | scroll | L | 3 |
| **new** `/panel/ogretmen/yon/gorusmeler` | L | Görüşme planla | EXISTING | rows | L | 3 |
| `/panel/ogretmen/plan` | Q (batch desk) | Onayla | EXISTING | rows + drawer | H | 3 |
| `/panel/ogretmen/hazirlik/[id]` | D (workspace) | Görüşmeyi kaydet | EXISTING / PHASE-1 | tabs | M-H | 3 |
| `/panel/ogretmen/yardim` | Q | Yanıtla | EXISTING | rows | L | 3 |
| `/panel/ogretmen/mudahale` | Q | Müdahale oluştur | EXISTING | rows | L | 3 |
| `/panel/ogretmen/ozetler` | Q | Yayınla | EXISTING | rows | L | 3 |
| `/panel/odk/ogretmen` | H | — | EXISTING | — | L | 5 |
| `/panel/odk/ogretmen/raporlar` | R/L | — | EXISTING | scroll | L | 5 |
| `/panel/odk` | X | — | — | — | L | — |
| `/panel/odk/yonetim` | H/Q | per permission | EXISTING/PHASE-1/DENEME | — | M | 5 |
| `/panel/odk/yonetim/sinavlar` | L | Yeni deneme | EXISTING | scroll | L | 5 |
| `/panel/odk/yonetim/sinavlar/[id]` | D (tabs) + E | lifecycle action | EXISTING (+DENEME tabs) | tabs scroll | H | 5 |
| `/panel/odk/yonetim/operasyon` | Q (dense) | — | EXISTING | scroll | M | 5 |
| `/panel/odk/yonetim/sonuclar` | Q | Puanla / Yayınla | EXISTING | scroll | L | 5 |
| `/panel/odk/yonetim/raporlar` | R | Dışa aktar | EXISTING | scroll | L | 5 |
| `/panel/odk/yonetim/paketler` | L | — | EXISTING | scroll | L | 5 |
| `/panel/odk/yonetim/pilot` | D | Pilot oluştur | EXISTING | — | L | 6 |
| `/panel/veli` | H | — | EXISTING | — | L | 7 |
| `/panel/veli/analiz` | R | — | EXISTING | — | L | 7 |
| `/panel/veli/haftalik` | R | Geri bildirim | EXISTING | — | L | 7 |
| `/panel/veli/takvim`, `/odevler`, `/ogretmenler` | L | — | EXISTING | rows | L | 7 |
| `/panel/veli/denemeler` | R | — | EXISTING | — | L | 7 |
| `/panel/veli/kocluk` | H (Yön) | — | EXISTING | — | M | 7 |
| `/panel/veli/dino` | page | Sor | EXISTING | — | L | 7 |
| `/panel/veli/hesap` | S | Paket görüşmesi iste | EXISTING | — | L | 7 |
| `/panel/veli/takip`, `/panel/veli/bildirimler` | X | — | — | — | L | — |
| `/panel/odk/veli`, `/panel/odk/veli/raporlar` | H / R | — | EXISTING | — | L | 7 |
| `/panel/yonetim` | Q (Inbox) | row actions | EXISTING (+DENEME) | rows | M | 6 |
| `/panel/yonetim/mudahale` | Q | Müdahale oluştur | EXISTING | rows | L | 6 |
| `/panel/yonetim/isler` | Q/L | row actions | EXISTING | scroll | M | 6 |
| `/panel/yonetim/basvurular` | L | Hesap aç | EXISTING | scroll | M | 6 |
| `/panel/yonetim/kisiler` | L (views) | Yeni kişi | EXISTING/PHASE-1 | scroll | M | 6 |
| `/panel/yonetim/kullanicilar` | X (redirect stays) | — | — | — | — | 6 (port features) |
| `/panel/yonetim/kullanicilar/[id]` | D (tabs) | contextual | EXISTING/PHASE-1 | tabs | H | 6 |
| `/panel/yonetim/ogrenciler` | L → view | — | EXISTING | scroll | M | 6 |
| `/panel/yonetim/ogrenciler/[id]` | D (360) | Öğrenci panelini gör | EXISTING | tabs | M-H | 6 |
| `/panel/yonetim/veliler` | L → view | Veli bağla | EXISTING | scroll | M | 6 |
| `/panel/yonetim/egitmenler` | L → view | — | EXISTING | scroll | L | 6 |
| `/panel/yonetim/egitim` | tabs (L+F) | Grup oluştur | EXISTING | — | M | 2 |
| `/panel/yonetim/gruplar/[id]` | D | Öğrenci ekle | EXISTING | tabs | H | 8* |
| `/panel/yonetim/takvim` | L/week | Ders planla | EXISTING | list | L | 2 |
| `/panel/yonetim/kocluk` | Q + L | Koç ata | EXISTING | rows | M | 3 |
| `/panel/yonetim/kazanimlar` | E | Sürüm oluştur | EXISTING | — | L | 2 |
| `/panel/yonetim/denemeler` | R | — | EXISTING | — | L | 2 |
| `/panel/yonetim/siparisler` | L | — | EXISTING | scroll | L | 6 |
| `/panel/yonetim/siparisler/[id]` | D | Erişimi yeniden dene | EXISTING | — | M | 6 |
| `/panel/yonetim/analitik`, `/[metric]` | R | Dışa aktar | EXISTING | — | L | 6 |
| `/panel/yonetim/raporlar` | R | Dışa aktar | EXISTING | — | L | 6 |
| `/panel/yonetim/kayitlar` | L | — | EXISTING | scroll | L | 6 |
| `/panel/yonetim/ozellikler` | L | — | EXISTING | — | L | 6 |
| `/panel/yonetim/kalite` | R | — | EXISTING | — | L | 6 |
| `/panel/yonetim/pilot` | D | Kohort oluştur | EXISTING | — | L | 6 |
| `/panel/yonetim/isletme/*` | (own system) | — | — | — | L | shell only, 1 |

`8*` = high-risk RSC/structural refactors scheduled in the polish phase after visual consistency is achieved through primitives.

---

## 22. Migration Phases

Each phase = several small PRs; each PR keeps every route working and is revertible. No PR mixes logic changes with visual changes in the exam runner, results release, or permission-sensitive views.

### Design Phase 0 — Foundations & safety net (FRONTEND, can start now)

1. Visual regression baseline: Playwright screenshots for every route in §21 × personas (seeded via existing E2E helpers) at 390/1024/1440; store as CI artifacts (not blocking until Phase 1 lands).
2. Functional inventory test: generate a JSON of nav hrefs per persona/scope and the action-component list from §19 as a checklist file (`docs/panel-preservation-checklist.md` or test fixture) that PRs must keep green.
3. Panel token layer `.pn-scope` + Tailwind aliases; product accent tokens; density attribute. No visual change yet (tokens unused).
4. `status-vocabulary.ts` + `StatusBadge`; copy fixes §19.7 (labels only; keep `productLabel()` callers outside panel unchanged or add `productDisplayName`).
5. Restore lost/orphan entries: admin "Puanlama ve yayın"; Sistem ▸ Kontrollü yayın (both pilots), Kalite; student "Haftalık özet"; **MFA reset approval queue** rendered on `/panel/yonetim/kisiler` (temporary section) — highest-value safety fix.

### Design Phase 1 — Shell, navigation, primitives (FRONTEND + EXISTING; coordinate with backend Phase 2)

PanelShell restructure (sidebar, workspace switcher, context bar, breadcrumbs, banners), new nav model (§7) with tests, Ayarlar hub consolidation, `CommandMenu` for all personas (role predicates first; staff predicates once Phase 1 enforce is scheduled), primitives (§18.2) with stories, `PageHeader` codemod across ~68 files (purely presentational), `EmptyState`, `Section`, `loading.tsx`/`error.tsx` per workspace segment. Canvas switches to white here — the biggest visual change, so it must land with the header/section primitives to avoid "white cards on white".

### Design Phase 2 — Student OD + Teacher OD + Admin OD education pages (EXISTING)

Student Bugün (scope-aware), Dersler, Ders detayı, Çalışmalar (drawer), Kaynaklar, Tekrar & telafi, Gidişatım, Dış denemelerim; teacher home, lists, tables; admin Eğitim tabs, Takvim, Kazanımlar. (Teacher lesson workspace and Group 360 deferred to Phase 8.)

### Design Phase 3 — Yön (student + coach + admin Yön + parent Yön) (EXISTING + PHASE-1 + YON)

Student Yön Bugün (new route + nav `today` rewrite for OK scope), Planım list/week + drawers, Hedeflerim, Koçum, Check-in, Haftalık özet; coach home (new), Öğrencilerim, Görüşmeler, student workspace tabs + note lanes, batch plan desk; admin Yön queues + directory + assign drawer. Requires: `effectiveStaffPermissions` read for coach UI (available), product decision on `adaptivePlan`; entry-path switch to coach home lands with backend Phase 3.

### Design Phase 4 — Deneme Ligi student (EXISTING; sessions = DENEME)

DL Bugün, Denemelerim, pre-start, result (+ AYT track tabs), crossover rows; runner **visual-only** PR behind frozen E2E. LGS session/break UI ships with backend Deneme phase.

### Design Phase 5 — Deneme Ligi staff (EXISTING + PHASE-1; grants/sessions = DENEME)

Unified staff home, Denemeler table with role default views, create dialog, exam workspace tabs (split `AdminExamEditor`), readiness rail, live ops console, Puanlama ve yayın queue, reports, packages.

### Design Phase 6 — Admin operations, People & Access, Student 360 (EXISTING + PHASE-1)

Operations Inbox (new codes for Yön/DL/Security), Kişiler & Erişim views (port filters, Koçlar/Personel views), user detail tabs, product access objects, orders, activation desk, signups, system pages; Student 360 regrouping (both personas) with alias map.

### Design Phase 7 — Parent

Parent homes per workspace, child selector in header, read-only tables, DL calm reports.

### Design Phase 8 — Polish, heavy refactors, responsive, accessibility

Teacher lesson workspace (tabs + RSC split), Group 360 RSC split, `mock-exam-workspace` split, remove legacy CSS classes and `site-scope` from panel, density audit, reduced-motion audit, 320–1440 sweep, axe zero-violation gate, performance budget (§65).

**Ordering rationale vs. the brief:** unchanged except (a) the safety restorations move into Phase 0, (b) Student 360 moves to Phase 6 with admin because it is shared by admin/teacher and depends on permission-aware tabs, (c) the two largest client components move to Phase 8 so early phases stay low-risk.

**What can happen before backend Phase 1 enforce:** Phases 0, 1 (without staff command predicates), 2, 4 (minus sessions), 7, and the visual parts of 3/5/6. **What must wait for enforce:** permission-sensitive visibility in Student 360 Yön notes, coach-only nav correctness, DL staff command predicates, Kişiler "Personel" view as an authority signal. **Waits for Yön phase:** coach home as default entry, `adaptivePlan` production rollout, student-writable task actuals beyond current API, student-initiated suggestions/reschedule. **Waits for Deneme phase:** LGS sessions/break/locked sessions, grants tab and "assigned without access", scoring failure state.

---

## 23. Files Affected by Phase

### Phase 0
* `app/globals.css` (add `.pn-scope` token block; no removals)
* `lib/panel/status-vocabulary.ts` (new), `components/panel/ui/status-badge.tsx` (new)
* `lib/auth/roles.ts` (add `productDisplayName`), copy files listed in §19.7
* `lib/panel/navigation.ts` (+ `navigation.test.ts`): add `odk-results` to admin, `haftalik` to student, Sistem items `pilot`, `odk-pilot`, `kalite`
* `app/panel/yonetim/kisiler/page.tsx` (temporary MFA-reset approval section reusing `ApproveMfaResetButton` and the query from `app/panel/yonetim/kullanicilar/page.tsx:175`)
* `tests/e2e/visual/*.spec.ts` (new), `playwright.config.ts` (project for visual)

### Phase 1
* `components/panel/panel-shell.tsx`, `panel-nav.tsx`, `panel-mobile-nav.tsx`
* `components/panel/workspace-switcher.tsx`, `context-bar.tsx`, `breadcrumbs.tsx`, `sidebar.tsx` (new)
* `components/panel/admin-command-search.tsx` → `command-menu.tsx`; `lib/panel/global-search.ts`, `global-search-server.ts`, `app/api/panel/admin-search/route.ts` (read-only, scoped student search)
* `components/panel/ui.tsx` (barrel), `components/panel/ui/*` (new primitives), `components/panel/panel-page-header.tsx`, `admin-page-header.tsx` (deprecated wrappers)
* 68 header call sites (codemod) across `app/panel/**`
* `app/panel/**/loading.tsx`, `error.tsx` (new per workspace: `ogrenci`, `veli`, `ogretmen`, `odk`)
* `app/panel/ayarlar/page.tsx` (hub links), `components/account/settings/*`
* `stories/panel-primitives.stories.tsx`, `stories/panel-table.stories.tsx`

### Phase 2
* `app/panel/ogrenci/{page,odevler,takvim,takvim/[id],materyaller,tekrar,telafi,analiz,denemeler,dino,profil}/page.tsx`
* `components/panel/student/*`, `student-assignment-list.tsx`, `student-review-queue.tsx`, `student-recovery-packages.tsx`, `analiz/*`, `mock-exam-workspace.tsx` (styling only), `od-start-card.tsx`, `no-product-access.tsx`
* `lib/panel/student-home-actions.ts` (scope filter helper only), `student-home-server.ts` (no query changes unless needed)
* `app/panel/ogretmen/{page,takvim,odevler,gruplar,materyaller,tekrar,telafi,analiz,denemeler,ai-yardimci}/page.tsx`, `components/panel/teacher-*.tsx` (except lesson workspace)
* `app/panel/yonetim/{egitim,takvim,kazanimlar,denemeler}/page.tsx`, `components/panel/{education-management,admin-learning-forms,admin-setup-wizard,curriculum-manager}.tsx`

### Phase 3
* **new** `app/panel/ogrenci/yon/page.tsx`; `app/panel/ogrenci/{plan,hedefler,kocluk,check-in,haftalik}/page.tsx`
* `components/panel/student-adaptive-plan/*` (split), `coaching-sessions.tsx`, `coaching-session-controls.tsx`, `student-check-in-form.tsx`, `calm-digest-card.tsx`
* **new** `app/panel/ogretmen/yon/{page,ogrenciler/page,gorusmeler/page}.tsx`; `app/panel/ogretmen/{plan,hazirlik/[id],yardim,mudahale,ozetler}/page.tsx`
* `components/panel/kocum/*`, `coach-attention.tsx`, `teacher-plan-review.tsx`, `teacher-help-requests.tsx`, `intervention-*.tsx`, `teacher-digest-review.tsx`
* **new** `lib/kocum/coach-workspace-server.ts` (read model), `lib/kocum/visibility.ts` (reuse only)
* `app/panel/yonetim/kocluk/page.tsx` (+ `actions.ts` untouched), **new** `components/panel/coach-assign-drawer.tsx`
* `app/panel/veli/kocluk/page.tsx`
* `lib/panel/navigation.ts` (OK scope `today` → `/panel/ogrenci/yon`, coach items), `lib/products/product-entry.ts` (only with backend Phase 3)

### Phase 4
* `app/panel/odk/ogrenci/{page,denemeler/page,denemeler/[id]/page,denemeler/[id]/sonuc/page,denemeler/[id]/coz/page}.tsx`
* `components/odk/{odk-home,student-exam-start,student-exam-runner}.tsx` (runner: layout only)
* **new** `components/odk/student/*` (next-exam block, results table, result sections), `components/panel/next-step-row.tsx`
* `lib/odk/presentation.ts` (merge into status vocabulary), `lib/odk/result-next-step.ts` (entitlement resolution only if needed)

### Phase 5
* `app/panel/odk/yonetim/{page,sinavlar/page,sinavlar/[id]/page,operasyon/page,sonuclar/page,raporlar/page,paketler/page}.tsx`
* `components/odk/{odk-staff-home,admin-exam-create,admin-exam-editor (split),admin-assignment-panel,admin-preview-panel,admin-results-review-panel,admin-integrity-review-panel,admin-json-import-panel,odk-operations-refresh,odk-status-badge,audience-reports}.tsx`
* **new** `lib/odk/staff-home-server.ts` (attention read model), `lib/odk/exam-history-server.ts`
* `lib/products/staff-permission-matrix.ts` — **read only** (module labels may move to copy file)

### Phase 6
* `app/panel/yonetim/{page,kisiler,kullanicilar/[id],ogrenciler,ogrenciler/[id],veliler,egitmenler,basvurular,siparisler,siparisler/[id],isler,mudahale,analitik,analitik/[metric],raporlar,kayitlar,ozellikler,kalite,pilot}/page.tsx`, `app/panel/odk/yonetim/pilot/page.tsx`
* `components/panel/{admin-operations-center,create-user-form,user-bulk-operations,user-row-actions,mfa-reset-controls,admin-product-access-form,admin-staff-responsibilities-form,admin-user-profile-form,archive-user-action,teacher-offboarding-form,student-parent-link-form,student-teacher-link-form,relationship-*,order-link-form,od-onboarding-control,lead-status-control,email-retry-button,signups/*,pilot-rollout-control}.tsx`, `components/odk/odk-pilot-control.tsx`
* `lib/panel/admin-operations-center.ts` (+ `-server.ts`, test: new codes), `lib/panel/user-filters.ts`
* `components/panel/student-360/*`, `lib/panel/student-360.ts`, `lib/panel/student-360/{policy,queries,dto,index}.ts` (tab regrouping + alias), `app/panel/ogretmen/ogrenci/[id]/page.tsx`
* `stories/student-360-panels.stories.tsx`

### Phase 7
* `app/panel/veli/**/page.tsx`, `app/panel/odk/veli/**`, `components/panel/{parent-calm-home,parent/child-switcher}.tsx`, `components/odk/audience-reports.tsx`, `lib/panel/parent-calm*.ts` (presentation only)

### Phase 8
* `components/panel/teacher-lesson-workspace.tsx`, `app/panel/ogretmen/ders/[id]/page.tsx`, `components/panel/group-360-view.tsx`, `group-management-detail.tsx`, `app/panel/yonetim/gruplar/[id]/page.tsx`, `components/panel/mock-exam-workspace.tsx`
* `app/globals.css` (remove panel usage of `panel-surface`, `panel-card`, `panel-quick-action`, `panel-primary-button`, `site-btn` in panel scope; keep public), `components/panel/panel-shell.tsx` (drop `site-scope`)

---

## 24. Test Strategy

| Layer | What | Where |
|---|---|---|
| Functional regression | Every capability in §19 has at least one E2E assertion (button exists for authorized persona and performs the mutation). Start from existing specs: `panel-experience`, `coaching-experience`, `kocum-lifecycle`, `odk-exam-flow`, `odk-product-quality`, `admin-bulk-and-search`, `lesson-day`, `self-signup`, `phase0-security`, `permission-matrix`, `panel-access`. Add: MFA reset approval, product access provenance untouched, staff responsibility grant/revoke, coach assign with capacity override, release flow with step-up. | `tests/e2e/*` |
| Navigation | Per persona × workspace: nav items equal an approved snapshot; ≤8 primary items; no dead links (`panelNavHrefs` + HTTP 200 for each); orphan routes have an entry. | `lib/panel/navigation.test.ts`, new `tests/e2e/panel-navigation.spec.ts` |
| Permission behaviour | For each hidden item: UI absent **and** direct URL → 404/redirect for unauthorized personas, in both `shadow` and `enforce` modes (CI matrix env `STAFF_PRODUCT_ASSIGNMENTS`). Student/parent never see INTERNAL notes or `privateNote`. Answer key never in non-editor payloads. | `permission-matrix.spec.ts`, `phase0-security.spec.ts`, new `phase1-staff-ui.spec.ts` |
| Visual regression | Screenshots per route × persona at 390/1024/1440 (+320/768 for homes, runner, result); threshold-based diff; reviewed per phase. | new `tests/e2e/visual/` |
| Accessibility | axe on every page type and drawer/dialog state; keyboard walkthrough for shell, ⌘K, drawers, tables, runner; text-scale 112.5%; reduced motion. | `panel-accessibility.spec.ts`, `tests/storybook/a11y.spec.ts` |
| Components | Storybook stories for every primitive and state (empty/loading/error/dense) | `stories/*` |
| Unit | status vocabulary exhaustiveness over Prisma enums; Student 360 alias map; coach workspace read-model ranking; inbox codes | `lib/**/*.test.ts` |
| Performance | Bundle size budget per route (Next build output), RSC vs client count tracked; runner interaction latency unchanged | CI step |
| Cross-browser | `panel-cross-browser.spec.ts` for shell + runner (Safari iPad critical for LGS) | existing |

Critical workflows to keep green (brief §64): Student login → select product → lesson → assignment → Yön plan → coaching → Deneme start → exam → result; Parent child selection → OD overview → Yön summary → Deneme report; Teacher group → student → assignment → lesson; Coach attention queue → student → plan → session → note; DL staff create exam → content → schedule → assign → live ops → score → release; Admin user → product access → staff responsibility → coach assignment → orders → operations.

---

## 25. What NOT to Change

* Global roles `ADMIN/TEACHER/STUDENT/PARENT`; no COACH or staff role becomes a `UserRole`.
* `ProductStaffAssignment`, staff permission matrix, `decideStaffPermission`, ADMIN break-glass, MFA/step-up rules.
* Server guards in pages and APIs; menus/commands remain non-authoritative.
* `activeProduct` as presentation only; internal codes `OD/OK/ODK`.
* `MockExam` (external) vs `OdkExam` (Deneme Ligi) separation — the UI labels them "Dış denemeler / Okul ve kurum denemeleri" vs "Deneme Ligi".
* Deneme Ligi engine: attempt domain, scoring, timings, integrity, release/publication, answer-key revisions, import pipelines.
* Yön models (`WeeklyPlan*`, `CoachAssignment`, `CoachingSession`, `CoachNote`, `StudentGoal`, check-ins, help requests) and their visibility rules.
* Route URLs (new routes are additive; existing deep links, notification links and tab params stay valid via aliases).
* İşletme workspace internals; public marketing styles and `dc-*` foundation tokens.
* Product event names/properties (`student_next_action_*` etc.) and analytics definitions.
* Offline sync, accessibility preference, and admin preview mechanisms.

---

## 26. Final Target Sitemap

```text
Panel
├─ Workspace switcher: onlinedershanem. · Yön Koçluk · Deneme Ligi · [Operasyon]* · [İşletme]*
├─ Global: Ara (⌘K) · Bildirimler · Ayarlar (Profil, Eğitim, Çocuklar, İletişim, Fatura, İzinler,
│          Bildirim tercihleri, Erişilebilirlik, Veri kullanımı, Güvenlik, Oturumlar, Parola) · Dino
│
├─ STUDENT
│  ├─ onlinedershanem.: Bugün · Dersler(›detay) · Çalışmalar · Kaynaklar · Tekrar & telafi · Gidişatım(›Dış denemelerim)
│  ├─ Yön Koçluk:       Bugün(new) · Planım(Liste|Hafta) · Hedeflerim · Koçum · Check-in · Haftalık özet
│  └─ Deneme Ligi:      Bugün · Denemelerim(›ön-başlangıç › çözüm › sonuç) · Sonuçlarım · Gelişimim
├─ PARENT
│  ├─ onlinedershanem.: Genel bakış · Dersler · Ödevler · Öğretmenler · Akademik gelişim · Haftalık özet
│  ├─ Yön Koçluk:       Genel bakış (kocluk) · Bu hafta · Koç notları
│  ├─ Deneme Ligi:      Genel bakış · Raporlar
│  └─ Hesap ve paket
├─ TEACHER (OD)
│  └─ Bugün · Dersler(›Ders alanı) · Çalışmalar · Öğrenciler(›Öğrenci 360) · Takip(Tekrar, Telafi, Analiz, Dış denemeler) · Kaynaklar(›AI yardımcı)
├─ COACH (Yön)
│  └─ Bugün(new) · Öğrencilerim(new, ›Öğrenci çalışma alanı) · Planlar · Görüşmeler(new) · Yardım istekleri · Haftalık özetler · Müdahaleler
├─ DENEME LİGİ STAFF (by permission)
│  └─ Bugün · Denemeler(›Exam workspace: Genel, İçerik, Sorular, Oturumlar†, Zamanlama, Katılımcılar, Önizleme, Canlı, Puanlama & yayın, Bütünlük, Raporlar, Geçmiş)
│     · Canlı operasyon · Puanlama ve yayın · Sonuç raporları · Paketler · (Öğrenci raporları for REPORT_VIEWER)
└─ ADMIN
   ├─ Operasyon*: Gelen kutusu · Kişiler & Erişim(Tümü, Öğrenciler, Veliler, Öğretmenler, Koçlar, Personel, Yeni kayıtlar ›Kişi detayı/Öğrenci 360)
   │              · Siparişler · Aktivasyon · Müdahaleler · Sistem(Analitik, Raporlar, İşlem geçmişi, Özellikler, Kontrollü yayın, Kalite)
   ├─ onlinedershanem.: Eğitim(Gruplar ›Grup 360, Ders planlama, Ödevler, Materyaller) · Takvim · Kazanımlar · Dış deneme analizi
   ├─ Yön Koçluk: Koçluk operasyonu (kuyruklar, koç dizini)
   └─ Deneme Ligi: staff tree (all modules)
* ADMIN / business-assigned only   † DENEME phase
```

---

## 27. Final Visual Architecture

```text
┌──────────────────────────────── .pn-scope [data-product=yon] [data-density=standard] ───────────────────────────────┐
│ SIDEBAR  240px  bg --pn-sidebar          │ CONTEXT BAR 48px  bg --pn-canvas  border-b --pn-border                    │
│ ┌──────────────────────────────┐         │  ☰(<1024)  Yön Koçluk / Öğrencilerim / Taha Berk        ⌘K   🔔(<1024)  ⋯ │
│ │ ▣ Yön Koçluk            ▾    │ ←switch ├──────────────────────────────────────────────────────────────────────────── │
│ │   Zeynep Aksoy               │         │ BANNERS (preview / teacher mode / offline / completion)                    │
│ └──────────────────────────────┘         ├──────────────────────────────────────────────────────────────────────────── │
│  🔍 Ara                     ⌘K           │ PAGE HEADER                                                                 │
│  🔔 Bildirimler              3           │   Taha Berk                                     [Görüşmeyi kaydet]  ⋯      │
│ ─────────────────────────────           │   12. sınıf · YKS SAY · Yön aktif · Veli: Ayşe B.                           │
│ ▌● Bugün            (accent bar)        │   [Özet] [Plan] [Görüşmeler] [Notlar] [Deneme Ligi] [Yardım]                 │
│    Öğrencilerim                         │ ──────────────────────────────────────────────────────────────────────────── │
│    Planlar                    2         │ CONTENT (max-w by type; Sections separated by rules, not cards)             │
│    Görüşmeler                           │   Hedef        TYT Mat 30 net · şu an 24                                    │
│    Yardım istekleri           1         │   Bu hafta     9/14 görev · %64 uyum ▂▃▅▆                                   │
│    Haftalık özetler                     │   Son check-in Enerji 3/5 · Engel: zaman                                    │
│    Müdahaleler                          │   ───────────                                                               │
│ ─────────────────────────────           │   Sıradaki adım  ………                                     [Plan önerisi]     │
│  ✦ Dino'ya sor                          │                                                                ┌─────────┐ │
│  ⚙ Ayarlar                              │                                                                │ DRAWER  │ │
│  (ZA) Zeynep Aksoy           ⋯          │                                                                │ 480px   │ │
└─────────────────────────────────────────┴────────────────────────────────────────────────────────────────┴─────────┘
Accent (--pn-accent) appears ONLY in: active nav bar/icon, workspace mark, badges, markers, charts, selected rows.
Primary buttons: ink (#14201C) on white text in every workspace. Status colours are semantic and product-independent.
Exam runner and live ops render outside this frame (runner) or with data-density=dense (ops).
```

---

## Answers to the 25 required questions

1. **Global shell:** 240px collapsible gray sidebar (workspace switcher on top, global Ara/Bildirimler, 5–8 workspace items, Dino/Ayarlar/account at bottom) + white canvas with a 48px breadcrumb context bar and an in-content `PageHeader` (§6, §27).
2. **Sidebar per product:** exact lists in §7.1–§7.6.
3. **Merge:** OD Tekrar + Telafi (tabbed); `ogrenciler`/`veliler`/`egitmenler`/dead `kullanicilar` list into Kişiler views; ADMIN `OdkHome` + `OdkStaffHome`; exam detail panels into one tabbed workspace; Student 360's 11 tabs into 6–7; Şimdi/Sonra/Bugünün tamamı into Şimdi + one Bugün list; account pages (bildirim tercihleri, erişilebilirlik, veri, güvenlik, oturumlar, parola) under Ayarlar; coach per-student desk into the coach student workspace; ops "Operasyon/Provisioning/merkez" into Gelen kutusu + two secondary pages.
4. **Separate:** exam runner; live operations console; Puanlama ve yayın queue; user detail vs Student 360 (identity/access vs learning); Planım vs Bugün (Yön); Group 360; İşletme workspace; product selector page (also reachable via switcher).
5. **OD student first view:** "Şimdi" next action (existing engine), then today's lessons/assignments list, a one-line week strip, and one-line signals for their other products (§9.1).
6. **Yön student first view:** today's plan checklist with targets, next coach meeting, weekly progress, latest visible coach note, goals, check-in state (§10.1).
7. **Deneme Ligi student first view:** the next exam object with its state and CTA, recent results table, own-history trend, top weak topics with entitlement-aware actions (§11.1).
8. **Coach home:** today's sessions table, a grouped "Dikkat bekleyenler" queue (plan approval, no plan, overdue session, missing check-in, open help, low adherence, post-exam suggestions, reschedule proposals), and an Öğrencilerim table (§10.5).
9. **DL operator home:** attention rows for exams needing scheduling/assignment, today's live exam counters linking to Canlı operasyon, integrity reviews pending, upcoming exams table — only rows the operator's permissions allow (§11.8).
10. **Admin home:** Operations Inbox grouped Kritik/Aksiyon/İzle with product tags (OD, Yön, DL, Commerce, Security, System), inline/drawer actions, health line, one text line of today's numbers (§13).
11. **Student 360:** header + property block; tabs Genel (incl. Bugün, relations) · Öğrenme · Yön · Deneme Ligi · Etkinlik · Risk & müdahale · Hesap & paket, permission-filtered, with alias map for old tabs (§12).
12. **Tables:** all list pages in §8.2 (people, orders, exams, results, attempts, assignments, coach students, coach directory, rosters, lessons, materials, audit, packages, result subjects/questions).
13. **Cards:** only Şimdi next-action, object sets with identity (coach card, membership objects, packages, next exam block), and readiness/attention groups (§8.3).
14. **Drawers:** student/user quick preview, plan task, coach note/session record, coach assignment, exam preview, attempt/integrity, order quick view, help reply, access grant (§8.4).
15. **Full pages:** homes, Student 360, user detail, exam workspace, weekly plan, coach student workspace, live ops, result, Group 360, lesson workspace, order detail (§8.4).
16. **Global search:** one `CommandMenu`; server-side, permission-filtered entity search per persona — staff (students, parents, teachers, groups, lessons, orders, leads, exams as today) and students (own lessons, assignments, materials, plan tasks, exams, new scoped server function); statuses translated; recents kept (§8.7).
17. **Command palette:** yes — it already exists for ADMIN/TEACHER; extend to all personas and switch to permission predicates (`PHASE-1`), never as the only navigation path.
18. **Mobile navigation:** left drawer with the full sidebar; sticky context bar; bottom tab bar (4 + Menü) only for student and parent; staff rely on drawer + sticky page actions (§6.5, §16).
19. **Functions at risk:** MFA reset approval queue (already unreachable), Kişiler filters (already unreachable), orphan pilot/quality/profile/digest entries, answer-key-only-for-editors gating during exam tab split, release/rescore step-up flows, coach note visibility lanes, adaptive plan request-change/prefs, lesson quick-close, Group 360 membership edits, product event tracking on student home, offline sync/admin preview in the new shell, Student 360 deep links (§19).
20. **Safest sequence:** Phase 0 safety net + restorations → 1 shell/primitives → 2 OD → 3 Yön → 4 DL student → 5 DL staff → 6 admin/people/360 → 7 parent → 8 heavy refactors/polish (§22).
21. **Before backend Phase 1 enforce:** Phases 0, 1 (role-based commands), 2, 4 (single-session), 7, and visual-only parts of 3/5/6.
22. **Must wait for staff permission enforce:** permission-filtered Student 360 Yön/private notes, coach-only nav/entry correctness, DL staff command predicates and staff home rows as authority, Kişiler "Personel" view as a source of truth.
23. **Depends on Yön backend:** coach home as default OK entry, `adaptivePlan` production rollout (plan-centric student home), extra student-writable task fields, student-initiated reschedule/suggestions, adherence thresholds as product policy.
24. **Depends on Deneme session/grant changes:** LGS Sözel/break/Sayısal UI and locked sessions, exam "Oturumlar" tab, grants in "Katılımcılar" and "assigned without access" alerts, persisted scoring-failure alerts.
25. **Notion-inspired, not a clone:** borrow structure (quiet sidebar, page = title + properties + body, database tables with views, breadcrumbs, side peek, ⌘K) but keep our identity — Manrope, our product accents used sparingly, education-specific objects and statuses, Turkish role-specific voice, Dino as contextual helper, reliability-first exam/ops screens, and no Notion artefacts (emoji icons, covers, free-form blocks, Notion palette) (§4).
