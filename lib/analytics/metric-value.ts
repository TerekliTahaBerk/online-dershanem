import type { ManagementAnalyticsSnapshot } from "./dashboard";

export function metricValue(
  key: string,
  snapshot: ManagementAnalyticsSnapshot,
): number | null {
  const c = snapshot.commercial;
  const e = snapshot.education;
  const t = snapshot.teacherOps;
  switch (key) {
    case "lead_count":
      return c.leadCount;
    case "lead_to_won":
      return c.leadToWonPercent;
    case "won_to_paid":
      return c.wonToPaidPercent;
    case "paid_to_provisioned":
      return c.paidToProvisionedPercent;
    case "avg_sales_cycle_days":
      return c.avgSalesCycleDays;
    case "collections":
      return c.collectionsCents;
    case "refunds":
      return c.refundedCents;
    case "package_renewals_upcoming":
      return c.packageRenewalsUpcoming;
    case "active_students":
      return e.activeStudents;
    case "active_groups":
      return e.activeGroups;
    case "lesson_attendance_rate":
      return e.lessonAttendancePercent;
    case "assignment_completion":
      return e.assignmentCompletionPercent;
    case "weekly_plan_completion":
      return e.weeklyPlanCompletionPercent;
    case "mock_exam_participation":
      return e.mockExamParticipationPercent;
    case "intervention_rate":
      return e.interventionRatePercent;
    case "student_risk_distribution":
      return e.risk.critical + e.risk.watch;
    case "lesson_close_completion":
      return t.lessonCloseCompletionPercent;
    case "teacher_open_work":
      return t.openWorkItems;
    case "intervention_resolution":
      return t.interventionResolutionPercent;
    case "teacher_student_load":
      return t.averageStudentLoad;
    case "cohort_outcome_progress":
      return snapshot.success.outcomeProgress.value;
    case "gidisat_median_net_delta": {
      const deltas = snapshot.success.mockExamTrends
        .filter((row) => row.status === "READY" && row.medianChange !== null)
        .map((row) => row.medianChange!);
      if (!deltas.length) return null;
      const sorted = [...deltas].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      if (sorted.length % 2 === 0) {
        return Math.round(((sorted[mid - 1]! + sorted[mid]!) / 2) * 10) / 10;
      }
      return sorted[mid]!;
    }
    default:
      return null;
  }
}

