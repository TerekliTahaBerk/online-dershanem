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
