# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

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
