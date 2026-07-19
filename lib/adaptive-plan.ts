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

export type PlannedTask = Omit<PlanCandidate, "priority" | "dueAt"> & {
  scheduledFor: Date;
  position: number;
};

export function planningWeekStart(now = new Date()): Date {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  if (day === 7) date.setUTCDate(date.getUTCDate() + 7);
  return date;
}

function isoDay(date: Date): number {
  return date.getUTCDay() || 7;
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
  const today = new Date(Date.UTC(input.now.getUTCFullYear(), input.now.getUTCMonth(), input.now.getUTCDate()));
  const available = new Set(input.availableDays);
  const days = Array.from({ length: 7 }, (_, index) => new Date(weekStart.getTime() + index * 86400000)).filter((day) => day >= today && available.has(isoDay(day)));
  const candidates = [...input.candidates].sort((a, b) => b.priority - a.priority || (a.dueAt?.getTime() || Number.MAX_SAFE_INTEGER) - (b.dueAt?.getTime() || Number.MAX_SAFE_INTEGER) || a.title.localeCompare(b.title, "tr"));
  const result: PlannedTask[] = [];

  for (const day of days) {
    let usedMinutes = 0;
    let position = 1;
    for (let index = 0; index < candidates.length && position <= input.maxTasksPerDay;) {
      const candidate = candidates[index];
      if (usedMinutes + candidate.durationMinutes > input.minutesPerDay) { index += 1; continue; }
      result.push({ sourceType: candidate.sourceType, sourceReferenceId: candidate.sourceReferenceId, title: candidate.title, durationMinutes: candidate.durationMinutes, reasonCode: candidate.reasonCode, scheduledFor: day, position });
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
