import { istanbulWeekStart } from "./istanbul-time";

export const INTERVENTION_RULE_VERSION = "intervention-v1";

export const interventionReasonCodes = ["ATTENDANCE_PATTERN", "OVERDUE_WORK", "REPEATED_REVIEW_DIFFICULTY", "PLAN_STALLED"] as const;
export type InterventionReasonCode = (typeof interventionReasonCodes)[number];

export type InterventionSignal = {
  reasonCode: InterventionReasonCode;
  evidenceCount: number;
  explanation: string;
  suggestedAction: string;
};

export function interventionWindowStart(now = new Date()): Date {
  return istanbulWeekStart(now);
}

export function interventionEvaluationWindow(now = new Date()) {
  const windowStart = interventionWindowStart(now);
  return {
    windowStart,
    attendanceSince: new Date(now.getTime() - 14 * 86_400_000),
    evidenceSince: new Date(now.getTime() - 30 * 86_400_000),
  };
}

export function buildInterventionSignals(input: {
  attendanceAbsentCount: number;
  attendanceTotalCount: number;
  overdueWorkCount: number;
  repeatedDifficultyCount: number;
  stalledPlanTaskCount: number;
}): InterventionSignal[] {
  const signals: InterventionSignal[] = [];

  if (input.attendanceTotalCount >= 3 && input.attendanceAbsentCount >= 2) {
    signals.push({
      reasonCode: "ATTENDANCE_PATTERN",
      evidenceCount: input.attendanceAbsentCount,
      explanation: `Son 14 gündeki ${input.attendanceTotalCount} tamamlanmış dersin ${input.attendanceAbsentCount} tanesinde devamsızlık kaydı var. Mazeret veya neden hakkında çıkarım yapılmadı.`,
      suggestedAction: "Öğrenciyle erişim veya telafi ihtiyacını kısa bir konuşmayla doğrulayın.",
    });
  }

  if (input.overdueWorkCount >= 2) {
    signals.push({
      reasonCode: "OVERDUE_WORK",
      evidenceCount: input.overdueWorkCount,
      explanation: `Son 30 günde teslim tarihi geçen ${input.overdueWorkCount} çalışma henüz tamamlandı olarak işaretlenmedi.`,
      suggestedAction: "Yalnız en gerekli çalışmayı seçip süreyi ve engeli öğrenciyle birlikte konuşun.",
    });
  }

  if (input.repeatedDifficultyCount >= 1) {
    signals.push({
      reasonCode: "REPEATED_REVIEW_DIFFICULTY",
      evidenceCount: input.repeatedDifficultyCount,
      explanation: `${input.repeatedDifficultyCount} tekrar öğesinde son 30 gün içinde en az üç “yanlış” veya “emin değilim” yanıtı var.`,
      suggestedAction: "Aynı soruyu tekrar vermek yerine kritik çözüm adımını birlikte inceleyin.",
    });
  }

  if (input.stalledPlanTaskCount >= 3) {
    signals.push({
      reasonCode: "PLAN_STALLED",
      evidenceCount: input.stalledPlanTaskCount,
      explanation: `Onaylı haftalık plandaki ${input.stalledPlanTaskCount} geçmiş görev henüz tamamlanmadı. Bu kayıt motivasyon nedeni hakkında çıkarım yapmaz.`,
      suggestedAction: "Plan kapasitesini kontrol edip bugüne yalnız bir küçük öncelik bırakın.",
    });
  }

  return signals;
}
