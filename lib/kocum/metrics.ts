/**
 * Online Koçum — planlanan vs gerçekleşen metrikleri.
 * Timezone: Europe/Istanbul (tarih anahtarları çağıran tarafta İstanbul günüyle üretilir).
 */

import {
  isCompletedTaskStatus,
  isOpenTaskStatus,
  type KocumTaskStatus,
} from "./plan-tasks";

export type MetricTask = {
  id: string;
  status: KocumTaskStatus;
  scheduledFor: string | Date;
  durationMinutes: number;
  actualMinutes?: number | null;
  targetType?: "QUESTIONS" | "MINUTES" | "PAGES" | "VIDEOS" | "NONE" | null;
  targetValue?: number | null;
  actualQuestions?: number | null;
  subject?: string | null;
};

export type WeeklyKocumMetrics = {
  taskTotal: number;
  taskCompleted: number;
  taskOpen: number;
  taskOverdue: number;
  planCompletionPct: number;
  plannedMinutes: number;
  completedMinutes: number;
  questionTarget: number;
  questionActual: number;
  subjectDistribution: Array<{ subject: string; plannedMinutes: number; actualMinutes: number }>;
};

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function isTaskOverdue(task: MetricTask, todayKey: string, dateKey: (d: Date) => string): boolean {
  if (!isOpenTaskStatus(task.status)) return false;
  return dateKey(toDate(task.scheduledFor)) < todayKey;
}

export function buildWeeklyKocumMetrics(
  tasks: MetricTask[],
  todayKey: string,
  dateKey: (d: Date) => string,
): WeeklyKocumMetrics {
  const actionable = tasks.filter((t) => t.status !== "SKIPPED");
  const completed = actionable.filter((t) => isCompletedTaskStatus(t.status));
  const open = actionable.filter((t) => isOpenTaskStatus(t.status));
  const overdue = open.filter((t) => isTaskOverdue(t, todayKey, dateKey));

  const plannedMinutes = actionable.reduce((sum, t) => sum + Math.max(0, t.durationMinutes || 0), 0);
  const completedMinutes = completed.reduce((sum, t) => {
    if (t.actualMinutes != null && t.actualMinutes >= 0) return sum + t.actualMinutes;
    return sum + Math.max(0, t.durationMinutes || 0);
  }, 0);

  const questionTasks = actionable.filter((t) => t.targetType === "QUESTIONS");
  const questionTarget = questionTasks.reduce((sum, t) => sum + Math.max(0, t.targetValue || 0), 0);
  const questionActual = questionTasks.reduce((sum, t) => {
    if (t.actualQuestions != null) return sum + Math.max(0, t.actualQuestions);
    if (isCompletedTaskStatus(t.status) && t.targetValue != null) return sum + Math.max(0, t.targetValue);
    return sum;
  }, 0);

  const bySubject = new Map<string, { plannedMinutes: number; actualMinutes: number }>();
  for (const task of actionable) {
    const subject = (task.subject || "Diğer").trim() || "Diğer";
    const row = bySubject.get(subject) || { plannedMinutes: 0, actualMinutes: 0 };
    row.plannedMinutes += Math.max(0, task.durationMinutes || 0);
    if (isCompletedTaskStatus(task.status)) {
      row.actualMinutes +=
        task.actualMinutes != null ? Math.max(0, task.actualMinutes) : Math.max(0, task.durationMinutes || 0);
    }
    bySubject.set(subject, row);
  }

  return {
    taskTotal: actionable.length,
    taskCompleted: completed.length,
    taskOpen: open.length,
    taskOverdue: overdue.length,
    planCompletionPct: actionable.length
      ? Math.round((completed.length / actionable.length) * 100)
      : 0,
    plannedMinutes,
    completedMinutes,
    questionTarget,
    questionActual,
    subjectDistribution: [...bySubject.entries()]
      .map(([subject, values]) => ({ subject, ...values }))
      .sort((a, b) => b.plannedMinutes - a.plannedMinutes || a.subject.localeCompare(b.subject, "tr")),
  };
}

export function formatMinutesAsHours(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}dk`;
  if (m === 0) return `${h}s`;
  return `${h}s ${m}dk`;
}

export type TodaySummary = {
  totalTasks: number;
  estimatedMinutes: number;
  completedCount: number;
  overdueCount: number;
  nextTaskId: string | null;
};

export function buildTodaySummary(
  todayTasks: MetricTask[],
  overdueTasks: MetricTask[],
): TodaySummary {
  const open = todayTasks.filter((t) => isOpenTaskStatus(t.status));
  const completed = todayTasks.filter((t) => isCompletedTaskStatus(t.status));
  const next = [...open].sort(
    (a, b) => toDate(a.scheduledFor).getTime() - toDate(b.scheduledFor).getTime(),
  )[0];

  return {
    totalTasks: todayTasks.filter((t) => t.status !== "SKIPPED").length,
    estimatedMinutes: open.reduce((sum, t) => sum + Math.max(0, t.durationMinutes || 0), 0),
    completedCount: completed.length,
    overdueCount: overdueTasks.length,
    nextTaskId: next?.id ?? null,
  };
}
