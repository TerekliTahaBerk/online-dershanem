# 0005 — Domain lifecycle enums remain separate

Status: Proposed

`UserStatus`, `CurriculumStatus`, `ReviewItemStatus`, `CampaignStatus`, `StudentGoalStatus`, and `PilotCohortStatus` share generic labels such as ACTIVE and ARCHIVED. They govern different transition graphs: account suspension, curriculum publication, mastery review, campaign pausing/completion, goal achievement, and pilot rollback.

Decision: keep separate. No single transition contract exists in code. Any future consolidation needs an explicit shared state machine and human-approved data migration.
