# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Panel design roadmap (`docs/panel-design-roadmap.md`): inventory of every panel route and capability, a functionality preservation matrix, the Notion-inspired design system, per-persona navigation and a phased migration plan
- Panel token layer (`.pn-scope` in `app/globals.css`) with neutral surfaces, semantic status tones and product accents (onlinedershanem. green, Yön Koçluk blue, Deneme Ligi purple) selected by `data-product` on the panel shell; additive, no visual change yet
- `lib/panel/status-vocabulary.ts`: one source for user, order payment, readiness, plan-suggestion and Deneme Ligi exam status labels
- Panel shell (Design Phase 1): a calm gray sidebar with a workspace switcher (onlinedershanem. / Yön Koçluk / Deneme Ligi / İşletme, using the same `/api/panel/active-product` selection as the product selector), Bildirimler with an unread count, and a bottom block for Ayarlar, the business workspace and the account; a 48px context bar with a breadcrumb; a white workspace canvas
- Panel-wide error boundary (`app/panel/error.tsx`) with retry, a way home and the error code; the loading skeleton matches the new shell
- Command menu (⌘K / Ctrl+K) for every panel user: commands are filtered by role, feature flag, business permission and product staff permissions (so a Deneme Ligi operator or Yön coach sees their workspace commands), page commands come from the user's own menu, and record search stays admin/teacher-only
- Hide/show the desktop sidebar (button or ⌘\ / Ctrl+\); the choice is remembered in a cookie and applied on first render
- Panel primitives (`Section`, `EmptyState`, `StatusBadge`, `PropertyList`/`PropertyRow`, `List`/`ListRow`, `ViewTabs`, `Button`/`ButtonLink`) with Storybook stories; `PanelEmpty` and `PanelStatusBadge` now render them
- Product staff responsibilities (`ProductStaffAssignment`): TEACHER@OD, COACH@OK and Deneme Ligi EXAM_EDITOR / EXAM_OPERATOR / RESULT_PUBLISHER / REPORT_VIEWER / PRODUCT_MANAGER are granted per product instead of through new global roles; rows keep full grant/revoke history with one active row per user, product and role (SQL partial unique index)
- **Ürün sorumlulukları** in the admin user detail (Erişim Merkezi): grant and revoke with a required reason and step-up, coach capacity, history, an "MFA kurulumu bekleniyor" badge and a non-blocking last-holder warning; new teachers get TEACHER@OD automatically
- Deneme Ligi staff land on the workspace their permissions allow (single module, staff home with permitted tiles only, or the report workspace), and the Deneme Ligi menu is built from the same permissions
- `STAFF_PRODUCT_ASSIGNMENTS` rollout mode (`legacy` / `shadow` default / `enforce`); shadow keeps today's access and logs `panel.staff_access_shadow_mismatch` as `UNEXPECTED` or `EXPECTED_NARROWING`
- `npm run staff:backfill` (dry-run by default, `--apply`, idempotent) creating TEACHER@OD for every teacher, COACH@OK for coach-marked teachers, and REPORT_VIEWER@ODK only for teachers with a current Deneme Ligi report relationship
- Self-signup for students and parents at `/kayit` (multi-step: account type, personal, education or children, interests and purchase status, contact preference, KVKK/terms/marketing consent); signup never grants product access and parents' children wait as pending accounts (`PUBLIC_REGISTER_ENABLED`)
- Post-signup Tally contact form (`/kayit/iletisim-formu`, skippable) with a signed `ref` hidden field and a signed webhook at `/api/integrations/tally` that records responses, creates CRM leads and notifies admins (`TALLY_FORM_ID`, `TALLY_REF_SECRET`, `TALLY_SIGNING_SECRET`)
- Account settings hub at `/panel/ayarlar` (profile, education, children, contact, billing address, consents, security) with a profile-completion meter and an in-panel reminder banner
- Admin **Yeni kayıtlar** queue (`/panel/yonetim/basvurular`): call/WhatsApp, contact status and notes, and one-click "Öğrenci hesabı aç" for a parent's pending child that links the parent and opens access for already-paid orders
- Logged-in purchase: a student's access opens on their own account; a parent picks which child the package is for, and the paying parent's own membership opens automatically

- Build provenance on every deployed artifact: `x-build-*` response headers, a public `/api/version` endpoint, a `build` block on the health and smoke endpoints, and a version/short-SHA stamp in the site footer
- `npm run verify:production-version` and a scheduled Production Health step that compares the live commit against `main`, so a healthy but stale deploy no longer reads as green
- Role **Analiz** pages (student, teacher, parent) for combined academic and behavioral gidişat, plus a management analytics **Gidişat** panel sharing the same catalog (`PANEL_FEATURE_PROGRESS_INSIGHTS`, default on)
- Public `/dino-ai` page positioning Dino AI as the shared layer across the three products, linked from the footer and sitemap
- Registration-status notice on the Online Koçum product page while pricing and sign-up are not yet published
- End-to-end coverage for public navigation, legacy redirects, and product-surface accessibility
- Panel screens the approved design specified but the app lacked: student profile, parent account and package, educator student detail and coaching preparation, admin educators, order list and order detail, and coaching operations
- Coaching domain for Online Koçum: coach assignment, one-to-one coaching sessions with separate shared and private notes, per-student meeting cadence, and coach capacity
- Student goals with targets set by the coach and progress computed live from exam and plan data
- Dino AI summaries for students, parents and educators, backed by Gemini behind allowlisted questions, redaction, citation validation, daily cost and request caps, and an honest fallback when unavailable
- Server-side search, filtering and pagination on the admin people list

### Changed

- Student home (Design Phase 2) is one calm page: a neutral "Şimdi" block, a single deduplicated "Bugün" list instead of the separate "Sonra" and "Bugünün tamamı" lists, a one-line week summary, and plain plan and Deneme Ligi sections with a small net trend line; product event names and the home completion flow are unchanged
- Student lessons, lesson detail, assignments and materials use the panel's list, property and status components; the lesson detail reads as a document and the floating celebration banner on assignment completion was removed (the completion message is still announced)
- Teacher home, the Yön signal block and the teacher student roster use sections, rows and a table with view tabs; the admin education page is split into tabs (Gruplar, Kurulum ve ders planlama, Ödevler, Materyaller) and links to its anchors open the right tab
- Yön Koçluk students get a **Bugün** page (`/panel/ogrenci/yon`): today's plan as a checklist (completing a task uses the existing plan task endpoint), overdue tasks, the next coaching session with its meeting link, the week at a glance, the latest coach note shared with the student, goals and the weekly check-in; "Bugün" in the Yön workspace and the Yön entry point open it
- Coaches get a **workspace home** (`/panel/ogretmen/yon`): today's sessions with Hazırlık and Katıl, an attention queue grouped by reason (reschedule requests, open help requests, overdue sessions, plans waiting for approval, pending suggestions, missing plans and check-ins, low plan completion) and a students table; it is the coach's "Bugün" in the Yön workspace, the Yön entry point and a ⌘K command
- Koçum, Hedeflerim and the parent Yön page use flat sections: Koçum shows the coach, sessions (reschedule flow unchanged), shared notes, tasks the coach added and past sessions; goals are grouped by type; parents see coach notes marked for parents and read-only goals; private and internal coach notes are still never shown to students or parents
- The admin coaching page has queue tabs (Koç bekleyen, Görüşme gecikti, Plan yayınlanmadı, Hedefi olmayan, Kapasite üstü koçlar, Yön sinyalleri), a coach directory with capacity bars, and assigns or transfers a coach in a side panel with capacity shown per coach; the same server action and capacity-override rule apply, and a successful assignment returns to the same queue
- Student assignments open their details in a side panel (`?onizle=odev:<id>`, shareable; Escape or the close button closes it and focus returns to the row): the description, evidence criteria, latest attempt and feedback, and the evidence form live there, while the status buttons stay on each row; the panel is a reusable `Drawer` primitive with a focus trap and a full-screen layout on phones
- Gidişatım (student, teacher, parent) drops stat boxes and cards: attendance, work and plan completion are property rows with a thin progress line, strengths and support areas are plain lists, the teacher view shows group averages, a declining-students list and a panel table
- The admin lesson calendar and curriculum (Kazanımlar) pages use flat sections: day columns with thin dividers and status badges, one toolbar for week navigation, filters and the .ics export; curriculum versions, the new-version form and the outcome form have visible field labels and Turkish status labels (Aktif / Taslak / Arşiv) with the same API calls and version workflow
- Students reach "Tekrar ve telafi" from the menu, with tabs between the review queue and missed-lesson recovery; unified-today and calendar product labels use "Yön Koçluk" and "Deneme Ligi"
- All panel page headers share one scale (24px title, no uppercase eyebrow, 14px description) through `PageHeader`; `PanelHeading`, `PanelPageHeader` and `AdminPageHeader` render it, and the 23 hand-written page headers use the same scale
- Account settings, notification preferences, accessibility, data usage, sessions and password are no longer menu items: they open from the sidebar's Ayarlar entry, and the settings hub links the panel preferences
- The panel focus ring uses the panel green instead of the public site's orange; the mobile bottom bar keeps its four shortcuts and the menu button on one row
- Panel product names follow the public short names: `productLabel()` now returns "Yön Koçluk" and "Deneme Ligi" instead of "onlinekoçum." / "onlinedenemekulübüm."; remaining panel copy, "Kulüp" labels and "ODK" eyebrows were renamed accordingly
- Internal terms in panel copy were replaced: "Provisioning" → "Aktivasyon masası" / "Erişim açılışı", "Integrity inceleme" → "Bütünlük incelemesi"; raw enum values (user status, order status, readiness, plan suggestion kind, exam status in search) are shown as Turkish labels
- Public consultation now uses its own Tally form; marketing CTAs reach the form directly and package-builder choices remain visible above it, while the signed private registration flow stays separate
- Migrated styling to Tailwind CSS 4, preserving the existing theme and component appearance while removing its vulnerable `braces` dependency chain
- After sign-in everyone (admin, teacher, student, parent) chooses the OD / OK / ODK panel at `/panel/urun-sec`; the choice is stored on the session and scopes the menu, with a "Panel değiştir" link in the shell

- Updated Next.js and its ESLint configuration to 16.3.5+ to address critical remote-code-execution advisories
- Dino AI marketing copy now describes planned rather than live capability
- Admin and panel headings now use the design's typography scale instead of marketing type
- The admin "Siparişler" entry now opens a dedicated order list; the wider operations queue moved to its own entry
- Parent exam and weekly-digest screens now use the shared parent scope and child switcher

### Security

- Every Deneme Ligi admin page and API is gated by a specific permission (exam edit, schedule, assign, live ops, integrity review, scoring, release, key revision, packages, reports) instead of the bare ADMIN role; pilot control stays ADMIN-only and ADMIN keeps every permission as code-defined break-glass
- Privileged Deneme Ligi staff must use MFA, and result release and rescoring require a fresh step-up; answer keys are sent only to exam editors
- Admin coach assignment requires the student's active Yön Koçluk membership and an audited reason to exceed a coach's capacity
- Student-success timeline (`/api/panel/student-success/progress/[studentId]?view=timeline`) now filters events by viewer visibility on the server; staff-only and internal events (including intervention and mastery-rescore outbox events) no longer reach students or parents
- Yön Koçluk writes (coach notes, tasks, templates, plan copy, suggestion review, weekly summaries, plan approval, recovery-driven plan rebuilds) now require ADMIN or the student's active `CoachAssignment`; being the student's OD group teacher is no longer enough
- Parent academic access now requires an active, unended link with `canViewAcademic`, across parent pages, student-success APIs, Deneme Ligi parent reports, material access, weekly-digest feedback and lesson notifications; the account and package screen keeps working for links without academic access

### Fixed

- The two-admin MFA reset approval queue is visible again on `/panel/yonetim/kisiler`; it lived only on the `/panel/yonetim/kullanicilar` list, which `next.config.ts` redirects, so no admin could see or approve pending resets. Expiry now shows the time, not only the date (requests last 30 minutes)
- Pages without an entry point are linked from the menu: Deneme Ligi "Puanlama ve yayın" for admins, OD and Deneme Ligi controlled rollout (`/panel/yonetim/pilot`, `/panel/odk/yonetim/pilot`), learning quality (`/panel/yonetim/kalite`, behind `cohortQuality`) and the student weekly summary (`/panel/ogrenci/haftalik`, behind `parentWeeklyDigest`)
- The admin product-access form no longer rewrites existing memberships: a purchased, time-limited membership keeps its source, window and order link; missing products are granted as MANUAL and removed products are revoked, never deleted
- OK-only and ODK-only cart orders no longer grant an open-ended OD membership; existing affected rows can be reviewed with the read-only `npm run commerce:report:od-without-od-line`
- Stabilized panel plan approval and lesson recovery E2E fixtures across weekdays and repeated runs
- Group detail reported capacity as a fixed four regardless of the group's actual capacity
- Progress bars in reports, group detail, the assignment manager and the ODK outcome breakdown had no accessible role, value or label
- Every panel page rendered two `h1` elements, one from the topbar title and one from the page heading
- The parent exams screen no longer omits which child's data is being shown when only one child is linked
- Parent notifications 404'd for a parent whose child holds only Online Koçum or only Deneme Kulübü, because the redirect guard demanded OD product membership the destination page never required
- Four dead spacing classes (`mt-4.5`, `px-4.5`, `my-4.5` — outside Tailwind's default fractional scale) rendered no margin or padding at all; two were visibly broken, a filter-chip row with no horizontal padding and a divider line touching its surrounding content
- A pre-existing WCAG AA contrast failure in the business panel's active nav link (4.42:1, under the 4.5:1 minimum)
- Intervention inbox actions (claim, start review, resolve) always failed with 404 because each row sent a `student:reason` composite key instead of the case id, and every generated case was labelled "Katılım örüntüsü" regardless of its signal
- Students could not generate a weekly plan, and recovery rebalancing could not rebuild an approved plan, because planner-only score fields were written to `WeeklyPlanTask`
- The admin bulk-operations panel was unreachable after `/panel/yonetim/kullanicilar` started redirecting to the people hub; it now lives on `/panel/yonetim/kisiler`
- ODK exam question navigator items were exposed as list items instead of buttons to assistive technology
- Brand-green text and white-on-brand buttons (3.7:1), amber pending-status text (3.97:1) and 13px parent-link checkboxes failed WCAG AA contrast and target-size checks

## [0.1.1] - 2026-08-11

### Added

- GitHub community health files and issue and pull request templates
- Tag-driven, validation-gated GitHub Release automation
- Multi-platform GitHub Container Registry publishing with build provenance

### Changed

- Reworked the repository landing page, setup guide, and package metadata
- Standardized all GitHub-facing repository content in English

## [0.1.0] - 2026-08-11

### Added

- Online Dershanem, Online Deneme Kulübü, and Business Panel product areas
- Role-based administrator, teacher, student, and parent experiences
- PayTR payments, Resend email, and optional Meta/OpenAI integrations
- CI, E2E, Lighthouse, backup, and production health workflows

[Unreleased]: https://github.com/TerekliTahaBerk/online-dershanem/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/TerekliTahaBerk/online-dershanem/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/TerekliTahaBerk/online-dershanem/releases/tag/v0.1.0
