import type { PanelSloMetric } from "@/lib/panel-slo";

/**
 * Yönetim · Raporlar (son 30 gün) — SAF hesaplama. Web
 * (`app/panel/yonetim/raporlar`) ve mobil yönetim ucu
 * (`/api/panel/admin/reports`) AYNI modeli kullanır; veri
 * `admin-reports-server.ts` içinde okunur.
 */

export const ADMIN_REPORT_RANGE_DAYS = 30;
const DAY = 86_400_000;

export type AdminReportsInput = {
  now: Date;
  flags: { reviewQueue: boolean; adaptivePlan: boolean; teacherAiDrafts: boolean };
  lessons: { teacherId: string; status: string; teacher: { id: string; fullName: string | null; email: string } }[];
  groups: { id: string; name: string; enrollmentCount: number; activeAssignmentCount: number; progressStatuses: string[] }[];
  attendanceStatuses: string[];
  overdueAssignments: number;
  pendingPayments: number;
  productEvents: { name: string; properties: unknown }[];
  sloMetrics: PanelSloMetric[];
  reviewItems: { createdAt: Date; attempts: { reviewedAt: Date; response: string; stageBefore: number }[] }[];
  aiDrafts: { status: string; provider: string; estimatedCostMicrousd: number | null }[];
};

export type AdminSloView = {
  key: string;
  label: string;
  status: PanelSloMetric["status"];
  statusLabel: string;
  display: string;
  sampleSize: number;
  targetDisplay: string | null;
  comparison: "gte" | "lte";
};

export type AdminReports = {
  rangeDays: number;
  lessonCount: number;
  noteRate: number;
  attendanceRate: number;
  activeAssignments: number;
  overdueAssignments: number;
  emptyGroups: number;
  pendingPayments: number;
  review: { sevenDayRate: number | null; eligible: number; retentionRate: number | null; retentionAttempts: number } | null;
  plan: { completionRate: number | null; completed: number; generated: number } | null;
  ai: { approvalRate: number | null; reviewed: number; fallbackRate: number | null; drafts: number; flagRate: number | null; knownCostUsd: number | null } | null;
  slo: AdminSloView[];
  teachers: { name: string; total: number; completed: number; percent: number }[];
  groups: { id: string; name: string; students: number; percent: number }[];
};

const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

export function formatSloValue(value: number | null, unit: "ms" | "percent" | "count"): string {
  if (unit === "count" && value !== null) return value.toLocaleString("tr-TR");
  if (value === null) return "—";
  if (unit === "percent") return `%${value.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`;
  if (value >= 60_000) return `${(value / 60_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} dk`;
  return `${(value / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} sn`;
}

export const SLO_STATUS_LABEL: Record<PanelSloMetric["status"], string> = {
  healthy: "Hedefte",
  breached: "Hedef dışı",
  observing: "Baz çizgisi",
  insufficient_data: "Veri bekleniyor",
};

export function buildAdminReports(input: AdminReportsInput): AdminReports {
  const { now, lessons, groups } = input;
  const finished = lessons.filter((item) => item.status === "COMPLETED").length;
  const present = input.attendanceStatuses.filter((status) => status === "PRESENT" || status === "LATE").length;
  const teachers = [...new Map(lessons.map((item) => [item.teacher.id, item.teacher])).values()]
    .map((teacher) => {
      const rows = lessons.filter((item) => item.teacherId === teacher.id);
      const completed = rows.filter((item) => item.status === "COMPLETED").length;
      return { name: teacher.fullName || teacher.email, total: rows.length, completed, percent: percent(completed, rows.length) };
    })
    .sort((a, b) => b.total - a.total);

  let review: AdminReports["review"] = null;
  if (input.flags.reviewQueue) {
    const eligible = input.reviewItems.filter((item) => item.createdAt <= new Date(now.getTime() - 7 * DAY));
    const resolved = eligible.filter((item) => item.attempts.some((attempt) => attempt.reviewedAt <= new Date(item.createdAt.getTime() + 7 * DAY))).length;
    const retention = input.reviewItems.flatMap((item) => item.attempts).filter((attempt) => attempt.stageBefore === 4);
    const correct = retention.filter((attempt) => attempt.response === "CORRECT").length;
    review = {
      sevenDayRate: eligible.length ? percent(resolved, eligible.length) : null,
      eligible: eligible.length,
      retentionRate: retention.length ? percent(correct, retention.length) : null,
      retentionAttempts: retention.length,
    };
  }

  let plan: AdminReports["plan"] = null;
  if (input.flags.adaptivePlan) {
    const generated = input.productEvents
      .filter((event) => event.name === "plan_generated")
      .reduce((sum, event) => {
        const value = event.properties as { taskCount?: unknown } | null;
        return sum + (value && typeof value.taskCount === "number" ? value.taskCount : 0);
      }, 0);
    const completed = input.productEvents.filter((event) => event.name === "plan_task_completed").length;
    plan = { completionRate: generated ? Math.min(100, percent(completed, generated)) : null, completed, generated };
  }

  let ai: AdminReports["ai"] = null;
  if (input.flags.teacherAiDrafts) {
    const drafts = input.aiDrafts;
    const reviewed = drafts.filter((item) => item.status !== "DRAFT");
    const approved = drafts.filter((item) => item.status === "APPROVED").length;
    const unknownCost = drafts.some((item) => item.provider === "OPENAI" && item.estimatedCostMicrousd === null);
    ai = {
      approvalRate: reviewed.length >= 5 ? percent(approved, reviewed.length) : null,
      reviewed: reviewed.length,
      fallbackRate: drafts.length >= 5 ? percent(drafts.filter((item) => item.provider !== "OPENAI").length, drafts.length) : null,
      drafts: drafts.length,
      flagRate: reviewed.length >= 5 ? percent(drafts.filter((item) => item.status === "FLAGGED").length, reviewed.length) : null,
      knownCostUsd: unknownCost ? null : drafts.reduce((sum, item) => sum + (item.estimatedCostMicrousd || 0), 0) / 1_000_000,
    };
  }

  return {
    rangeDays: ADMIN_REPORT_RANGE_DAYS,
    lessonCount: lessons.length,
    noteRate: percent(finished, lessons.length),
    attendanceRate: percent(present, input.attendanceStatuses.length),
    activeAssignments: groups.reduce((sum, group) => sum + group.activeAssignmentCount, 0),
    overdueAssignments: input.overdueAssignments,
    emptyGroups: groups.filter((group) => group.enrollmentCount === 0).length,
    pendingPayments: input.pendingPayments,
    review,
    plan,
    ai,
    slo: input.sloMetrics.map((metric) => ({
      key: metric.key,
      label: metric.label,
      status: metric.status,
      statusLabel: SLO_STATUS_LABEL[metric.status],
      display: formatSloValue(metric.value, metric.unit),
      sampleSize: metric.sampleSize,
      targetDisplay: metric.target === null ? null : formatSloValue(metric.target, metric.unit),
      comparison: metric.comparison,
    })),
    teachers,
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      students: group.enrollmentCount,
      percent: percent(group.progressStatuses.filter((status) => status === "DONE").length, group.progressStatuses.length),
    })),
  };
}
