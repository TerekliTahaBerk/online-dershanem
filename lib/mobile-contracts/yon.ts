/**
 * MOBİL SÖZLEŞME — M3 Yön Koçluk (OK) öğrenci uçları.
 *
 * Her uç için TİP (sunucu yanıtı bu tipe göre yazılır) + DOĞRULAYICI (mobil,
 * yanıtı uygulama durumuna almadan önce çalıştırır). Eklemeli alanlar
 * `v.optional` ile varsayılan alır (MD-12).
 *
 * GİZLİLİK: Bu sözleşmelerin hiçbirinde koçun gizli notu (`privateNote`),
 * INTERNAL koç notu, personel zaman çizelgesi, risk / yönetim sinyali veya
 * taslak plan görevi YOKTUR; alanlar sunucuda seçilmez.
 *
 * Bağımlılıksız; yalnız bu dizindeki dosyalardan göreli içe aktarma.
 */

import type { ContractResult } from "./bootstrap";
import { check, v, type Infer } from "./validate";

export const MOBILE_YON_CONTRACT_VERSION = 1 as const;

/* ------------------------------------------------------------------ *
 * Ortak: plan görevi
 * ------------------------------------------------------------------ */

export const YON_TASK_STATUSES = ["PLANNED", "IN_PROGRESS", "DONE", "PARTIAL", "COULD_NOT", "SKIPPED"] as const;
export type YonTaskStatus = (typeof YON_TASK_STATUSES)[number];
export const YON_TARGET_TYPES = ["QUESTIONS", "MINUTES", "PAGES", "VIDEOS", "NONE"] as const;
export const YON_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export const YON_COMPLETION_FIELDS = [
  "actualQuestions",
  "actualCorrect",
  "actualIncorrect",
  "actualBlank",
  "actualMinutes",
  "studentNote",
  "difficultyFelt",
  "energyFelt",
] as const;
export type YonCompletionField = (typeof YON_COMPLETION_FIELDS)[number];

/** `POST /api/panel/kocum/tasks/[id]/complete` gövdesindeki `status` değerleri. */
export const YON_COMPLETE_STATUSES = ["IN_PROGRESS", "DONE", "PARTIAL", "COULD_NOT"] as const;
export type YonCompleteStatus = (typeof YON_COMPLETE_STATUSES)[number];

const yonTask = v.object({
  id: v.nonEmpty(),
  title: v.nonEmpty(),
  subject: v.nullable(v.string()),
  topic: v.nullable(v.string()),
  status: v.oneOf(YON_TASK_STATUSES),
  scheduledFor: v.iso(),
  /** İstanbul günü (YYYY-MM-DD) — gün gruplaması istemcide yeniden hesaplanmaz. */
  dayKey: v.nonEmpty(),
  /** Esnek görev: saat gösterilmez. */
  isFlexible: v.boolean(),
  durationMinutes: v.int(0),
  actualMinutes: v.nullable(v.int(0)),
  actualQuestions: v.nullable(v.int(0)),
  targetType: v.oneOf(YON_TARGET_TYPES),
  targetValue: v.nullable(v.number()),
  /** "40 soru" gibi hazır metin (`yonTargetLabel`); hedef yoksa null. */
  targetLabel: v.nullable(v.string()),
  priority: v.oneOf(YON_PRIORITIES),
  sourceLabel: v.string(),
  kindLabel: v.string(),
  /** Görev bir OD ödevine bağlı: ilerleme sunucuda tek kayıtta tutulur. */
  linkedAssignment: v.boolean(),
  /** Görev türüne göre gerçekleşen alanları (`completionFieldsForKind`). */
  completionFields: v.array(v.oneOf(YON_COMPLETION_FIELDS)),
  studentNote: v.nullable(v.string()),
});
export type MobileYonTask = Infer<typeof yonTask>;

const nextSession = v.object({
  id: v.nonEmpty(),
  scheduledAt: v.iso(),
  focus: v.nullable(v.string()),
  /** Yalnız https; sunucu dışında bir değer üretilmez. */
  meetingUrl: v.nullable(v.string()),
  rescheduleRequested: v.boolean(),
});

/* ------------------------------------------------------------------ *
 * GET /api/panel/student/yon — Yön Bugün
 * ------------------------------------------------------------------ */

const yonGoalSummary = v.object({
  id: v.nonEmpty(),
  label: v.string(),
  kind: v.string(),
  target: v.number(),
  /** Ölçüm yoksa null — "ölçülmedi" gösterilir, %0 çizilmez. */
  current: v.nullable(v.number()),
  isPercent: v.boolean(),
});

const yonToday = v.union("state", {
  NO_PROFILE: v.object({
    contractVersion: v.literal(MOBILE_YON_CONTRACT_VERSION),
    state: v.literal("NO_PROFILE"),
    generatedAt: v.iso(),
  }),
  READY: v.object({
    contractVersion: v.literal(MOBILE_YON_CONTRACT_VERSION),
    state: v.literal("READY"),
    generatedAt: v.iso(),
    todayKey: v.nonEmpty(),
    /** `adaptivePlan` açık ve plan onaylı: tamamlama kontrolleri gösterilir. */
    canComplete: v.boolean(),
    /** Bu hafta yayında (onaylı) plan var mı. */
    hasPlan: v.boolean(),
    /** "Şimdi" — `buildStudentHomeActionPlan` Yön adaylarından seçilen görev kimliği. */
    nowTaskId: v.nullable(v.string()),
    today: v.array(yonTask),
    overdue: v.array(yonTask),
    overdueTotal: v.int(0),
    openToday: v.int(0),
    remainingMinutesToday: v.int(0),
    week: v.object({
      done: v.int(0),
      total: v.int(0),
      remaining: v.int(0),
      doneMinutes: v.int(0),
      plannedMinutes: v.int(0),
      days: v.array(v.object({ key: v.nonEmpty(), done: v.int(0), total: v.int(0), isToday: v.boolean() })),
    }),
    coach: v.nullable(
      v.object({
        name: v.string(),
        overdue: v.boolean(),
        focus: v.nullable(v.string()),
      }),
    ),
    nextSession: v.nullable(nextSession),
    coachNote: v.nullable(v.object({ body: v.string(), at: v.nullable(v.iso()) })),
    goals: v.array(yonGoalSummary),
    goalsTotal: v.int(0),
    /** `studentCheckIn` kapalıysa null. */
    checkIn: v.nullable(v.object({ submittedThisWeek: v.boolean(), lastAt: v.nullable(v.iso()) })),
  }),
});
export type MobileYonToday = Infer<typeof yonToday>;
export function parseYonToday(input: unknown): ContractResult<MobileYonToday> {
  return check(yonToday, input);
}

/* ------------------------------------------------------------------ *
 * GET /api/panel/student/plan — Planım
 * ------------------------------------------------------------------ */

export const YON_PLAN_STATUSES = ["DRAFT", "APPROVED", "CHANGE_REQUESTED", "ARCHIVED"] as const;
export const YON_CHANGE_CATEGORIES = ["TOO_MUCH", "WRONG_DAYS", "PRIORITY", "OTHER"] as const;
export const YON_OVERLOAD_OPTIONS = ["REDUCE_LIGHT", "REDUCE_HEAVY", "CHANGE_DAYS"] as const;
export type YonOverloadOption = (typeof YON_OVERLOAD_OPTIONS)[number];
export const YON_MINUTES_PER_DAY = [20, 30, 45, 60, 90] as const;
export const YON_EXAM_LABELS = ["LGS", "TYT", "AYT", "YDT", "OKUL SINAVI"] as const;

const yonPreference = v.object({
  availableDays: v.array(v.int(1)),
  minutesPerDay: v.int(0),
  nextExamAt: v.nullable(v.iso()),
  examLabel: v.nullable(v.string()),
  planningEnabled: v.boolean(),
  overwhelmPulse: v.nullable(v.int(1)),
});
export type MobileYonPreference = Infer<typeof yonPreference>;

const yonPlan = v.union("state", {
  NO_PROFILE: v.object({
    contractVersion: v.literal(MOBILE_YON_CONTRACT_VERSION),
    state: v.literal("NO_PROFILE"),
    generatedAt: v.iso(),
  }),
  READY: v.object({
    contractVersion: v.literal(MOBILE_YON_CONTRACT_VERSION),
    state: v.literal("READY"),
    generatedAt: v.iso(),
    todayKey: v.nonEmpty(),
    plan: v.nullable(
      v.object({
        id: v.nonEmpty(),
        status: v.oneOf(YON_PLAN_STATUSES),
        statusLabel: v.string(),
        version: v.int(1),
        weekStart: v.iso(),
        weekEnd: v.iso(),
        autoApproved: v.boolean(),
        changeRequestCategory: v.nullable(v.string()),
        /**
         * Görevler yalnız öğrenciye yayınlanmış (onaylı / değişiklik istenmiş)
         * planda gelir. Taslak planda boş dizi + `draftTaskCount`.
         */
        tasks: v.array(yonTask),
        draftTaskCount: v.int(0),
        canComplete: v.boolean(),
        canRequestChange: v.boolean(),
        progress: v.object({
          completed: v.int(0),
          total: v.int(0),
          remaining: v.int(0),
          plannedMinutes: v.int(0),
          completedMinutes: v.int(0),
          percent: v.nullable(v.number()),
        }),
      }),
    ),
    requiresApproval: v.boolean(),
    preference: yonPreference,
    coachSummary: v.nullable(
      v.object({
        studentVisibleText: v.nullable(v.string()),
        strengths: v.nullable(v.string()),
        focusAreas: v.nullable(v.string()),
        nextWeekFocus: v.nullable(v.string()),
        weekStart: v.iso(),
      }),
    ),
  }),
});
export type MobileYonPlan = Infer<typeof yonPlan>;
export function parseYonPlan(input: unknown): ContractResult<MobileYonPlan> {
  return check(yonPlan, input);
}

/* POST /api/panel/kocum/tasks/[id]/complete (DEĞİŞMEDİ) */
const taskCompleteResult = v.object({ completed: v.literal(true), status: v.oneOf(YON_COMPLETE_STATUSES), repeated: v.boolean() });
export function parseTaskCompleteResult(input: unknown): ContractResult<Infer<typeof taskCompleteResult>> {
  return check(taskCompleteResult, input);
}

/* POST /api/panel/adaptive-plan/[id]/request-change (DEĞİŞMEDİ) */
const changeRequestResult = v.object({ requested: v.literal(true) });
export function parseChangeRequestResult(input: unknown): ContractResult<{ requested: true }> {
  return check(changeRequestResult, input);
}

/* PATCH /api/panel/adaptive-plan/preferences (DEĞİŞMEDİ) */
const preferenceResult = v.object({ saved: v.literal(true) });
export function parsePreferenceResult(input: unknown): ContractResult<{ saved: true }> {
  return check(preferenceResult, input);
}

/* ------------------------------------------------------------------ *
 * GET /api/panel/student/goals (MEVCUT uç; yanıt şekli değişmedi)
 * ------------------------------------------------------------------ */

export const YON_GOAL_KINDS = [
  "SUBJECT_NET",
  "PLAN_COMPLETION",
  "EXAM_TARGET",
  "SCORE_TARGET",
  "SUBJECT_FOCUS",
  "WEEKLY_STUDY_MINUTES",
  "WEEKLY_QUESTION_COUNT",
] as const;

const goalView = v.object({
  id: v.nonEmpty(),
  kind: v.oneOf(YON_GOAL_KINDS),
  label: v.string(),
  target: v.number(),
  current: v.nullable(v.number()),
  percent: v.nullable(v.number()),
  band: v.nullable(v.oneOf(["met", "close", "behind"] as const)),
  nearTermNote: v.nullable(v.string()),
  basis: v.nullable(v.string()),
  status: v.oneOf(["ACTIVE", "ACHIEVED", "PAUSED", "ARCHIVED"] as const),
});
export type MobileGoal = Infer<typeof goalView>;

const goals = v.object({
  profile: v.nullable(v.object({ id: v.nonEmpty() })),
  coachName: v.nullable(v.string()),
  examLine: v.string(),
  targetRank: v.nullable(v.int(0)),
  goals: v.array(goalView),
});
export type MobileGoals = Infer<typeof goals>;
export function parseGoals(input: unknown): ContractResult<MobileGoals> {
  return check(goals, input);
}

/* ------------------------------------------------------------------ *
 * GET /api/panel/student/coaching — Koçum
 * ------------------------------------------------------------------ */

export const YON_RESCHEDULE_REASONS = ["SCHOOL_SCHEDULE", "FAMILY_SCHEDULE", "TECH_ACCESS"] as const;
export type YonRescheduleReason = (typeof YON_RESCHEDULE_REASONS)[number];

const upcomingSession = v.object({
  id: v.nonEmpty(),
  version: v.int(1),
  scheduledAt: v.iso(),
  meetingUrl: v.nullable(v.string()),
  rescheduleRequestedAt: v.nullable(v.iso()),
  rescheduleReason: v.nullable(v.oneOf(YON_RESCHEDULE_REASONS)),
  /** Koçun önerdiği yeni saat (onay web'de). */
  proposedAt: v.nullable(v.iso()),
});
export type MobileCoachingSession = Infer<typeof upcomingSession>;

const yonCoaching = v.union("state", {
  NO_PROFILE: v.object({
    contractVersion: v.literal(MOBILE_YON_CONTRACT_VERSION),
    state: v.literal("NO_PROFILE"),
    generatedAt: v.iso(),
  }),
  READY: v.object({
    contractVersion: v.literal(MOBILE_YON_CONTRACT_VERSION),
    state: v.literal("READY"),
    generatedAt: v.iso(),
    coach: v.nullable(
      v.object({
        name: v.string(),
        cadenceDays: v.nullable(v.int(0)),
        nextScheduledAt: v.nullable(v.iso()),
        lastCompletedAt: v.nullable(v.iso()),
        focus: v.nullable(v.string()),
        overdue: v.boolean(),
      }),
    ),
    upcoming: v.array(upcomingSession),
    past: v.array(
      v.object({
        id: v.nonEmpty(),
        at: v.iso(),
        status: v.oneOf(["COMPLETED", "CANCELLED", "MISSED"] as const),
        focus: v.nullable(v.string()),
      }),
    ),
    sharedNotes: v.array(v.object({ id: v.nonEmpty(), body: v.string(), at: v.iso() })),
    /** `adaptivePlan` kapalıysa null (web ile aynı: bölüm metinle kalır). */
    coachTasks: v.nullable(
      v.array(
        v.object({
          id: v.nonEmpty(),
          title: v.string(),
          scheduledFor: v.iso(),
          durationMinutes: v.int(0),
          status: v.oneOf(YON_TASK_STATUSES),
        }),
      ),
    ),
  }),
});
export type MobileYonCoaching = Infer<typeof yonCoaching>;
export function parseYonCoaching(input: unknown): ContractResult<MobileYonCoaching> {
  return check(yonCoaching, input);
}

/* POST /api/panel/coaching-sessions/[id] — yalnız REQUEST (DEĞİŞMEDİ) */
const coachingMutationResult = v.object({ id: v.nonEmpty(), version: v.int(1) });
export function parseCoachingMutationResult(input: unknown): ContractResult<{ id: string; version: number }> {
  return check(coachingMutationResult, input);
}

/* ------------------------------------------------------------------ *
 * GET /api/panel/student/check-in — ortak (OD + Yön) check-in durumu
 * ------------------------------------------------------------------ */

export const CHECK_IN_ENERGY = ["LOW", "STEADY", "GOOD"] as const;
export const CHECK_IN_CONFIDENCE = ["NEED_GUIDANCE", "BUILDING", "CONFIDENT"] as const;
export const CHECK_IN_BARRIERS = ["NONE", "NOT_UNDERSTANDING", "TIME_LOAD", "ACCESS_TECH", "NEED_EXAMPLE", "OTHER"] as const;
export const HELP_REQUEST_STATUSES = ["OPEN", "RESPONDED", "CLOSED"] as const;

const checkInTarget = v.union("kind", {
  GROUP: v.object({ kind: v.literal("GROUP"), groupId: v.nonEmpty(), name: v.string(), subject: v.nullable(v.string()) }),
  COACH: v.object({ kind: v.literal("COACH"), coachAssignmentId: v.nonEmpty(), name: v.string() }),
});
export type MobileCheckInTarget = Infer<typeof checkInTarget>;

const checkInHistoryItem = v.object({
  id: v.nonEmpty(),
  targetName: v.string(),
  energy: v.oneOf(CHECK_IN_ENERGY),
  confidence: v.oneOf(CHECK_IN_CONFIDENCE),
  barrier: v.oneOf(CHECK_IN_BARRIERS),
  shared: v.boolean(),
  createdAt: v.iso(),
  request: v.nullable(
    v.object({
      id: v.nonEmpty(),
      status: v.string(),
      version: v.int(1),
      helpful: v.nullable(v.boolean()),
      /** Öğretmen / koç yanıtının hazır etiketi (`checkInLabels.action`). */
      actionLabel: v.nullable(v.string()),
    }),
  ),
});
export type MobileCheckInHistoryItem = Infer<typeof checkInHistoryItem>;

const checkInState = v.union("state", {
  NO_PROFILE: v.object({
    contractVersion: v.literal(MOBILE_YON_CONTRACT_VERSION),
    state: v.literal("NO_PROFILE"),
  }),
  READY: v.object({
    contractVersion: v.literal(MOBILE_YON_CONTRACT_VERSION),
    state: v.literal("READY"),
    weeklyLimit: v.int(0),
    remaining: v.int(0),
    targets: v.array(checkInTarget),
    history: v.array(checkInHistoryItem),
  }),
});
export type MobileCheckInState = Infer<typeof checkInState>;
export function parseCheckInState(input: unknown): ContractResult<MobileCheckInState> {
  return check(checkInState, input);
}

/* POST /api/panel/student-check-ins (DEĞİŞMEDİ) */
const checkInCreated = v.object({ created: v.literal(true), remaining: v.int(0) });
export function parseCheckInCreated(input: unknown): ContractResult<{ created: true; remaining: number }> {
  return check(checkInCreated, input);
}

/* POST /api/panel/student-help-requests/[id]/feedback (DEĞİŞMEDİ) */
const helpFeedbackResult = v.object({ saved: v.literal(true), status: v.string() });
export function parseHelpFeedbackResult(input: unknown): ContractResult<{ saved: true; status: string }> {
  return check(helpFeedbackResult, input);
}
