# 0010 — Learning activity lifecycle enums remain separate

Status: Proposed

`LessonStatus` and `CoachingSessionStatus` overlap but coaching explicitly records MISSED. `WeeklyDigestStatus`, `WeeklyCoachSummaryStatus`, and `RecoveryPackageStatus` share publication states, while recovery packages additionally track completion.

Decision: keep these enums separate. They belong to independently evolving teaching, coaching, communication, and recovery workflows; identical labels do not establish identical transitions.
