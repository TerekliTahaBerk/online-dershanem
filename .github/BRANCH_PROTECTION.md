# `main` branch protection

Disable direct pushes to `main` and require the following single status check before a pull request can be merged:

- `CI / Quality Gate`

This aggregate check covers lint, TypeScript, unit tests, integration tests, the production build, fresh database bootstrap, and all three Playwright shards. Individual jobs remain visible for diagnostics and do not need to be added separately to branch protection.

`Broken Link Scan`, `Lighthouse`, `Cross-browser Panel`, `Production Health`, `Production Smoke`, and `Encrypted Database Backup` are scheduled or manually triggered operational checks. Do not mark them as required because they are not created for every pull request event.

Also enable these repository settings:

- Require a pull request before merging
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Do not allow bypassing the above settings
