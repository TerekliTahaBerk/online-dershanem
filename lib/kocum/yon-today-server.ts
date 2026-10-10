import "server-only";

import { prisma } from "@/lib/prisma";
import { getPanelFeatureFlags, type PanelFeatureFlags } from "@/lib/panel-feature-flags";
import { getStudentCoaching, type CoachingSnapshot } from "@/lib/panel/coaching";
import { getStudentGoals, type GoalView } from "@/lib/panel/goals";
import { buildStudentHomeActionPlan } from "@/lib/panel/student-home-actions";
import { buildYonToday, type YonTask, type YonToday } from "@/lib/kocum/yon-today";
import { addIstanbulCalendarDays, formatIstanbulDateInput, istanbulWeekStart } from "@/lib/istanbul-time";
import { studentCheckInWeekEnd, studentCheckInWeekStart } from "@/lib/student-check-in";

/**
 * Yön Bugün — okuma tarafı TEK yerde. `app/panel/ogrenci/yon/page.tsx` ve
 * `GET /api/panel/student/yon` aynı fonksiyonu çağırır; web ile mobil aynı
 * görevleri, aynı gecikenleri ve aynı haftalık sayıları görür.
 *
 * GİZLİLİK: Görüşmenin `privateNote`'u ve INTERNAL koç notları SEÇİLMEZ;
 * yalnız onaylı (yayında) planın görevleri okunur — taslak plan öğrenciye
 * gösterilmez.
 */

/** Yön görev satırı + mobilin ihtiyaç duyduğu ek (salt okunur) alanlar. */
export type YonTaskRow = YonTask & {
  taskKind: string;
  sourceType: string;
  sourceReferenceId: string | null;
  reasonCode: string;
  actualQuestions: number | null;
  studentNote: string | null;
};

export type YonTodayData =
  | { state: "NO_PROFILE"; flags: PanelFeatureFlags }
  | {
      state: "READY";
      flags: PanelFeatureFlags;
      now: Date;
      todayKey: string;
      weekDays: Date[];
      hasPlan: boolean;
      tasks: YonTaskRow[];
      view: YonToday;
      canComplete: boolean;
      nowTaskId: string | null;
      coaching: CoachingSnapshot | null;
      goals: GoalView[];
      nextSession: {
        id: string;
        scheduledAt: Date;
        meetingUrl: string | null;
        focus: string | null;
        rescheduleRequestedAt: Date | null;
      } | null;
      latestNote: { body: string; at: Date | null } | null;
      weeklyCheckIns: number;
      lastCheckIn: { createdAt: Date } | null;
    };

const TASK_SELECT = {
  id: true,
  title: true,
  subject: true,
  topic: true,
  status: true,
  scheduledFor: true,
  scheduleMode: true,
  durationMinutes: true,
  actualMinutes: true,
  targetType: true,
  targetValue: true,
  priority: true,
  taskKind: true,
  sourceType: true,
  sourceReferenceId: true,
  reasonCode: true,
  actualQuestions: true,
  studentNote: true,
} as const;

export async function loadYonToday(input: { userId: string; now?: Date }): Promise<YonTodayData> {
  const flags = getPanelFeatureFlags();
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: input.userId },
    select: { id: true },
  });
  if (!profile) return { state: "NO_PROFILE", flags };

  const now = input.now ?? new Date();
  const weekStart = istanbulWeekStart(now);
  const weekDays = Array.from({ length: 7 }, (_, index) => addIstanbulCalendarDays(weekStart, index));
  const weekDayKeys = weekDays.map((day) => formatIstanbulDateInput(day));
  const todayKey = formatIstanbulDateInput(now);

  const [coaching, goals, plan, nextSession, visibleNote, weeklyCheckIns, lastCheckIn] = await Promise.all([
    getStudentCoaching(profile.id),
    getStudentGoals(profile.id),
    prisma.weeklyPlan.findFirst({
      where: { studentId: profile.id, status: "APPROVED", weekStart: { gte: weekStart, lt: addIstanbulCalendarDays(weekStart, 7) } },
      orderBy: { weekStart: "desc" },
      select: {
        id: true,
        tasks: {
          orderBy: [{ scheduledFor: "asc" }, { position: "asc" }],
          select: TASK_SELECT,
        },
      },
    }),
    prisma.coachingSession.findFirst({
      where: { status: "PLANNED", scheduledAt: { gte: addIstanbulCalendarDays(now, 0) }, assignment: { studentId: profile.id, endedAt: null } },
      orderBy: { scheduledAt: "asc" },
      // privateNote BİLEREK seçilmiyor.
      select: { id: true, scheduledAt: true, meetingUrl: true, focus: true, rescheduleRequestedAt: true },
    }),
    prisma.coachNote.findFirst({
      // Öğrenci yalnız STUDENT_VISIBLE ve PARENT_VISIBLE notları görür (`canViewerSeeCoachNote`).
      where: { studentId: profile.id, visibility: { in: ["STUDENT_VISIBLE", "PARENT_VISIBLE"] } },
      orderBy: { createdAt: "desc" },
      select: { body: true, createdAt: true },
    }),
    flags.studentCheckIn
      ? prisma.studentCheckIn.count({
          where: { studentId: profile.id, createdAt: { gte: studentCheckInWeekStart(now), lt: studentCheckInWeekEnd(now) } },
        })
      : Promise.resolve(0),
    flags.studentCheckIn
      ? prisma.studentCheckIn.findFirst({
          where: { studentId: profile.id },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        })
      : Promise.resolve(null),
  ]);

  const tasks = (plan?.tasks ?? []) as YonTaskRow[];
  const view = buildYonToday(tasks, todayKey, formatIstanbulDateInput, weekDayKeys);

  // Koçun en yeni paylaşılan sözü: görünür not veya son görüşmenin paylaşılan notu.
  const latestNote =
    visibleNote && (!coaching?.lastCompletedAt || visibleNote.createdAt >= coaching.lastCompletedAt)
      ? { body: visibleNote.body, at: visibleNote.createdAt }
      : coaching?.sharedNote
        ? { body: coaching.sharedNote, at: coaching.lastCompletedAt }
        : visibleNote
          ? { body: visibleNote.body, at: visibleNote.createdAt }
          : null;

  return {
    state: "READY",
    flags,
    now,
    todayKey,
    weekDays,
    hasPlan: Boolean(plan),
    tasks,
    view,
    canComplete: flags.adaptivePlan,
    nowTaskId: selectYonNowTask(tasks, todayKey, now),
    coaching,
    goals,
    nextSession,
    latestNote,
    weeklyCheckIns,
    lastCheckIn,
  };
}

/**
 * "Şimdi" — YENİ öncelik kuralı yazılmaz: öğrenci ana sayfasının eylem
 * planı (`buildStudentHomeActionPlan`) yalnız Yön adaylarıyla (geciken ve
 * bugünkü PLANNED görevler) çağrılır; seçilen adayın görev kimliği döner.
 */
function selectYonNowTask(tasks: YonTaskRow[], todayKey: string, now: Date): string | null {
  const rows = tasks
    .filter((task) => task.status === "PLANNED")
    .map((task) => ({
      id: task.id,
      title: task.title,
      durationMinutes: task.durationMinutes,
      scheduledFor: task.scheduledFor,
      status: task.status,
      sourceType: task.sourceType as never,
      sourceReferenceId: task.sourceReferenceId,
      reasonCode: task.reasonCode as never,
      dayKey: formatIstanbulDateInput(task.scheduledFor),
    }));
  const plan = buildStudentHomeActionPlan({
    now,
    products: ["OK"],
    productData: {
      OD: null,
      ODK: null,
      SHARED: null,
      OK: {
        weeklyPlan: null,
        todayTasks: rows.filter((row) => row.dayKey === todayKey),
        overdueTasks: rows.filter((row) => row.dayKey < todayKey),
      },
    },
  });
  return plan.nowAction?.completionTaskId ?? null;
}
