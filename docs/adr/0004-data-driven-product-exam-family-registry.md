# 0004 — Data-driven Product and ExamFamily registry

Status: Accepted

## Context

`ProductCode`, `CommerceProduct`, `CurriculumExam`, and `OdkExamFamily` are closed enums. They protect existing access, fulfillment, curriculum, and exam-engine contracts, but using them as the only catalog makes every new product or exam family a schema change. ADR 0002 and ADR 0003 remain valid: commerce/access meanings and curriculum/ODK meanings are still distinct and must not be collapsed.

## Decision

Add `products` and `exam_families` as the extensible registry while retaining every legacy enum and enum column. Eight legacy models receive nullable bridge foreign keys. Migration 0103 inserts the existing OD/OK/ODK and LGS/TYT/AYT/YDT catalog rows, backfills the bridges, and aborts if any legacy value is missing or inconsistent.

LGS, TYT, and AYT belong to ODK because they are directly supported by the current ODK exam engine. YDT belongs to OD because it exists only in the shared curriculum/mock-exam taxonomy today. This ownership is catalog metadata; it does not merge the two legacy exam enums.

Server-only registry functions are the new read boundary. The first pilot reads ODK admin family filters/create forms and the curriculum admin create form from the registry. Explicit legacy allowlists remain feature gates, so an active registry row does not automatically expose a product or family in UI, authorization, commerce, or provisioning.

KPSS and `KPSS_EGITIM_BILIMLERI` are inserted by idempotent data seed, not by adding enum members or changing the schema. Their adapter integration test proves that a third product can be registered and read while remaining invisible to legacy product experiences.

## Consequences

- Existing response shapes, enum types, status codes, access checks, payments, and fulfillment branches remain unchanged.
- Registry and bridge columns coexist with legacy columns during the migration window.
- `scripts/backfill-product-exam-family.mjs` can safely be rerun and verifies zero bridge inconsistencies.
- New feature work must use an explicit rollout gate before registry records become user-visible.

## Deferred work

- Migrate the remaining inventory entries to registry-backed reads in bounded feature slices.
- Add dual-write coverage to every legacy mutation path before making bridge columns required.
- Move authorization and commerce contracts only under separate ADRs and regression plans.
- Remove legacy enum columns and then the enums in a final cleanup migration after all reads/writes have moved.
