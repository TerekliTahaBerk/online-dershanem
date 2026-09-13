import { formatIstanbulDateInput } from "@/lib/istanbul-time";
import {
  buildTodaySummary,
  buildWeeklyKocumMetrics,
  formatMinutesAsHours,
  isCompletedTaskStatus,
  isOpenTaskStatus,
  taskStatusLabel as kocumTaskStatusLabel,
  type KocumTaskStatus,
} from "@/lib/kocum";

export type StudentPlanStatus = "DRAFT" | "APPROVED" | "CHANGE_REQUESTED" | "ARCHIVED";
export type StudentPlanTaskStatus = KocumTaskStatus;

export type StudentPlanTask = {
  id: string;
  scheduledFor: string;
  durationMinutes: number;
  status: StudentPlanTaskStatus;
  actualMinutes?: number | null;
  targetType?: "QUESTIONS" | "MINUTES" | "PAGES" | "VIDEOS" | "NONE" | null;
  targetValue?: number | null;
  actualQuestions?: number | null;
  subject?: string | null;
};

export function taskDateKey(scheduledFor: string): string {
  return formatIstanbulDateInput(new Date(scheduledFor));
}

export function planStatusLabel(status: StudentPlanStatus): string {
  return {
    APPROVED: "Koçun tarafından onaylandı",
    CHANGE_REQUESTED: "Değişiklik talebin koçuna iletildi",
    DRAFT: "Plan hazırlanıyor",
    ARCHIVED: "Bu plan arşivde",
  }[status];
}

export function taskStatusLabel(status: StudentPlanTaskStatus): string {
  return kocumTaskStatusLabel(status);
}

export function splitPlanTasks<T extends StudentPlanTask>(tasks: T[], today: string) {
  const todayTasks = tasks.filter((task) => taskDateKey(task.scheduledFor) === today);
  const todayPending = todayTasks.filter((task) => isOpenTaskStatus(task.status));
  const todayCompleted = todayTasks.filter((task) => isCompletedTaskStatus(task.status));
  const remainingWeek = tasks.filter(
    (task) => taskDateKey(task.scheduledFor) !== today && task.status !== "SKIPPED",
  );
  const overdue = tasks.filter(
    (task) => isOpenTaskStatus(task.status) && taskDateKey(task.scheduledFor) < today,
  );
  return { todayTasks, todayPending, todayCompleted, remainingWeek, overdue };
}

export function buildWeeklyProgress(tasks: StudentPlanTask[], todayKey = "2099-01-01") {
  const metrics = buildWeeklyKocumMetrics(tasks, todayKey, (d) =>
    taskDateKey(d instanceof Date ? d.toISOString() : String(d)),
  );
  return {
    completedCount: metrics.taskCompleted,
    totalCount: metrics.taskTotal,
    remainingCount: metrics.taskOpen,
    percent: metrics.planCompletionPct,
    plannedMinutes: metrics.plannedMinutes,
    completedMinutes: metrics.completedMinutes,
    questionTarget: metrics.questionTarget,
    questionActual: metrics.questionActual,
    plannedLabel: formatMinutesAsHours(metrics.plannedMinutes),
    completedLabel: formatMinutesAsHours(metrics.completedMinutes),
    subjectDistribution: metrics.subjectDistribution,
    overdueCount: metrics.taskOverdue,
  };
}

export function buildTodayFocus(todayPending: StudentPlanTask[]) {
  const summary = buildTodaySummary(todayPending, []);
  if (!summary.totalTasks && !todayPending.length) {
    return {
      headline: "Bugün planında çalışma görünmüyor.",
      detail: null as string | null,
    };
  }

  const durations = todayPending.map((task) => task.durationMinutes).filter((minutes) => minutes > 0);
  const hasCompleteDuration = durations.length === todayPending.length && todayPending.length > 0;
  const totalMinutes = durations.reduce((sum, minutes) => sum + minutes, 0);

  return {
    headline: todayPending.length === 1 ? "Bugün 1 çalışman var." : `Bugün ${todayPending.length} çalışman var.`,
    detail: hasCompleteDuration ? `${totalMinutes} dk` : null,
  };
}

export { formatMinutesAsHours };
