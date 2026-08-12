# Online Dershanem

[![CI](https://github.com/TerekliTahaBerk/online-dershanem/actions/workflows/ci.yml/badge.svg)](https://github.com/TerekliTahaBerk/online-dershanem/actions/workflows/ci.yml)
[![Lighthouse](https://github.com/TerekliTahaBerk/online-dershanem/actions/workflows/lighthouse.yml/badge.svg)](https://github.com/TerekliTahaBerk/online-dershanem/actions/workflows/lighthouse.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Container](https://img.shields.io/badge/GHCR-container-2496ED?logo=docker&logoColor=white)](https://github.com/TerekliTahaBerk/online-dershanem/pkgs/container/online-dershanem)
[![License: Proprietary](https://img.shields.io/badge/license-proprietary-red.svg)](LICENSE)

A role-based education and business operations platform that connects sales, learning delivery, assessment, and operational reporting in one product.

[Live website](https://onlinedershanem.com) · [Report a bug](https://github.com/TerekliTahaBerk/online-dershanem/issues/new?template=bug_report.yml) · [Request a feature](https://github.com/TerekliTahaBerk/online-dershanem/issues/new?template=feature_request.yml)

## Product areas

| Area | Scope |
| --- | --- |
| **Online Dershanem** | Lessons, assignments, materials, progress tracking, and parent visibility |
| **Online Deneme Kulübü** | Mock exams, secure exam delivery, and learning-outcome analysis |
| **Business Panel** | Instagram CRM, lead pipeline, advertising performance, and shared finance ledger |

Administrator, teacher, student, and parent experiences have separate navigation and horizontal access controls. Panel accounts are created by administrators; public self-registration is not available. Business access is granted independently from platform roles through `BusinessRoleAssignment`.

## Highlights

- Public sales website, SEO-ready blog, lead forms, cart, and PayTR checkout flows
- Lesson scheduling, quick lesson notes and attendance, assignments, and material management
- Student progress, parent reports, calendar, and payment visibility
- Mock-exam lifecycle, automated scoring, and learning-outcome reporting
- Instagram inbox, CRM, advertising, and finance operations
- Auditable authorization, security logging, rate limiting, and controlled rollout gates
- Health checks, scheduled-job heartbeats, backups, and observability workflows

## Technology

- Next.js 16 App Router, React 18, and TypeScript 5
- PostgreSQL and Prisma 6
- Tailwind CSS 3
- Playwright, Node.js test runner, and Lighthouse CI
- Vercel, Vercel Blob, Resend, PayTR, and optional Meta/OpenAI integrations

## Local development

Requirements: Node.js 22+, npm 10+, and PostgreSQL.

```bash
git clone https://github.com/TerekliTahaBerk/online-dershanem.git
cd online-dershanem
npm ci
cp .env.example .env.local
npm run prisma:generate
npm run prisma:deploy
npm run db:seed
npm run dev
```

The application starts at `http://localhost:3000` by default. `.env.example` documents safe placeholders and opt-in integration settings. Never commit real credentials.

## Validation

```bash
npm run lint
npm run lint:hygiene
npm run typecheck
npm run test:unit
npm run test:integration
npm run build
npm run e2e
```

Integration tests require `DATABASE_URL`; the relevant tests are skipped when it is not set. To run the Chromium, Firefox, and WebKit acceptance suite:

```bash
npx playwright install chromium firefox webkit
npm run e2e:cross-browser
```

## Database and releases

Apply only versioned migrations to an existing or production database:

```bash
npm run release:migrate
```

Bootstrap a completely empty database safely with:

```bash
ALLOW_FRESH_DB_BOOTSTRAP=true npm run db:bootstrap:fresh
```

The bootstrap command refuses to run against a non-empty database. See the [panel operations guide](docs/panel-operations.md) and [deployment checklist](docs/deployment-checklist.md) for environment variables, email policy, backup restoration, and production acceptance.

Releases use `v*.*.*` tags. A tag push runs the release quality gate, publishes a GitHub Release, and builds a versioned container. Notable changes are maintained in [CHANGELOG.md](CHANGELOG.md).

### Container package

Every semantic version is published to GitHub Container Registry with version, major-minor, and `latest` tags. Package access follows the repository owner's GitHub Packages visibility settings.

```bash
docker pull ghcr.io/tereclitahaberk/online-dershanem:latest
docker run --env-file .env.local -p 3000:3000 ghcr.io/tereclitahaberk/online-dershanem:latest
```

Database migrations do not run automatically when the container starts. Run `npm run release:migrate` before a production deployment.

## Documentation

- [Panel operations](docs/panel-operations.md)
- [Security and KVKK](docs/security-and-kvkk.md)
- [Business RBAC model](docs/business-rbac.md)
- [Meta and Instagram setup](docs/meta-instagram-setup.md)
- [OpenAI-assisted drafting setup](docs/openai-assistant-setup.md)
- [ODK pilot acceptance checklist](docs/odk-pilot-acceptance-checklist.md)

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a change. Do not disclose sensitive vulnerabilities in public issues; follow [SECURITY.md](SECURITY.md) instead.

## License

This repository is not open source. All rights to the source code are reserved. See [LICENSE](LICENSE) for use and distribution terms.
