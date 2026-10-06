/**
 * Yön Bugün — öğrencinin "bugün ne yapmalıyım?" görünümü için saf hesap
 * (docs/panel-design-roadmap.md §10.1). Veri okuma sayfada yapılır; burada
 * yalnız onaylı planın görevlerinden bugünün listesi, öncelikli gecikenler ve
 * haftalık ilerleme çıkarılır. Tarih anahtarları İstanbul günüyle üretilir.
 */

import { isCompletedTaskStatus, isOpenTaskStatus, type KocumTaskStatus } from "./plan-tasks";

export type YonTask = {
  id: string;
  title: string;
  subject: string | null;
  topic: string | null;
  status: KocumTaskStatus;
  scheduledFor: Date;
  scheduleMode: "SCHEDULED" | "FLEXIBLE";
  durationMinutes: number;
  actualMinutes: number | null;
  targetType: "QUESTIONS" | "MINUTES" | "PAGES" | "VIDEOS" | "NONE";
  targetValue: number | null;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
};

export type YonDay = { key: string; done: number; total: number; isToday: boolean };

export type YonToday = {
  /** Bugüne planlı görevler (tamamlananlar dahil; liste işaretli gösterir). */
  today: YonTask[];
  /** Tarihi geçmiş açık görevler, en eskisi önce, en fazla 3. */
  overdue: YonTask[];
  overdueTotal: number;
  week: {
    done: number;
    total: number;
    doneMinutes: number;
    plannedMinutes: number;
    days: YonDay[];
  };
  /** Bugün kalan açık görevlerin tahmini süresi. */
  remainingMinutesToday: number;
  openToday: number;
};

const TARGET_UNIT: Record<YonTask["targetType"], string | null> = {
  QUESTIONS: "soru",
  MINUTES: "dk",
  PAGES: "sayfa",
  VIDEOS: "video",
  NONE: null,
};

/** "40 soru" / "30 dk" gibi kısa hedef metni; hedef yoksa null. */
export function yonTargetLabel(task: Pick<YonTask, "targetType" | "targetValue">): string | null {
  const unit = TARGET_UNIT[task.targetType];
  if (!unit || task.targetValue == null || task.targetValue <= 0) return null;
  return `${Math.round(task.targetValue)} ${unit}`;
}

export function isHighPriority(task: Pick<YonTask, "priority">): boolean {
  return task.priority === "HIGH" || task.priority === "URGENT";
}

export function buildYonToday(
  tasks: YonTask[],
  todayKey: string,
  dateKey: (date: Date) => string,
  weekDayKeys: string[],
): YonToday {
  const actionable = tasks.filter((task) => task.status !== "SKIPPED");
  const byTime = (a: YonTask, b: YonTask) => a.scheduledFor.getTime() - b.scheduledFor.getTime();

  const today = actionable.filter((task) => dateKey(task.scheduledFor) === todayKey).sort(byTime);
  const overdueAll = actionable
    .filter((task) => isOpenTaskStatus(task.status) && dateKey(task.scheduledFor) < todayKey)
    .sort(byTime);

  const completed = actionable.filter((task) => isCompletedTaskStatus(task.status));
  const openToday = today.filter((task) => isOpenTaskStatus(task.status));

  return {
    today,
    overdue: overdueAll.slice(0, 3),
    overdueTotal: overdueAll.length,
    week: {
      done: completed.length,
      total: actionable.length,
      doneMinutes: completed.reduce(
        (sum, task) => sum + Math.max(0, task.actualMinutes ?? task.durationMinutes ?? 0),
        0,
      ),
      plannedMinutes: actionable.reduce((sum, task) => sum + Math.max(0, task.durationMinutes || 0), 0),
      days: weekDayKeys.map((key) => {
        const dayTasks = actionable.filter((task) => dateKey(task.scheduledFor) === key);
        return {
          key,
          done: dayTasks.filter((task) => isCompletedTaskStatus(task.status)).length,
          total: dayTasks.length,
          isToday: key === todayKey,
        };
      }),
    },
    remainingMinutesToday: openToday.reduce((sum, task) => sum + Math.max(0, task.durationMinutes || 0), 0),
    openToday: openToday.length,
  };
}
