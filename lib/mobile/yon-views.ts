/**
 * Yön (OK) sunucu okuma modelleri → mobil sözleşme (`lib/mobile-contracts/yon.ts`).
 * SAF dönüştürücüler: yeni iş kuralı YOK. Gün anahtarları, hedef metni,
 * haftalık sayılar ve tamamlama alanları web'in kullandığı yardımcılardan
 * (`buildYonToday`, `buildWeeklyProgress`, `completionFieldsForKind`,
 * `planStatusLabel`) gelir; istemci yeniden hesaplamaz.
 *
 * GİZLİLİK: girdi tiplerinde zaten olmayan alanlar (gizli not, INTERNAL not,
 * personel olayları) burada da üretilemez. Görüşme bağlantısı yalnız
 * https ise taşınır. Taslak plan görevleri mobile çıkmaz.
 */

import type {
  MobileCheckInState,
  MobileYonCoaching,
  MobileYonPlan,
  MobileYonTask,
  MobileYonToday,
  YonCompletionField,
  YonRescheduleReason,
} from "@/lib/mobile-contracts/yon";
import { MOBILE_YON_CONTRACT_VERSION } from "@/lib/mobile-contracts/yon";
import { formatIstanbulDateInput, addIstanbulCalendarDays, istanbulWeekStart } from "@/lib/istanbul-time";
import { completionFieldsForKind, taskKindLabel, taskSourceLabel, type KocumTaskKind, type KocumTaskSource } from "@/lib/kocum/plan-tasks";
import { yonTargetLabel } from "@/lib/kocum/yon-today";
import { buildWeeklyProgress, planStatusLabel } from "@/lib/student-plan-view";
import { checkInLabels, STUDENT_CHECK_IN_WEEKLY_LIMIT } from "@/lib/student-check-in";
import type { YonTodayData } from "@/lib/kocum/yon-today-server";
import type { StudentPlanData } from "@/lib/kocum/student-plan-server";
import type { StudentCheckInData } from "@/lib/panel/student-check-in-server";

export function safeMeetingUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

type TaskInput = {
  id: string;
  title: string;
  subject: string | null;
  topic: string | null;
  status: string;
  scheduledFor: Date;
  scheduleMode: string;
  durationMinutes: number;
  actualMinutes: number | null;
  actualQuestions: number | null;
  targetType: string;
  targetValue: number | null;
  priority: string;
  taskKind: string;
  sourceType: string;
  sourceReferenceId: string | null;
  studentNote: string | null;
};

export function toMobileYonTask(task: TaskInput): MobileYonTask {
  const kind = task.taskKind as KocumTaskKind;
  return {
    id: task.id,
    title: task.title,
    subject: task.subject,
    topic: task.topic,
    status: task.status as MobileYonTask["status"],
    scheduledFor: task.scheduledFor.toISOString(),
    dayKey: formatIstanbulDateInput(task.scheduledFor),
    isFlexible: task.scheduleMode === "FLEXIBLE",
    durationMinutes: task.durationMinutes,
    actualMinutes: task.actualMinutes,
    actualQuestions: task.actualQuestions,
    targetType: task.targetType as MobileYonTask["targetType"],
    targetValue: task.targetValue,
    targetLabel: yonTargetLabel({ targetType: task.targetType as MobileYonTask["targetType"], targetValue: task.targetValue }),
    priority: task.priority as MobileYonTask["priority"],
    sourceLabel: taskSourceLabel(task.sourceType as KocumTaskSource),
    kindLabel: taskKindLabel(kind),
    linkedAssignment: task.sourceType === "ASSIGNMENT" && Boolean(task.sourceReferenceId),
    completionFields: completionFieldsForKind(kind) as YonCompletionField[],
    studentNote: task.studentNote,
  };
}

export function toMobileYonToday(data: YonTodayData, generatedAt = new Date()): MobileYonToday {
  if (data.state === "NO_PROFILE") {
    return { contractVersion: MOBILE_YON_CONTRACT_VERSION, state: "NO_PROFILE", generatedAt: generatedAt.toISOString() };
  }
  const byId = new Map(data.tasks.map((task) => [task.id, task]));
  const map = (task: { id: string }) => toMobileYonTask(byId.get(task.id)!);
  return {
    contractVersion: MOBILE_YON_CONTRACT_VERSION,
    state: "READY",
    generatedAt: generatedAt.toISOString(),
    todayKey: data.todayKey,
    canComplete: data.canComplete && data.hasPlan,
    hasPlan: data.hasPlan,
    nowTaskId: data.nowTaskId,
    today: data.view.today.map(map),
    overdue: data.view.overdue.map(map),
    overdueTotal: data.view.overdueTotal,
    openToday: data.view.openToday,
    remainingMinutesToday: data.view.remainingMinutesToday,
    week: {
      done: data.view.week.done,
      total: data.view.week.total,
      remaining: Math.max(0, data.view.week.total - data.view.week.done),
      doneMinutes: data.view.week.doneMinutes,
      plannedMinutes: data.view.week.plannedMinutes,
      days: data.view.week.days,
    },
    coach: data.coaching ? { name: data.coaching.coachName, overdue: data.coaching.overdue, focus: data.coaching.focus } : null,
    nextSession: data.nextSession
      ? {
          id: data.nextSession.id,
          scheduledAt: data.nextSession.scheduledAt.toISOString(),
          focus: data.nextSession.focus || data.coaching?.focus || null,
          meetingUrl: safeMeetingUrl(data.nextSession.meetingUrl),
          rescheduleRequested: Boolean(data.nextSession.rescheduleRequestedAt),
        }
      : null,
    coachNote: data.latestNote ? { body: data.latestNote.body, at: data.latestNote.at?.toISOString() ?? null } : null,
    goals: data.goals.slice(0, 3).map((goal) => ({
      id: goal.id,
      label: goal.label,
      kind: goal.kind,
      target: goal.target,
      current: goal.current,
      isPercent: goal.kind === "PLAN_COMPLETION",
    })),
    goalsTotal: data.goals.length,
    checkIn: data.flags.studentCheckIn
      ? { submittedThisWeek: data.weeklyCheckIns > 0, lastAt: data.lastCheckIn?.createdAt.toISOString() ?? null }
      : null,
  };
}

/** Öğrenciye yayınlanmış plan durumları: görevler yalnız bunlarda gösterilir. */
const PUBLISHED_PLAN_STATUSES = new Set(["APPROVED", "CHANGE_REQUESTED"]);

export function toMobileYonPlan(data: StudentPlanData | null, input: { now?: Date } = {}): MobileYonPlan {
  const now = input.now ?? new Date();
  if (!data) return { contractVersion: MOBILE_YON_CONTRACT_VERSION, state: "NO_PROFILE", generatedAt: now.toISOString() };
  const { plan, profile, coachSummary, planProduct } = data;
  const todayKey = formatIstanbulDateInput(now);
  const preference = profile.planPreference;
  const published = plan ? PUBLISHED_PLAN_STATUSES.has(plan.status) : false;
  const tasks = plan && published ? plan.tasks : [];
  const progress = buildWeeklyProgress(
    tasks.map((task) => ({
      id: task.id,
      scheduledFor: task.scheduledFor.toISOString(),
      durationMinutes: task.durationMinutes,
      status: task.status,
      actualMinutes: task.actualMinutes,
      targetType: task.targetType,
      targetValue: task.targetValue,
      actualQuestions: task.actualQuestions,
      subject: task.subject,
    })),
    todayKey,
  );
  const weekStart = plan ? istanbulWeekStart(plan.weekStart) : null;
  return {
    contractVersion: MOBILE_YON_CONTRACT_VERSION,
    state: "READY",
    generatedAt: now.toISOString(),
    todayKey,
    plan:
      plan && weekStart
        ? {
            id: plan.id,
            status: plan.status,
            statusLabel: planStatusLabel(plan.status, { autoApproved: plan.autoApproved }),
            version: plan.version,
            weekStart: weekStart.toISOString(),
            weekEnd: addIstanbulCalendarDays(weekStart, 6).toISOString(),
            autoApproved: plan.autoApproved,
            changeRequestCategory: plan.changeRequestCategory,
            tasks: tasks.map(toMobileYonTask),
            draftTaskCount: published ? 0 : plan.tasks.filter((task) => task.status !== "SKIPPED").length,
            // Web ile aynı: yalnız onaylı planda tamamlama ve değişiklik talebi.
            canComplete: plan.status === "APPROVED",
            canRequestChange: plan.status === "APPROVED",
            progress: {
              completed: progress.completedCount,
              total: progress.totalCount,
              remaining: progress.remainingCount,
              plannedMinutes: progress.plannedMinutes,
              completedMinutes: progress.completedMinutes,
              percent: progress.totalCount ? progress.percent : null,
            },
          }
        : null,
    requiresApproval: planProduct.requiresPlanApproval,
    preference: {
      availableDays: Array.isArray(preference?.availableDays)
        ? preference.availableDays.filter((day): day is number => typeof day === "number")
        : [1, 3, 5],
      minutesPerDay: preference?.minutesPerDay || 45,
      nextExamAt: preference?.nextExamAt?.toISOString() ?? null,
      examLabel: preference?.examLabel ?? null,
      planningEnabled: preference?.planningEnabled ?? true,
      overwhelmPulse: preference?.overwhelmPulse ?? null,
    },
    coachSummary: coachSummary
      ? {
          studentVisibleText: coachSummary.studentVisibleText,
          strengths: coachSummary.strengths,
          focusAreas: coachSummary.focusAreas,
          nextWeekFocus: coachSummary.nextWeekFocus,
          weekStart: coachSummary.weekStart.toISOString(),
        }
      : null,
  };
}

type CoachingHub = {
  coaching: {
    coachName: string;
    cadenceDays: number | null;
    nextScheduledAt: Date | null;
    lastCompletedAt: Date | null;
    focus: string | null;
    overdue: boolean;
  } | null;
  sharedNotes: Array<{ id: string; body: string; at: Date }>;
  pastSessions: Array<{ id: string; scheduledAt: Date; completedAt: Date | null; status: string; focus: string | null }>;
  coachTasks: Array<{ id: string; title: string; scheduledFor: Date; durationMinutes: number; status: string }>;
};

type UpcomingSession = {
  id: string;
  version: number;
  scheduledAt: Date;
  meetingUrl: string | null;
  rescheduleRequestedAt: Date | null;
  rescheduleReason: string | null;
  proposedAt: Date | null;
};

export function toMobileYonCoaching(
  hub: CoachingHub | null,
  upcoming: UpcomingSession[] | null,
  input: { adaptivePlanEnabled: boolean; now?: Date },
): MobileYonCoaching {
  const now = input.now ?? new Date();
  if (!hub) return { contractVersion: MOBILE_YON_CONTRACT_VERSION, state: "NO_PROFILE", generatedAt: now.toISOString() };
  return {
    contractVersion: MOBILE_YON_CONTRACT_VERSION,
    state: "READY",
    generatedAt: now.toISOString(),
    coach: hub.coaching
      ? {
          name: hub.coaching.coachName,
          cadenceDays: hub.coaching.cadenceDays,
          nextScheduledAt: hub.coaching.nextScheduledAt?.toISOString() ?? null,
          lastCompletedAt: hub.coaching.lastCompletedAt?.toISOString() ?? null,
          focus: hub.coaching.focus,
          overdue: hub.coaching.overdue,
        }
      : null,
    // Görüşmeler yalnız aktif koç ataması varken (web: koç yoksa bölüm yok).
    upcoming: hub.coaching
      ? (upcoming ?? []).map((session) => ({
          id: session.id,
          version: session.version,
          scheduledAt: session.scheduledAt.toISOString(),
          // Web ile aynı: yeni saat önerisi bekleyen görüşmede eski bağlantı gösterilmez.
          meetingUrl: session.proposedAt ? null : safeMeetingUrl(session.meetingUrl),
          rescheduleRequestedAt: session.rescheduleRequestedAt?.toISOString() ?? null,
          rescheduleReason: (session.rescheduleReason as YonRescheduleReason | null) ?? null,
          proposedAt: session.proposedAt?.toISOString() ?? null,
        }))
      : [],
    past: hub.pastSessions.map((item) => ({
      id: item.id,
      at: (item.completedAt ?? item.scheduledAt).toISOString(),
      status: item.status as "COMPLETED" | "CANCELLED" | "MISSED",
      focus: item.focus,
    })),
    sharedNotes: hub.sharedNotes.map((note) => ({ id: note.id, body: note.body, at: note.at.toISOString() })),
    coachTasks: input.adaptivePlanEnabled
      ? hub.coachTasks.map((task) => ({
          id: task.id,
          title: task.title,
          scheduledFor: task.scheduledFor.toISOString(),
          durationMinutes: task.durationMinutes,
          status: task.status as MobileYonTask["status"],
        }))
      : null,
  };
}

export function toMobileCheckInState(data: StudentCheckInData | null): MobileCheckInState {
  if (!data) return { contractVersion: MOBILE_YON_CONTRACT_VERSION, state: "NO_PROFILE" };
  return {
    contractVersion: MOBILE_YON_CONTRACT_VERSION,
    state: "READY",
    weeklyLimit: STUDENT_CHECK_IN_WEEKLY_LIMIT,
    remaining: data.remaining,
    targets: data.targets.map((target) =>
      target.kind === "GROUP"
        ? { kind: "GROUP" as const, groupId: target.groupId, name: target.name, subject: target.subject }
        : { kind: "COACH" as const, coachAssignmentId: target.coachAssignmentId, name: target.name },
    ),
    history: data.history.map((item) => ({
      id: item.id,
      targetName: item.groupName,
      energy: item.energy,
      confidence: item.confidence,
      barrier: item.barrier,
      shared: item.shared,
      createdAt: item.createdAt.toISOString(),
      request: item.request
        ? {
            id: item.request.id,
            status: item.request.status,
            version: item.request.version,
            helpful: item.request.helpful,
            actionLabel: item.request.action ? checkInLabels.action[item.request.action as keyof typeof checkInLabels.action] ?? null : null,
          }
        : null,
    })),
  };
}
