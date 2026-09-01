import { METRIC_DEFINITIONS, type MetricDefinition } from "@/lib/analytics/definitions";
import type { ManagementAnalyticsSnapshot } from "@/lib/analytics/dashboard";
import { formatMetricDisplay } from "@/lib/analytics/dashboard";
import { csvDocument } from "@/lib/csv";
import type { AnalyticsCohortFilters } from "@/lib/analytics/filters";
import { formatIstanbulDateInput } from "@/lib/istanbul-time";

/**
 * Yetkili admin CSV export — KVKK: isim, e-posta, telefon, öğrenci kimliği yok.
 * Yalnız metrik anahtarı, tanım özeti, değer, örneklem, filtre özeti.
 */

export type AnalyticsExportRow = {
  metricKey: string;
  domain: string;
  label: string;
  value: string;
  unit: string;
  sampleOrNote: string;
  definition: string;
  querySource: string;
  dateSemantics: string;
  denominator: string;
};

function valueForKey(snapshot: ManagementAnalyticsSnapshot, key: string): number | null {
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

function sampleNote(snapshot: ManagementAnalyticsSnapshot, def: MetricDefinition): string {
  if (def.key === "student_risk_distribution") {
    const r = snapshot.education.risk;
    return `critical=${r.critical};watch=${r.watch};normal=${r.normal};total=${r.total}`;
  }
  if (def.key === "sales_by_product") {
    return snapshot.commercial.salesByProduct
      .map((row) => `${row.product}:${row.packageName}:${row.orderCount}`)
      .join("|") || "empty";
  }
  if (def.key === "cohort_mock_exam_trend") {
    return snapshot.success.mockExamTrends
      .map((row) => `${row.exam}:${row.status}:n=${row.pairedStudents}`)
      .join("|");
  }
  if (def.key === "cohort_subject_progress") {
    return snapshot.success.subjectProgress
      .map((row) => `${row.status}:n=${row.sampleSize}`)
      .join("|");
  }
  if (def.key === "plan_alignment_vs_outcome") {
    const row = snapshot.success.planAlignmentVsOutcome;
    return `${row.status}:n=${row.sampleSize}`;
  }
  if (def.key === "cohort_outcome_progress") {
    const row = snapshot.success.outcomeProgress;
    return `${row.status}:n=${row.sampleSize}`;
  }
  if (def.key === "gidisat_median_net_delta") {
    const ready = snapshot.success.mockExamTrends.filter((row) => row.status === "READY");
    const paired = ready.reduce((sum, row) => sum + row.pairedStudents, 0);
    return `ready=${ready.length};pairedSum=${paired}`;
  }
  return "";
}

export function buildAnalyticsExportRows(
  snapshot: ManagementAnalyticsSnapshot,
): AnalyticsExportRow[] {
  return METRIC_DEFINITIONS.map((def) => {
    const raw = valueForKey(snapshot, def.key);
    return {
      metricKey: def.key,
      domain: def.domain,
      label: def.label,
      value: formatMetricDisplay(def.unit, raw),
      unit: def.unit,
      sampleOrNote: sampleNote(snapshot, def),
      definition: def.definition,
      querySource: def.querySource,
      dateSemantics: def.dateSemantics,
      denominator: def.denominator,
    };
  });
}

export function analyticsExportCsv(
  snapshot: ManagementAnalyticsSnapshot,
  filters: AnalyticsCohortFilters,
): string {
  const rows = buildAnalyticsExportRows(snapshot);
  const meta = [
    ["meta", "timezone", snapshot.timezone, "", "", "", "", "", "", ""],
    ["meta", "ruleVersion", snapshot.ruleVersion, "", "", "", "", "", "", ""],
    [
      "meta",
      "range",
      `${formatIstanbulDateInput(filters.from)}..${formatIstanbulDateInput(filters.to)}`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
    [
      "meta",
      "filters",
      `exam=${filters.examType};class=${filters.classLevel ?? "-"};product=${filters.product};group=${filters.groupId ? "set" : "-"};teacher=${filters.teacherId ? "set" : "-"}`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
  ];
  const header = [
    "metricKey",
    "domain",
    "label",
    "value",
    "unit",
    "sampleOrNote",
    "definition",
    "querySource",
    "dateSemantics",
    "denominator",
  ];
  const body = rows.map((row) => [
    row.metricKey,
    row.domain,
    row.label,
    row.value,
    row.unit,
    row.sampleOrNote,
    row.definition,
    row.querySource,
    row.dateSemantics,
    row.denominator,
  ]);
  return csvDocument([...meta, header, ...body]);
}

/** Export satırlarında PII alanı olmadığını doğrular (test için). */
export const ANALYTICS_EXPORT_FORBIDDEN_HEADERS = [
  "email",
  "fullName",
  "phone",
  "studentId",
  "userId",
  "teacherName",
  "studentName",
] as const;
