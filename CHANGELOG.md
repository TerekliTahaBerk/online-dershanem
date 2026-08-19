# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Public `/dino-ai` page positioning Dino AI as the shared layer across the three products, linked from the footer and sitemap
- Registration-status notice on the Online Koçum product page while pricing and sign-up are not yet published
- End-to-end coverage for public navigation, legacy redirects, and product-surface accessibility
- Panel screens the approved design specified but the app lacked: student profile, parent account and package, educator student detail and coaching preparation, admin educators, order list and order detail, and coaching operations
- Coaching domain for Online Koçum: coach assignment, one-to-one coaching sessions with separate shared and private notes, per-student meeting cadence, and coach capacity
- Student goals with targets set by the coach and progress computed live from exam and plan data
- Dino AI summaries for students, parents and educators, backed by Gemini behind allowlisted questions, redaction, citation validation, daily cost and request caps, and an honest fallback when unavailable
- Server-side search, filtering and pagination on the admin people list

### Changed

- Dino AI marketing copy now describes planned rather than live capability
- Admin and panel headings now use the design's typography scale instead of marketing type
- The admin "Siparişler" entry now opens a dedicated order list; the wider operations queue moved to its own entry
- Parent exam and weekly-digest screens now use the shared parent scope and child switcher

### Fixed

- Group detail reported capacity as a fixed four regardless of the group's actual capacity
- Progress bars in reports, group detail, the assignment manager and the ODK outcome breakdown had no accessible role, value or label
- Every panel page rendered two `h1` elements, one from the topbar title and one from the page heading
- The parent exams screen no longer omits which child's data is being shown when only one child is linked

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
