import type { CommercialMetrics } from "@/lib/analytics/commercial";
import type { EducationMetrics } from "@/lib/analytics/education";
import type { SuccessMetrics } from "@/lib/analytics/success";
import type { TeacherOpsMetrics } from "@/lib/analytics/teacher-ops";
import {
  getMetricDefinition,
  type MetricDefinition,
  type MetricKey,
} from "@/lib/analytics/definitions";

export type DashboardKpiTone = "neutral" | "positive" | "watch" | "critical";

export type DashboardKpi = {
  key: MetricKey;
  label: string;
  value: number | null;
  display: string;
  unit: MetricDefinition["unit"];
  domain: MetricDefinition["domain"];
  href: string;
  hint: string;
  tone: DashboardKpiTone;
  sampleNote: string | null;
};

export type ManagementAnalyticsSnapshot = {
  ruleVersion: string;
  timezone: string;
  commercial: CommercialMetrics;
  education: EducationMetrics;
  success: SuccessMetrics;
  teacherOps: TeacherOpsMetrics;
  kpis: DashboardKpi[];
};

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `%${value.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;
}

function formatCount(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("tr-TR");
}

function formatCents(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function formatDays(value: number | null): string {
  if (value === null) return "—";
  return `${value.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} gün`;
}

function formatRatio(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("tr-TR", { maximumFractionDigits: 1 });
}

function toneForPercent(value: number | null, goodAbove: number, watchBelow: number): DashboardKpiTone {
  if (value === null) return "neutral";
  if (value >= goodAbove) return "positive";
  if (value < watchBelow) return "critical";
  return "watch";
}

/**
 * En fazla 10 birincil KPI üretir. Detay sayfasına `href` ile drill-down.
 */
export function buildDashboardKpis(input: {
  commercial: CommercialMetrics;
  education: EducationMetrics;
  teacherOps: TeacherOpsMetrics;
  basePath?: string;
}): DashboardKpi[] {
  const base = input.basePath ?? "/panel/yonetim/analitik";
  const { commercial: c, education: e, teacherOps: t } = input;

  const rows: Array<{
    key: MetricKey;
    value: number | null;
    display: string;
    tone: DashboardKpiTone;
    hint: string;
    sampleNote: string | null;
  }> = [
    {
      key: "lead_count",
      value: c.leadCount,
      display: formatCount(c.leadCount),
      tone: "neutral",
      hint: "Aralıkta oluşan lead",
      sampleNote: null,
    },
    {
      key: "lead_to_won",
      value: c.leadToWonPercent,
      display: formatPercent(c.leadToWonPercent),
      tone: toneForPercent(c.leadToWonPercent, 15, 5),
      hint: "Lead → Won dönüşümü",
      sampleNote: null,
    },
    {
      key: "paid_to_provisioned",
      value: c.paidToProvisionedPercent,
      display: formatPercent(c.paidToProvisionedPercent),
      tone: toneForPercent(c.paidToProvisionedPercent, 95, 80),
      hint: "Ödeme sonrası hesap açılışı",
      sampleNote: null,
    },
    {
      key: "collections",
      value: c.collectionsCents,
      display: formatCents(c.collectionsCents),
      tone: "neutral",
      hint: "Tahsilat (operasyonel)",
      sampleNote: null,
    },
    {
      key: "active_students",
      value: e.activeStudents,
      display: formatCount(e.activeStudents),
      tone: "neutral",
      hint: "Aktif membership’li öğrenci",
      sampleNote: null,
    },
    {
      key: "lesson_attendance_rate",
      value: e.lessonAttendancePercent,
      display: formatPercent(e.lessonAttendancePercent),
      tone: toneForPercent(e.lessonAttendancePercent, 85, 70),
      hint: "PRESENT+LATE / tüm yoklama",
      sampleNote: null,
    },
    {
      key: "assignment_completion",
      value: e.assignmentCompletionPercent,
      display: formatPercent(e.assignmentCompletionPercent),
      tone: toneForPercent(e.assignmentCompletionPercent, 70, 40),
      hint: "Ödev progress DONE oranı",
      sampleNote: null,
    },
    {
      key: "weekly_plan_completion",
      value: e.weeklyPlanCompletionPercent,
      display: formatPercent(e.weeklyPlanCompletionPercent),
      tone: toneForPercent(e.weeklyPlanCompletionPercent, 60, 30),
      hint: "Haftalık plan görevleri",
      sampleNote: null,
    },
    {
      key: "lesson_close_completion",
      value: t.lessonCloseCompletionPercent,
      display: formatPercent(t.lessonCloseCompletionPercent),
      tone: toneForPercent(t.lessonCloseCompletionPercent, 90, 70),
      hint: "Ders kapanış tamamlama",
      sampleNote: null,
    },
    {
      key: "intervention_resolution",
      value: t.interventionResolutionPercent,
      display: formatPercent(t.interventionResolutionPercent),
      tone: toneForPercent(t.interventionResolutionPercent, 70, 40),
      hint: "Müdahale çözüm oranı",
      sampleNote: e.risk.watch + e.risk.critical > 0
        ? `Risk: ${e.risk.critical} kritik · ${e.risk.watch} izleme`
        : null,
    },
  ];

  return rows.slice(0, 10).flatMap((row) => {
    const def = getMetricDefinition(row.key);
    if (!def) return [];
    return [
      {
        key: row.key,
        label: def.label,
        value: row.value,
        display: row.display,
        unit: def.unit,
        domain: def.domain,
        href: `${base}/${row.key}`,
        hint: row.hint,
        tone: row.tone,
        sampleNote: row.sampleNote,
      },
    ];
  });
}

export function formatMetricDisplay(
  unit: MetricDefinition["unit"],
  value: number | null,
): string {
  switch (unit) {
    case "percent":
      return formatPercent(value);
    case "cents":
      return formatCents(value);
    case "days":
      return formatDays(value);
    case "ratio":
      return formatRatio(value);
    case "count":
    default:
      return formatCount(value);
  }
}
