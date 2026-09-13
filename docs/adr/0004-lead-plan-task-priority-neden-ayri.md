# 0004 — LeadPriority and PlanTaskPriority remain separate

Status: Proposed

The value sets are identical, but `LeadPriority` drives CRM work on `BusinessLead` and `LeadTask`; `PlanTaskPriority` schedules student work on `WeeklyPlanTask` and templates.

Decision: keep separate. The domains can independently add ranking levels or change workflow meaning. A shared enum would create cross-domain migration coupling with no behavioral reuse.
