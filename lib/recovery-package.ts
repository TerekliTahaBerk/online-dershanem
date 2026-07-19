export const RECOVERY_RULE_VERSION = "recovery-v1";
export const RECOVERY_WINDOW_MS = 72 * 60 * 60 * 1000;

export type RecoveryDraftItem = {
  kind: "MATERIAL" | "ASSIGNMENT";
  position: number;
  title: string;
  materialId?: string;
  assignmentId?: string;
};

export function recoveryDueAt(lessonEndsAt: Date): Date {
  return new Date(lessonEndsAt.getTime() + RECOVERY_WINDOW_MS);
}

/** Yalnız ortak ders alanlarını kabul eder; öğrenciye özel not bu sözleşmeye giremez. */
export function buildRecoveryDraft(input: {
  lessonTitle: string;
  lessonEndsAt: Date;
  sharedTopic?: string | null;
  sharedNextGoal?: string | null;
  sharedHomework?: string | null;
  materials: { id: string; title: string }[];
  assignments: { id: string; title: string }[];
}) {
  const summaryTopic = input.sharedTopic?.trim() || input.lessonTitle.trim();
  const summaryNextStep = input.sharedNextGoal?.trim() || input.sharedHomework?.trim() || "Ortak ders özetini inceleyip mini kontrolü tamamla.";
  const items: RecoveryDraftItem[] = [
    ...input.materials.slice(0, 3).map((item) => ({ kind: "MATERIAL" as const, title: item.title, materialId: item.id })),
    ...input.assignments.slice(0, 2).map((item) => ({ kind: "ASSIGNMENT" as const, title: item.title, assignmentId: item.id })),
  ].map((item, index) => ({ ...item, position: index + 1 }));
  return {
    ruleVersion: RECOVERY_RULE_VERSION,
    summaryTopic,
    summaryNextStep,
    checkpointPrompt: "Ders özetine bakmadan ana çözüm adımını açıklayabiliyor musun?",
    dueAt: recoveryDueAt(input.lessonEndsAt),
    items,
  };
}
