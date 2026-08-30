import { formatIstanbulDateInput } from "@/lib/istanbul-time";

export type StudentPlanStatus = "DRAFT" | "APPROVED" | "CHANGE_REQUESTED" | "ARCHIVED";
export type StudentPlanTaskStatus = "PLANNED" | "DONE" | "SKIPPED";

export type StudentPlanTask = {
  id: string;
  scheduledFor: string;
  durationMinutes: number;
  status: StudentPlanTaskStatus;
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
  return {
    PLANNED: "Bekliyor",
    DONE: "Tamamlandı",
    SKIPPED: "Yeniden planlanacak",
  }[status];
}

export function splitPlanTasks<T extends StudentPlanTask>(tasks: T[], today: string) {
  const todayTasks = tasks.filter((task) => taskDateKey(task.scheduledFor) === today);
  const todayPending = todayTasks.filter((task) => task.status === "PLANNED");
  const todayCompleted = todayTasks.filter((task) => task.status === "DONE");
  const remainingWeek = tasks.filter(
    (task) => taskDateKey(task.scheduledFor) !== today && task.status !== "SKIPPED",
  );
  return { todayTasks, todayPending, todayCompleted, remainingWeek };
}

export function buildWeeklyProgress(tasks: StudentPlanTask[]) {
  const actionable = tasks.filter((task) => task.status !== "SKIPPED");
  const completed = actionable.filter((task) => task.status === "DONE");
  const remaining = actionable.filter((task) => task.status === "PLANNED");
  return {
    completedCount: completed.length,
    totalCount: actionable.length,
    remainingCount: remaining.length,
    percent: actionable.length ? Math.round((completed.length / actionable.length) * 100) : 0,
  };
}

export function buildTodayFocus(todayPending: StudentPlanTask[]) {
  if (!todayPending.length) {
    return {
      headline: "Bugün planında çalışma görünmüyor.",
      detail: null as string | null,
    };
  }

  const durations = todayPending.map((task) => task.durationMinutes).filter((minutes) => minutes > 0);
  const hasCompleteDuration = durations.length === todayPending.length;
  const totalMinutes = durations.reduce((sum, minutes) => sum + minutes, 0);

  return {
    headline: todayPending.length === 1 ? "Bugün 1 çalışman var." : `Bugün ${todayPending.length} çalışman var.`,
    detail: hasCompleteDuration ? `${totalMinutes} dk` : null,
  };
}
