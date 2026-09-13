# 0006 — MFA reset and plan suggestion statuses remain separate

Status: Proposed

`MfaResetStatus` is a security approval workflow with APPROVED and COMPLETED stages. `WeeklyPlanSuggestionStatus` is a coaching decision workflow whose accepted suggestion may later be APPLIED.

Decision: keep separate. Security review and pedagogical acceptance have different actors, transitions, audit requirements, and failure consequences.
