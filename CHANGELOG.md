# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

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

- Updated Next.js and its ESLint configuration to 16.3.5+ to address critical remote-code-execution advisories
- Dino AI marketing copy now describes planned rather than live capability
- Admin and panel headings now use the design's typography scale instead of marketing type
- The admin "Siparişler" entry now opens a dedicated order list; the wider operations queue moved to its own entry
- Parent exam and weekly-digest screens now use the shared parent scope and child switcher

### Fixed

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
