/**
 * Online Koçum — adaptif öneri üretimi (koç onayı şart).
 * Kritik plan değişikliği doğrudan publish edilmez.
 */

export type AdaptiveSignal = {
  completionPct: number;
  overdueCount: number;
  plannedMinutes: number;
  actualMinutes: number;
  openReviewCount: number;
  openAssignmentCount: number;
  mockExamFollowups: Array<{ title: string; subject?: string }>;
};

export type AdaptiveSuggestionDraft = {
  kind: "ADAPTIVE_NEXT_WEEK" | "REVIEW_QUEUE" | "MOCK_EXAM_FOLLOWUP" | "CARRY_OVER";
  title: string;
  rationale: string;
  payload: Record<string, unknown>;
};

export function buildAdaptiveSuggestionDrafts(
  signal: AdaptiveSignal,
): AdaptiveSuggestionDraft[] {
  const drafts: AdaptiveSuggestionDraft[] = [];

  if (signal.completionPct < 60) {
    drafts.push({
      kind: "ADAPTIVE_NEXT_WEEK",
      title: "Haftalık kapasiteyi hafiflet",
      rationale: `Plan uyumu %${signal.completionPct} kaldı; gelecek hafta görev yoğunluğu azaltılabilir.`,
      payload: {
        action: "REDUCE_LOAD",
        suggestedCapacityFactor: 0.8,
        completionPct: signal.completionPct,
      },
    });
  } else if (
    signal.plannedMinutes > 0 &&
    signal.actualMinutes > signal.plannedMinutes * 1.25
  ) {
    drafts.push({
      kind: "ADAPTIVE_NEXT_WEEK",
      title: "Süre tahminlerini yükselt",
      rationale: "Gerçekleşen süre planlananın belirgin üzerinde; görev süreleri güncellenebilir.",
      payload: {
        action: "INCREASE_DURATIONS",
        plannedMinutes: signal.plannedMinutes,
        actualMinutes: signal.actualMinutes,
      },
    });
  }

  if (signal.overdueCount > 0) {
    drafts.push({
      kind: "CARRY_OVER",
      title: "Geciken görevleri sonraki haftaya taşı",
      rationale: `${signal.overdueCount} geciken görev var; koç seçerek taşıyabilir.`,
      payload: { action: "CARRY_OVER_OVERDUE", overdueCount: signal.overdueCount },
    });
  }

  if (signal.openReviewCount > 0) {
    drafts.push({
      kind: "REVIEW_QUEUE",
      title: "Tekrar kuyruğundan görev ekle",
      rationale: `${signal.openReviewCount} aktif tekrar öğesi bekliyor.`,
      payload: { action: "ADD_REVIEW_TASKS", openReviewCount: signal.openReviewCount },
    });
  }

  for (const followup of signal.mockExamFollowups.slice(0, 3)) {
    drafts.push({
      kind: "MOCK_EXAM_FOLLOWUP",
      title: followup.title,
      rationale: "Deneme sonrası yanlış analizi önerisi — otomatik yayınlanmaz.",
      payload: {
        action: "ADD_ERROR_ANALYSIS",
        subject: followup.subject ?? null,
      },
    });
  }

  // Assignment completion is a signal for capacity, not auto-import (no duplicates).
  if (signal.openAssignmentCount > 2 && signal.completionPct >= 70) {
    drafts.push({
      kind: "ADAPTIVE_NEXT_WEEK",
      title: "Öğretmen ödevlerini planda referansla",
      rationale: `${signal.openAssignmentCount} açık ödev var; planda referans görev olarak gösterilebilir (kopya oluşturulmaz).`,
      payload: {
        action: "LINK_ASSIGNMENTS",
        openAssignmentCount: signal.openAssignmentCount,
      },
    });
  }

  return drafts;
}

export type PlanRevisionSnapshot = {
  version: number;
  status: string;
  taskCount: number;
  tasks: Array<{
    id: string;
    title: string;
    scheduledFor: string;
    status: string;
    durationMinutes: number;
  }>;
};

export function buildRevisionChangeSummary(input: {
  previousVersion: number;
  nextVersion: number;
  actorLabel: string;
}): string {
  return `Plan v${input.previousVersion} → v${input.nextVersion} · ${input.actorLabel} tarafından güncellendi.`;
}
