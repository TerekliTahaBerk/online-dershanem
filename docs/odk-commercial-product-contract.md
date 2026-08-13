# ODK commercial product contract

ODK packages are sellable only when one versioned contract can answer every commercial and access question. The contract is assembled from `OdkPackage.contractPolicy`, ordered `OdkPackageExam` mappings, and the mapped `OdkExam` rules. `lib/odk/product-contract.ts` is the shared schema and decision layer.

## Lifecycle

1. Catalog staff define the package policy and its ordered exam mappings.
2. Any commercial package edit, mapping edit, or mapped exam-rule edit increments `contractVersion` in the database.
3. Checkout builds and validates the full contract. Sales must be `AVAILABLE`; the package must have at least one exam; every exam must have a schedule, attempt limit, late-entry rule, result release, and answer-key release.
4. The order stores the full `contractSnapshot`, including package identity and price. Database triggers reject later snapshot changes.
5. Provisioning copies the same snapshot to `OdkEntitlement` and calculates its access window from that snapshot. A retry never re-reads the current catalog.
6. Student exam lists, exam starts, attempt limits, late entry, Meet rights, result release, answer-key release, parent reports, and teacher reports resolve the active entitlement snapshot.

This separation means catalog edits affect only future orders. They do not remove exams, shorten access, reduce attempts, or change reporting rights for a completed purchase.

## Operational policies

The following values are deliberately finite machine-readable choices, not free text:

- `SOLD_OUT` blocks new orders. Existing paid orders and entitlements are unchanged.
- `PAUSED` temporarily blocks new orders; `CLOSED` ends sale of the catalog version.
- `RESCHEDULE_OR_EXTEND_ACCESS` requires operations to reschedule the affected exam or extend access. It never silently consumes an attempt.
- `RESCHEDULE_OR_REFUND` requires a replacement exam or a refund when ODK cancels delivery.
- `BEFORE_FIRST_ATTEMPT` allows the configured refund path only before a non-void attempt exists. Other refund modes must be stated explicitly in the policy.
- Exceptional access uses `ADMIN_GRANT_WITH_REASON_AND_EXPIRY`: it must be time-bound, carry an operational reason, and be granted by an admin. It must not mutate a historical purchase snapshot.

Payment callbacks and historical result routes remain available while new checkout is disabled. Reopening public checkout is a separate rollout decision; it must call `createOdkOrderFromCatalog` and may not construct `OdkOrder` from browser-provided package contents or prices.

## Admin inspection

`/panel/odk/yonetim/paketler` shows package version, sale state, access window, reporting and live-service rights, exception policies, and every mapped exam with its schedule, attempts, late-entry window, and release times. An invalid contract or empty exam mapping is visible there and is rejected by checkout.
