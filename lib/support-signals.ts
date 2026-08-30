import "server-only";

export type SupportSignalType =
  | "ATTENDANCE_PATTERN"
  | "OVERDUE_WORK"
  | "REPEATED_REVIEW_DIFFICULTY"
  | "PLAN_STALLED"
  | "EXAM_PERFORMANCE_DROP"
  | "EXAM_INACTIVITY"
  | "GENERAL_INACTIVITY"
  | "REPEATED_OVERWHELM"
  | "HUMAN_CONCERN"
  | "COACHING_CONCERN"
  | "IMPROVEMENT";

export type SupportSignalSeverity = "INFO" | "WATCH" | "ACTION";

export type SupportEvidenceRef = {
  type: string;
  id: string;
  label: string;
};

export type SupportSignal = {
  type: SupportSignalType;
  severity: SupportSignalSeverity;
  confidence: number;
  observedAt: Date;
  evidenceWindowStart: Date;
  evidenceWindowEnd: Date;
  evidenceCount: number;
  sourceRefs: SupportEvidenceRef[];
  explanation: string;
};

export type SupportSnapshot = {
  attendance: { total: number; absent: number };
  overdueWork: number;
  repeatedReviewDifficulty: number;
  stalledPlanTasks: number;
  examDrop?: { section: string; delta: number; baseline: number; latest: number } | null;
  examInactivity?: { expectedBy: Date | null; missedCount: number } | null;
  generalInactivity?: { daysSinceActivity: number; activeEnrollment: boolean };
  overwhelmPulse?: number | null;
  humanConcern?: { note: string; severity: SupportSignalSeverity; actorRole: "TEACHER" | "ADMIN"; expiresAt: Date | null } | null;
  coachingConcern?: { overdueDays: number | null; coachName: string | null } | null;
};

type SignalConfig = {
  minEvidence: number;
  baseConfidence: number;
  severity: SupportSignalSeverity;
  explanation: (snapshot: SupportSnapshot) => string;
};

const DAY_MS = 86_400_000;

export const SUPPORT_SIGNAL_CONFIG: Record<SupportSignalType, SignalConfig> = {
  ATTENDANCE_PATTERN: {
    minEvidence: 2,
    baseConfidence: 0.72,
    severity: "WATCH",
    explanation: (s) => `Son 14 günde ${s.attendance.absent} devamsızlık kaydı görüldü.`,
  },
  OVERDUE_WORK: {
    minEvidence: 1,
    baseConfidence: 0.82,
    severity: "ACTION",
    explanation: (s) => `${s.overdueWork} teslimi geçen çalışma bekliyor.`,
  },
  REPEATED_REVIEW_DIFFICULTY: {
    minEvidence: 1,
    baseConfidence: 0.76,
    severity: "WATCH",
    explanation: (s) => `${s.repeatedReviewDifficulty} tekrar öğesi son denemelerde zorlanmış görünüyor.`,
  },
  PLAN_STALLED: {
    minEvidence: 2,
    baseConfidence: 0.68,
    severity: "WATCH",
    explanation: (s) => `${s.stalledPlanTasks} plan görevi henüz tamamlanmadı.`,
  },
  EXAM_PERFORMANCE_DROP: {
    minEvidence: 1,
    baseConfidence: 0.8,
    severity: "ACTION",
    explanation: (s) => s.examDrop ? `${s.examDrop.section} bölümünde son performans baseline'ın altında.` : "Son sınav performansı önceki seviyenin altında.",
  },
  EXAM_INACTIVITY: {
    minEvidence: 1,
    baseConfidence: 0.74,
    severity: "WATCH",
    explanation: (s) => `Beklenen sınav ritmi aksadı; ${s.examInactivity?.missedCount || 0} beklenen oturum görünmüyor.`,
  },
  GENERAL_INACTIVITY: {
    minEvidence: 1,
    baseConfidence: 0.7,
    severity: "WATCH",
    explanation: (s) => `${s.generalInactivity?.daysSinceActivity || 0} gündür aktif öğrenme hareketi yok.`,
  },
  REPEATED_OVERWHELM: {
    minEvidence: 1,
    baseConfidence: 0.65,
    severity: "WATCH",
    explanation: (s) => `Yoğunluk geri bildirimi ${s.overwhelmPulse || 0}/5 seviyesinde.`,
  },
  HUMAN_CONCERN: {
    minEvidence: 1,
    baseConfidence: 0.9,
    severity: "ACTION",
    explanation: (s) => s.humanConcern?.note || "Öğretmen insan takibi ekledi.",
  },
  COACHING_CONCERN: {
    minEvidence: 1,
    baseConfidence: 0.75,
    severity: "WATCH",
    explanation: (s) => `Koçluk tarafında ${s.coachingConcern?.overdueDays ?? 0} günlük gecikme var.`,
  },
  IMPROVEMENT: {
    minEvidence: 1,
    baseConfidence: 0.8,
    severity: "INFO",
    explanation: () => "Son veri öncekinden daha iyi bir yön gösteriyor.",
  },
};

function confidenceFor(snapshot: SupportSnapshot, type: SupportSignalType) {
  const config = SUPPORT_SIGNAL_CONFIG[type];
  const independentSources = [
    snapshot.attendance.total > 0 ? "attendance" : null,
    snapshot.overdueWork > 0 ? "work" : null,
    snapshot.repeatedReviewDifficulty > 0 ? "review" : null,
    snapshot.stalledPlanTasks > 0 ? "plan" : null,
    snapshot.examDrop ? "exam" : null,
    snapshot.examInactivity?.missedCount ? "exam-inactive" : null,
    snapshot.generalInactivity?.daysSinceActivity ? "inactivity" : null,
    snapshot.overwhelmPulse && snapshot.overwhelmPulse >= 4 ? "pulse" : null,
    snapshot.humanConcern ? "human" : null,
    snapshot.coachingConcern ? "coach" : null,
  ].filter(Boolean).length;
  return Math.min(0.98, config.baseConfidence + Math.min(0.12, independentSources * 0.02));
}

export function buildSupportSignals(snapshot: SupportSnapshot, observedAt = new Date()): SupportSignal[] {
  const evidenceWindowEnd = observedAt;
  const evidenceWindowStart = new Date(observedAt.getTime() - 14 * DAY_MS);
  const signals: SupportSignal[] = [];
  const push = (type: SupportSignalType, evidenceCount: number, sourceRefs: SupportEvidenceRef[]) => {
    const config = SUPPORT_SIGNAL_CONFIG[type];
    if (evidenceCount < config.minEvidence) return;
    signals.push({
      type,
      severity: config.severity,
      confidence: confidenceFor(snapshot, type),
      observedAt,
      evidenceWindowStart,
      evidenceWindowEnd,
      evidenceCount,
      sourceRefs,
      explanation: config.explanation(snapshot),
    });
  };

  push("ATTENDANCE_PATTERN", snapshot.attendance.absent, [{ type: "attendance", id: "attendance", label: "Katılım örüntüsü" }]);
  push("OVERDUE_WORK", snapshot.overdueWork, [{ type: "assignment", id: "overdue", label: "Teslimi geçen çalışmalar" }]);
  push("REPEATED_REVIEW_DIFFICULTY", snapshot.repeatedReviewDifficulty, [{ type: "review", id: "review", label: "Tekrarlayan güçlük" }]);
  push("PLAN_STALLED", snapshot.stalledPlanTasks, [{ type: "plan", id: "plan", label: "Plan aksaması" }]);
  if (snapshot.examDrop) push("EXAM_PERFORMANCE_DROP", 1, [{ type: "exam", id: snapshot.examDrop.section, label: snapshot.examDrop.section }]);
  if (snapshot.examInactivity?.missedCount) push("EXAM_INACTIVITY", snapshot.examInactivity.missedCount, [{ type: "exam", id: "inactivity", label: "Beklenen deneme eksikliği" }]);
  if (snapshot.generalInactivity && snapshot.generalInactivity.daysSinceActivity >= 7 && snapshot.generalInactivity.activeEnrollment) {
    push("GENERAL_INACTIVITY", snapshot.generalInactivity.daysSinceActivity, [{ type: "activity", id: "inactivity", label: "Genel inaktivite" }]);
  }
  if (snapshot.overwhelmPulse && snapshot.overwhelmPulse >= 4) {
    push("REPEATED_OVERWHELM", 1, [{ type: "pulse", id: "overwhelm", label: "Yoğunluk bildirimi" }]);
  }
  if (snapshot.humanConcern) {
    push("HUMAN_CONCERN", 1, [{ type: "human", id: "concern", label: snapshot.humanConcern.note }]);
  }
  if (snapshot.coachingConcern) {
    push("COACHING_CONCERN", 1, [{ type: "coach", id: "concern", label: snapshot.coachingConcern.coachName || "Koçluk konusu" }]);
  }
  const improvementEvidence = snapshot.examDrop?.delta ?? 0;
  if (improvementEvidence > 0) push("IMPROVEMENT", 1, [{ type: "improvement", id: "improvement", label: "İyileşme" }]);
  return signals;
}
