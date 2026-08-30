# Contributing guide

Online Dershanem is a proprietary product. Contributions are accepted only from contributors authorized by the repository owner. Review existing issues and agree on scope before starting a change.

## Development workflow

1. Start from an up-to-date `main` branch and create a short, descriptive feature branch.
2. Copy `.env.example` to `.env.local`; never commit real secrets.
3. Keep changes focused and cover behavior changes with tests.
4. Update the relevant documentation and the `Unreleased` section in `CHANGELOG.md`.
5. Complete the validation checklist in the pull request template.

## Required checks

```bash
npm ci
npm run lint
npm run lint:hygiene
npm run typecheck
npm run test:unit
```

Run integration, Playwright, and production build checks when the change affects those surfaces. Integration suites are opt-in per area and documented in [docs/integration-test-strategy.md](docs/integration-test-strategy.md). Schema changes must include a migration. Never use `prisma db push` against a production database.

## Commit and pull request standards

- Keep commit messages short, imperative, and limited to one purpose.
- Do not add personal data, access keys, confidential production endpoints, or customer data.
- Include validation evidence for UI or behavior changes.
- Explain risks and rollback steps for authorization, payment, or personal-data flows.

[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) applies to collaboration, and [SECURITY.md](SECURITY.md) applies to vulnerability reports.
