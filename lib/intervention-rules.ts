import { istanbulWeekStart } from "./istanbul-time";

export const INTERVENTION_RULE_VERSION = "intervention-v3";

export type InterventionReasonCode = "ATTENDANCE_PATTERN" | "OVERDUE_WORK" | "REPEATED_REVIEW_DIFFICULTY" | "PLAN_STALLED" | "RECENT_EXAM_DROP" | "ENGAGEMENT_GAP" | "HUMAN_CONCERN";

export type InterventionSignal = {
  reasonCode: InterventionReasonCode;
  evidenceCount: number;
  explanation: string;
  suggestedAction: string;
};

export type StudentSupportEpisode = {
  primaryReasonCode: InterventionReasonCode;
  signals: InterventionSignal[];
  evidenceCount: number;
  explanation: string;
  suggestedAction: string;
};

export function buildStudentSupportEpisode(signals: InterventionSignal[]): StudentSupportEpisode | null {
  if (!signals.length) return null;

  return {
    primaryReasonCode: signals[0].reasonCode,
    signals,
    evidenceCount: signals.reduce((sum, signal) => sum + signal.evidenceCount, 0),
    explanation: `${signals.length} açıklanabilir sinyal aynı öğrenci destek bölümünde birleştirildi.`,
    suggestedAction: signals.length === 1
      ? signals[0].suggestedAction
      : "Öğrenciyle kısa bir görüşmede sinyalleri birlikte doğrulayın; ardından yalnız bir küçük destek adımı seçin.",
  };
}

export function interventionWindowStart(now = new Date()): Date {
  return istanbulWeekStart(now);
}

export function buildHumanConcernSignal(): InterventionSignal {
  return {
    reasonCode: "HUMAN_CONCERN",
    evidenceCount: 1,
    explanation: "Bir öğretmen veya yönetici bu hafta öğrenciyle kısa bir destek kontrolü yapılmasını istedi. Serbest metin, tanı veya neden çıkarımı kaydedilmedi.",
    suggestedAction: "İşareti oluşturan insan kararını öğrenciyle kısa bir görüşmede doğrulayın ve gerekiyorsa tek destek adımı belirleyin.",
  };
}

export function buildInterventionSignals(input: {
  attendanceAbsentCount: number;
  attendanceTotalCount: number;
  overdueWorkCount: number;
  repeatedDifficultyCount: number;
  stalledPlanTaskCount: number;
  recentExamDrop?: { previousNet: number; currentNet: number } | null;
  engagementGapDays?: number;
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

  if (input.recentExamDrop && input.recentExamDrop.previousNet - input.recentExamDrop.currentNet >= 5) {
    signals.push({
      reasonCode: "RECENT_EXAM_DROP",
      evidenceCount: 2,
      explanation: `Aynı sınav türündeki son iki denemede toplam net ${input.recentExamDrop.previousNet.toFixed(2)} seviyesinden ${input.recentExamDrop.currentNet.toFixed(2)} seviyesine indi. Yalnız son iki ölçüm karşılaştırıldı; kalıcı eğilim veya neden çıkarımı yapılmadı.`,
      suggestedAction: "Son denemenin koşullarını ve en çok değişen bölümü öğrenciyle doğrulayın; tek bir sonraki adım seçin.",
    });
  }

  if ((input.engagementGapDays || 0) >= 7) {
    signals.push({
      reasonCode: "ENGAGEMENT_GAP",
      evidenceCount: 1,
      explanation: `Öğrencinin panelde gözlenen son etkinliğinin üzerinden ${input.engagementGapDays} tam gün geçti. Erişim, motivasyon veya kişisel neden hakkında çıkarım yapılmadı.`,
      suggestedAction: "Öğrencinin erişim durumunu kısa bir temasla doğrulayın; gerekiyorsa dönüş için tek küçük görev seçin.",
    });
  }

  return signals;
}
