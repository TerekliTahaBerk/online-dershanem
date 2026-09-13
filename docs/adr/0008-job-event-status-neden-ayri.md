# 0008 — Background job and cross-product event statuses remain separate

Status: Proposed

`JobStatus` tracks retryable operational jobs and includes SUCCEEDED and DEAD. `CrossProductEventStatus` tracks outbox delivery and uses PROCESSED, with consumer-level idempotency recorded separately.

Decision: keep separate. A shared enum would blur dead-letter and event-consumption semantics even though both workflows use PENDING, PROCESSING, and FAILED.
