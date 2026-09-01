# Cross-Product Events

Domain event + transactional outbox pattern.

## Event tipleri

```text
LESSON_COMPLETED | LESSON_MISSED
ASSIGNMENT_CREATED | ASSIGNMENT_COMPLETED | ASSIGNMENT_EVALUATED
COACHING_PLAN_PUBLISHED | COACHING_TASK_COMPLETED
MOCK_EXAM_ASSIGNED | MOCK_EXAM_COMPLETED | MOCK_EXAM_RESULT_PUBLISHED
OUTCOME_MASTERY_CHANGED | INTERVENTION_CREATED
```

## Outbox şeması

`CrossProductEventOutbox`:

- `deduplicationKey` (unique)
- `eventVersion` (şu an: 1)
- `actorUserId`, `studentId`, `entityType`, `entityId`
- `payload` (versioned JSON)
- `status`: PENDING → PROCESSING → PROCESSED | FAILED

## Idempotency

`CrossProductEventConsumer` — `(eventId, consumerKey)` unique.

Aynı event iki kez işlendiğinde duplicate task/notification oluşmaz.

## Consumer'lar

| Consumer | Event |
| --- | --- |
| assignment-projection | ASSIGNMENT_CREATED |
| lesson-close-suggestions | LESSON_COMPLETED |
| lesson-missed-recovery | LESSON_MISSED |
| mock-exam-coach-bridge | MOCK_EXAM_RESULT_PUBLISHED |
| evidence-recorder | LESSON/ASSIGNMENT/MOCK_EXAM |
| mastery-rescore | evidence events |
| timeline-writer | çoğu event |

## Emit noktaları

- `app/api/panel/assignments/route.ts` — ASSIGNMENT_CREATED
- `app/api/panel/assignments/[id]/progress/route.ts` — ASSIGNMENT_COMPLETED
- `app/api/panel/lessons/[id]/notes/route.ts` — LESSON_COMPLETED / MISSED
- `app/api/odk/admin/exams/[id]/release/route.ts` — MOCK_EXAM_RESULT_PUBLISHED

## İşleme

Cron: `/api/cron/cross-product-events` (2 dk).

Observability: `getOutboxHealthMetrics()` — pending/failed count.
