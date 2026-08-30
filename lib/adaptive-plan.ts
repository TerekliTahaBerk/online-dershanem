import {
  addIstanbulCalendarDays,
  istanbulDayStart,
  istanbulIsoWeekday,
  istanbulWeekStart,
} from "./istanbul-time";

export const ADAPTIVE_PLAN_RULE_VERSION = "adaptive-v2";
export const ADAPTIVE_SCORE_VERSION = "adaptive-score-v2";

export type PlanSourceType = "ASSIGNMENT" | "REVIEW" | "WEAK_OUTCOME" | "EXAM_PREP" | "RECOVERY";
export type PlanReasonCode = "DUE_SOON" | "REVIEW_DUE" | "NEEDS_REVIEW" | "EXAM_APPROACHING" | "CAPACITY_BALANCE" | "MISSED_LESSON";
export type ReviewSignal = "WRONG" | "UNSURE" | "CORRECT";

export type ScoreComponent = {
  key: "source" | "urgency" | "recency" | "confidence" | "conflict";
  points: number;
  label: string;
};

export type PlanCandidate = {
  sourceType: PlanSourceType;
  sourceReferenceId?: string;
  title: string;
  durationMinutes: number;
  reasonCode: PlanReasonCode;
  dueAt?: Date | null;
  evidenceAt?: Date | null;
  evidenceCount?: number;
  latestReviewResponse?: ReviewSignal | null;
  hasConflictingEvidence?: boolean;
};

export type ScoredPlanCandidate = PlanCandidate & {
  score: number;
  scoreVersion: typeof ADAPTIVE_SCORE_VERSION;
  scoreBreakdown: ScoreComponent[];
  explanation: string;
};

export type PlannedTask = Omit<ScoredPlanCandidate, "dueAt" | "evidenceAt" | "evidenceCount" | "latestReviewResponse" | "hasConflictingEvidence"> & {
  scheduledFor: Date;
  position: number;
};

const DAY_MS = 86_400_000;

function calendarDaysBetween(later: Date, earlier: Date): number {
  return Math.max(0, Math.floor((istanbulDayStart(later).getTime() - istanbulDayStart(earlier).getTime()) / DAY_MS));
}

function sourceComponent(candidate: PlanCandidate): ScoreComponent {
  const values: Record<PlanSourceType, [number, string]> = {
    ASSIGNMENT: [32, "açık ve teslim tarihli ödev"],
    REVIEW: [28, "aktif tekrar kaydı"],
    WEAK_OUTCOME: [24, "öğretmen öğrenme kanıtı"],
    EXAM_PREP: [26, "yaklaşan sınav"],
    RECOVERY: [36, "yayınlanmış telafi paketi"],
  };
  const [points, label] = values[candidate.sourceType];
  return { key: "source", points, label };
}

function urgencyComponent(candidate: PlanCandidate, now: Date): ScoreComponent {
  if (!candidate.dueAt) return { key: "urgency", points: 0, label: "tanımlı son tarih yok" };
  const deltaDays = Math.ceil((candidate.dueAt.getTime() - now.getTime()) / DAY_MS);
  if (deltaDays < 0) {
    const overdueDays = calendarDaysBetween(now, candidate.dueAt);
    return { key: "urgency", points: Math.min(30, 15 + overdueDays * 3), label: `${overdueDays} gündür bekliyor` };
  }
  if (deltaDays === 0) return { key: "urgency", points: 18, label: "bugün zamanı geldi" };
  if (deltaDays <= 3) return { key: "urgency", points: 14 - (deltaDays - 1) * 3, label: `son tarihi ${deltaDays} gün sonra` };
  if (deltaDays <= 7) return { key: "urgency", points: 7, label: "son tarihi bu hafta" };
  if (deltaDays <= 14) return { key: "urgency", points: 3, label: "son tarihi iki hafta içinde" };
  return { key: "urgency", points: 0, label: "son tarih yakın değil" };
}

function recencyComponent(candidate: PlanCandidate, now: Date): ScoreComponent {
  if (!candidate.evidenceAt) return { key: "recency", points: 0, label: "kanıt zamanı bilinmiyor" };
  const ageDays = calendarDaysBetween(now, candidate.evidenceAt);
  if (ageDays <= 1) return { key: "recency", points: 18, label: "kanıt son 24 saatte güncellendi" };
  if (ageDays <= 3) return { key: "recency", points: 15, label: `kanıt ${ageDays} gün önce güncellendi` };
  if (ageDays <= 7) return { key: "recency", points: 11, label: "kanıt son bir haftadan" };
  if (ageDays <= 14) return { key: "recency", points: 7, label: "kanıt son iki haftadan" };
  if (ageDays <= 30) return { key: "recency", points: 3, label: "kanıt bir aydan eski değil" };
  return { key: "recency", points: 0, label: "kanıt bir aydan eski" };
}

function confidenceComponent(candidate: PlanCandidate): ScoreComponent {
  const sourceConfidence: Record<PlanSourceType, number> = { ASSIGNMENT: 10, REVIEW: 12, WEAK_OUTCOME: 11, EXAM_PREP: 9, RECOVERY: 14 };
  const countBonus = Math.min(6, Math.max(0, (candidate.evidenceCount || 1) - 1) * 2);
  const responseAdjustment = candidate.latestReviewResponse === "WRONG" ? 8 : candidate.latestReviewResponse === "UNSURE" ? 5 : candidate.latestReviewResponse === "CORRECT" ? -8 : 0;
  const label = candidate.latestReviewResponse === "WRONG"
    ? "son tekrar başarısız"
    : candidate.latestReviewResponse === "UNSURE"
      ? "son tekrarda emin değildi"
      : candidate.latestReviewResponse === "CORRECT"
        ? "son tekrar başarılı"
        : (candidate.evidenceCount || 1) > 1
          ? `${candidate.evidenceCount} destekleyen kanıt var`
          : "tek doğrudan kanıta dayanıyor";
  return { key: "confidence", points: sourceConfidence[candidate.sourceType] + countBonus + responseAdjustment, label };
}

function conflictComponent(candidate: PlanCandidate): ScoreComponent {
  return candidate.hasConflictingEvidence
    ? { key: "conflict", points: -14, label: "yakın kanıtlar birbiriyle çelişiyor" }
    : { key: "conflict", points: 0, label: "çelişen yakın kanıt yok" };
}

function primaryReason(candidate: PlanCandidate): string {
  if (candidate.reasonCode === "NEEDS_REVIEW") return "son derste tekrar gerekiyor";
  if (candidate.reasonCode === "REVIEW_DUE") return "tekrar zamanı geldi";
  if (candidate.reasonCode === "DUE_SOON") return "ödevin son tarihi yaklaşıyor";
  if (candidate.reasonCode === "EXAM_APPROACHING") return "sınav yaklaşıyor";
  if (candidate.reasonCode === "MISSED_LESSON") return "kaçırılan ders için telafi gerekiyor";
  return "günlük kapasiteye uyuyor";
}

/** Her bileşeni snapshot'layan, açıklanabilir ve sürümlenmiş v2 skor modeli. */
export function scorePlanCandidate(candidate: PlanCandidate, now: Date): ScoredPlanCandidate {
  const scoreBreakdown = [sourceComponent(candidate), urgencyComponent(candidate, now), recencyComponent(candidate, now), confidenceComponent(candidate), conflictComponent(candidate)];
  const score = Math.max(0, Math.min(100, scoreBreakdown.reduce((total, component) => total + component.points, 0)));
  const explanationParts = [primaryReason(candidate)];
  const confidence = scoreBreakdown.find((item) => item.key === "confidence");
  const urgency = scoreBreakdown.find((item) => item.key === "urgency");
  const conflict = scoreBreakdown.find((item) => item.key === "conflict");
  if (candidate.latestReviewResponse && confidence) explanationParts.push(confidence.label);
  if (urgency && urgency.points > 0) explanationParts.push(urgency.label);
  if (conflict && conflict.points < 0) explanationParts.push(conflict.label);
  return { ...candidate, score, scoreVersion: ADAPTIVE_SCORE_VERSION, scoreBreakdown, explanation: `Bu görev eklendi: ${explanationParts.join(" + ")}.` };
}

export function readScoreBreakdown(value: unknown): ScoreComponent[] {
  if (!Array.isArray(value)) return [];
  const keys = new Set<ScoreComponent["key"]>(["source", "urgency", "recency", "confidence", "conflict"]);
  return value.filter((item): item is ScoreComponent => Boolean(
    item && typeof item === "object"
    && "key" in item && typeof item.key === "string" && keys.has(item.key as ScoreComponent["key"])
    && "points" in item && typeof item.points === "number"
    && "label" in item && typeof item.label === "string",
  ));
}

export function planningWeekStart(now = new Date()): Date {
  return istanbulWeekStart(now, istanbulIsoWeekday(now) === 7 ? 1 : 0);
}

/** Günlük görev ve dakika kapasitesini asla aşmayan açıklanabilir v2 çözücü. */
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
  const candidates = input.candidates.map((candidate) => scorePlanCandidate(candidate, input.now)).sort((a, b) => b.score - a.score || (a.dueAt?.getTime() || Number.MAX_SAFE_INTEGER) - (b.dueAt?.getTime() || Number.MAX_SAFE_INTEGER) || a.title.localeCompare(b.title, "tr"));
  const result: PlannedTask[] = [];

  for (const day of days) {
    let usedMinutes = 0;
    let position = 1;
    for (let index = 0; index < candidates.length && position <= input.maxTasksPerDay;) {
      const candidate = candidates[index];
      if (usedMinutes + candidate.durationMinutes > input.minutesPerDay) { index += 1; continue; }
      result.push({
        sourceType: candidate.sourceType,
        sourceReferenceId: candidate.sourceReferenceId,
        title: candidate.title,
        durationMinutes: candidate.durationMinutes,
        reasonCode: candidate.reasonCode,
        score: candidate.score,
        scoreVersion: candidate.scoreVersion,
        scoreBreakdown: candidate.scoreBreakdown,
        explanation: candidate.explanation,
        scheduledFor: day,
        position,
      });
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
