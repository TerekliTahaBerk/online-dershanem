export const INTERVENTION_RULE_VERSION = "intervention-v1";

export type InterventionReasonCode = "ATTENDANCE_PATTERN" | "OVERDUE_WORK" | "REPEATED_REVIEW_DIFFICULTY" | "PLAN_STALLED";

export type InterventionSignal = {
  reasonCode: InterventionReasonCode;
  evidenceCount: number;
  explanation: string;
  suggestedAction: string;
};

export function interventionWindowStart(now = new Date()): Date {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date;
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
