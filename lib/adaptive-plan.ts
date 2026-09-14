import {
  addIstanbulCalendarDays,
  istanbulDayStart,
  istanbulIsoWeekday,
  istanbulWeekStart,
} from "./istanbul-time";

export const ADAPTIVE_PLAN_RULE_VERSION = "adaptive-v1";

export type PlanCandidate = {
  sourceType: "ASSIGNMENT" | "REVIEW" | "WEAK_OUTCOME" | "EXAM_PREP" | "RECOVERY";
  sourceReferenceId?: string;
  title: string;
  durationMinutes: number;
  reasonCode: "DUE_SOON" | "REVIEW_DUE" | "NEEDS_REVIEW" | "EXAM_APPROACHING" | "CAPACITY_BALANCE" | "MISSED_LESSON";
  priority: number;
  dueAt?: Date | null;
  signalMeta?: {
    source: "ODK_RESULT";
    confidence: number;
    evidenceCount: number;
    questionCount: number;
    latestAccuracy: number;
    previousAccuracy: number | null;
  };
};

export type CandidateScoreBreakdown = {
  urgency: number;
  learningImpact: number;
  recency: number;
  confidence: number;
  teacherIntent: number;
  examProximity: number;
  overloadPenalty: number;
  repetitionPenalty: number;
};

export type PlannedTask = Omit<PlanCandidate, "priority" | "dueAt"> & {
  scheduledFor: Date;
  position: number;
  score?: number;
  scoreBreakdown?: CandidateScoreBreakdown;
};

/**
 * Planlanan görevi `WeeklyPlanTask` satırına indirger. `score`, `scoreBreakdown`
 * ve `signalMeta` açıklama içindir, kolonu yoktur; görev nesnesini doğrudan
 * yaymak `createMany`'yi Prisma doğrulamasıyla düşürüyor ve plan hiç oluşmuyordu.
 */
export function plannedTaskRows(planId: string, tasks: PlannedTask[]) {
  return tasks.map((task) => ({
    planId,
    sourceType: task.sourceType,
    sourceReferenceId: task.sourceReferenceId ?? null,
    title: task.title,
    durationMinutes: task.durationMinutes,
    reasonCode: task.reasonCode,
    scheduledFor: task.scheduledFor,
    position: task.position,
  }));
}

export type AdaptivePlanConfig = {
  urgency: Record<PlanCandidate["reasonCode"], number>;
  learningImpact: Record<PlanCandidate["reasonCode"], number>;
  recencyHalfLifeDays: Record<PlanCandidate["reasonCode"], number>;
  confidenceFloor: number;
  overloadPenaltyPerTask: number;
  repetitionPenaltyPerDuplicate: number;
  examProximityBoostDays: number;
};

export const ADAPTIVE_PLAN_CONFIG: AdaptivePlanConfig = {
  urgency: { DUE_SOON: 20, REVIEW_DUE: 18, NEEDS_REVIEW: 16, EXAM_APPROACHING: 14, CAPACITY_BALANCE: 10, MISSED_LESSON: 22 },
  learningImpact: { DUE_SOON: 20, REVIEW_DUE: 18, NEEDS_REVIEW: 22, EXAM_APPROACHING: 16, CAPACITY_BALANCE: 10, MISSED_LESSON: 24 },
  recencyHalfLifeDays: { DUE_SOON: 7, REVIEW_DUE: 14, NEEDS_REVIEW: 21, EXAM_APPROACHING: 10, CAPACITY_BALANCE: 30, MISSED_LESSON: 14 },
  confidenceFloor: 0.55,
  overloadPenaltyPerTask: 4,
  repetitionPenaltyPerDuplicate: 12,
  examProximityBoostDays: 14,
};

/**
 * SINAV GERİ SAYIMI — plan yoğunluğu çarpanı (saf fonksiyon).
 *
 * Yalnız sınav tarihi BİLİNEN ve geri sayımı olan ürünlerde (KPSS) devreye alınır;
 * çağıran taraf bunu ürün kimliğine göre seçer. Online Koçum planları bu
 * fonksiyona hiç uğramaz, kapasiteleri değişmez.
 *
 * Neden `EXAM_APPROACHING` aday puanı yetmiyor: o puan bir görevin SIRASINI
 * değiştirir, günün TOPLAM kapasitesini değil. Sınava 3 hafta kalan adayın
 * sorunu görev sıralaması değil, gereken çalışma hacmidir.
 */
export type ExamCountdownTier = "NONE" | "FAR" | "APPROACHING" | "NEAR" | "FINAL_WEEK";

export type ExamCountdownCapacity = {
  tier: ExamCountdownTier;
  /** Sınava kalan tam hafta; sınav yoksa veya geçmişse `null`. */
  weeksRemaining: number | null;
  minutesPerDay: number;
  maxTasksPerDay: number;
};

/**
 * Üst sınırlar. Çarpan ne olursa olsun plan insanüstü bir güne dönüşmemeli:
 * geri sayım paniği öğrenciyi hiç açmayacağı bir listeyle baş başa bırakmaz.
 */
export const EXAM_COUNTDOWN_MAX_MINUTES_PER_DAY = 180;
export const EXAM_COUNTDOWN_MAX_TASKS_PER_DAY = 5;

/** Sınava kalan tam hafta sayısı. Sınav yoksa veya geçmişse `null`. */
export function examCountdownWeeks(now: Date, examAt: Date | null | undefined): number | null {
  if (!examAt) return null;
  const remainingMs = examAt.getTime() - now.getTime();
  if (remainingMs <= 0) return null;
  return Math.floor(remainingMs / (7 * 86_400_000));
}

/**
 * Sınav yaklaştıkça günlük dakika ve görev kapasitesini kademeli artırır.
 * Sınav yoksa/geçmişse taban kapasite aynen döner — yani bu fonksiyon
 * kapasiteyi ASLA düşürmez.
 */
export function examCountdownCapacity(input: {
  now: Date;
  examAt: Date | null | undefined;
  minutesPerDay: number;
  maxTasksPerDay: number;
}): ExamCountdownCapacity {
  const weeksRemaining = examCountdownWeeks(input.now, input.examAt);
  const base = {
    weeksRemaining,
    minutesPerDay: input.minutesPerDay,
    maxTasksPerDay: input.maxTasksPerDay,
  };
  if (weeksRemaining === null) return { ...base, tier: "NONE" };

  const { tier, minutesMultiplier, extraTasks } =
    weeksRemaining < 1
      ? { tier: "FINAL_WEEK" as const, minutesMultiplier: 1.5, extraTasks: 1 }
      : weeksRemaining < 4
        ? { tier: "NEAR" as const, minutesMultiplier: 1.3, extraTasks: 1 }
        : weeksRemaining < 8
          ? { tier: "APPROACHING" as const, minutesMultiplier: 1.15, extraTasks: 0 }
          : { tier: "FAR" as const, minutesMultiplier: 1, extraTasks: 0 };

  return {
    tier,
    weeksRemaining,
    minutesPerDay: Math.min(
      EXAM_COUNTDOWN_MAX_MINUTES_PER_DAY,
      Math.round(input.minutesPerDay * minutesMultiplier),
    ),
    maxTasksPerDay: Math.min(
      EXAM_COUNTDOWN_MAX_TASKS_PER_DAY,
      input.maxTasksPerDay + extraTasks,
    ),
  };
}

export function planningWeekStart(now = new Date()): Date {
  return istanbulWeekStart(now, istanbulIsoWeekday(now) === 7 ? 1 : 0);
}

/** Günlük görev ve dakika kapasitesini asla aşmayan açıklanabilir v1 çözücü. */
export function buildAdaptiveWeek(input: {
  now: Date;
  availableDays: number[];
  minutesPerDay: number;
  maxTasksPerDay: number;
  candidates: PlanCandidate[];
}): PlannedTask[] {
  const weekStart = planningWeekStart(input.now);
  const today = istanbulDayStart(input.now);
  const available = new Set(input.availableDays);
  const days = Array.from({ length: 7 }, (_, index) => addIstanbulCalendarDays(weekStart, index)).filter((day) => day >= today && available.has(istanbulIsoWeekday(day)));
  const candidates = [...input.candidates].map((candidate) => {
    const urgency = ADAPTIVE_PLAN_CONFIG.urgency[candidate.reasonCode];
    const learningImpact = ADAPTIVE_PLAN_CONFIG.learningImpact[candidate.reasonCode];
    const recencyHalfLife = ADAPTIVE_PLAN_CONFIG.recencyHalfLifeDays[candidate.reasonCode];
    const daysOld = candidate.dueAt ? Math.max(0, (input.now.getTime() - candidate.dueAt.getTime()) / 86_400_000) : 0;
    const recency = Math.max(0, Math.round(20 * Math.pow(0.5, daysOld / recencyHalfLife)));
    const confidence = Math.round(20 * Math.max(ADAPTIVE_PLAN_CONFIG.confidenceFloor, Math.min(1, candidate.priority / 100)));
    const teacherIntent = candidate.reasonCode === "NEEDS_REVIEW" ? 8 : 0;
    const examProximity = candidate.reasonCode === "EXAM_APPROACHING" && candidate.dueAt ? Math.max(0, 12 - Math.floor((candidate.dueAt.getTime() - input.now.getTime()) / 86_400_000)) : 0;
    return {
      candidate,
      breakdown: {
        urgency,
        learningImpact,
        recency,
        confidence,
        teacherIntent,
        examProximity,
        overloadPenalty: 0,
        repetitionPenalty: 0,
      },
      priority: urgency + learningImpact + recency + confidence + teacherIntent + examProximity,
    };
  }).sort((a, b) => b.priority - a.priority || (a.candidate.dueAt?.getTime() || Number.MAX_SAFE_INTEGER) - (b.candidate.dueAt?.getTime() || Number.MAX_SAFE_INTEGER) || a.candidate.title.localeCompare(b.candidate.title, "tr"));
  const result: PlannedTask[] = [];

  for (const day of days) {
    let usedMinutes = 0;
    let position = 1;
    for (let index = 0; index < candidates.length && position <= input.maxTasksPerDay;) {
      const item = candidates[index];
      const candidate = item.candidate;
      if (usedMinutes + candidate.durationMinutes > input.minutesPerDay) { index += 1; continue; }
      result.push({ sourceType: candidate.sourceType, sourceReferenceId: candidate.sourceReferenceId, title: candidate.title, durationMinutes: candidate.durationMinutes, reasonCode: candidate.reasonCode, scheduledFor: day, position, score: item.priority, scoreBreakdown: item.breakdown });
      usedMinutes += candidate.durationMinutes;
      position += 1;
      candidates.splice(index, 1);
    }
  }
  return result;
}

export function planReasonLabel(reason: PlannedTask["reasonCode"]): string {
  return {
    DUE_SOON: "Son tarihi yaklaştığı için önce",
    REVIEW_DUE: "Hatırlama zamanı geldiği için",
    NEEDS_REVIEW: "Öğretmen tekrar gerekli dediği için",
    EXAM_APPROACHING: "Yaklaşan sınava küçük bir adım olduğu için",
    CAPACITY_BALANCE: "Günlük çalışma sürene uyduğu için",
    MISSED_LESSON: "Kaçırdığın dersin 72 saatlik küçük telafisi olduğu için",
  }[reason];
}
