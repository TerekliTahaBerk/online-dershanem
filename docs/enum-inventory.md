# Enum overlap review

The reproducible full inventory is emitted by `npm run db:audit:enums`. It lists all 123 enums, every value, referencing models, and value-set overlap metrics. The 2026-09-13 audit found zero unreferenced enums, so no enum was removed and no enum-drop migration was created.

| Group | Member enums | Category | Action |
| --- | --- | --- | --- |
| Identity audiences | UserRole, DinoAudience | b | Keep separate; see ADR 0001 |
| Product scopes | ProductCode, CommerceProduct, CouponService | b | Keep separate; see ADR 0002 |
| Exam taxonomy | CurriculumExam, OdkExamFamily | b | Keep separate; see ADR 0003 |
| Priorities | LeadPriority, PlanTaskPriority | b | Keep separate; see ADR 0004 |
| Publishable/domain lifecycle | UserStatus, CurriculumStatus, ReviewItemStatus, CampaignStatus, StudentGoalStatus, PilotCohortStatus | b | Keep separate; see ADR 0005 |
| Approval lifecycle | MfaResetStatus, WeeklyPlanSuggestionStatus | b | Keep separate; see ADR 0006 |
| Money lifecycle | FinancialStatus, PurchaseStatus, OdkOrderStatus, OdkPaymentStatus | b | Keep separate; see ADR 0007 |
| Async work lifecycle | JobStatus, CrossProductEventStatus | b | Keep separate; see ADR 0008 |
| Provisioning lifecycle | OdkProvisioningStatus, OdProvisioningStatus, OrderLineFulfillmentStatus | b | Keep separate; see ADR 0009 |
| Learning activity lifecycle | LessonStatus, CoachingSessionStatus, WeeklyDigestStatus, RecoveryPackageStatus, WeeklyCoachSummaryStatus | b | Keep separate; see ADR 0010 |

Pairs that share generic words but do not model the same state machine—such as question difficulty vs. perceived plan load, or answer correctness vs. review confidence—are reported by the metric but intentionally excluded from consolidation candidates.
