/**
 * Online Koçum — plan görevi domain kuralları.
 *
 * Dershanem Assignment ile aynı UI'da karıştırılmaz. Plan task bir Assignment'a
 * referans verebilir ama zorunlu değildir; source of truth Assignment tarafında
 * kalır (ASSIGNMENT + sourceReferenceId).
 */

export type KocumTaskStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "DONE"
  | "PARTIAL"
  | "COULD_NOT"
  | "SKIPPED";

export type KocumTaskSource =
  | "ASSIGNMENT"
  | "REVIEW"
  | "WEAK_OUTCOME"
  | "EXAM_PREP"
  | "RECOVERY"
  | "MANUAL_COACH"
  | "MOCK_EXAM"
  | "SYSTEM_SUGGESTED"
  | "TEMPLATE"
  | "PERSONAL_GOAL";

export type KocumTaskKind =
  | "TOPIC_STUDY"
  | "QUESTION_PRACTICE"
  | "REVIEW"
  | "VIDEO"
  | "MATERIAL_READ"
  | "CLASSIC_ASSIGNMENT"
  | "MOCK_EXAM"
  | "ERROR_ANALYSIS"
  | "PERSONAL_GOAL"
  | "CUSTOM";

export type TaskCompletionInput = {
  status: Exclude<KocumTaskStatus, "PLANNED" | "SKIPPED">;
  actualQuestions?: number | null;
  actualCorrect?: number | null;
  actualIncorrect?: number | null;
  actualBlank?: number | null;
  actualMinutes?: number | null;
  studentNote?: string | null;
  difficultyFelt?: number | null;
  energyFelt?: number | null;
};

export type CompletionField =
  | "actualQuestions"
  | "actualCorrect"
  | "actualIncorrect"
  | "actualBlank"
  | "actualMinutes"
  | "studentNote"
  | "difficultyFelt"
  | "energyFelt";

const OPEN_STATUSES: ReadonlySet<KocumTaskStatus> = new Set([
  "PLANNED",
  "IN_PROGRESS",
]);

const COMPLETED_STATUSES: ReadonlySet<KocumTaskStatus> = new Set(["DONE", "PARTIAL"]);

export function isOpenTaskStatus(status: KocumTaskStatus): boolean {
  return OPEN_STATUSES.has(status);
}

export function isCompletedTaskStatus(status: KocumTaskStatus): boolean {
  return COMPLETED_STATUSES.has(status);
}

export function taskStatusLabel(status: KocumTaskStatus): string {
  return {
    PLANNED: "Başlamadım",
    IN_PROGRESS: "Başladım",
    DONE: "Tamamladım",
    PARTIAL: "Kısmen tamamladım",
    COULD_NOT: "Yapamadım",
    SKIPPED: "Yeniden planlanacak",
  }[status];
}

export function taskSourceLabel(source: KocumTaskSource): string {
  return {
    ASSIGNMENT: "Öğretmen ödevi",
    REVIEW: "Tekrar kuyruğu",
    WEAK_OUTCOME: "Konu tekrarı",
    EXAM_PREP: "Sınav hazırlığı",
    RECOVERY: "Telafi",
    MANUAL_COACH: "Koç görevi",
    MOCK_EXAM: "Deneme",
    SYSTEM_SUGGESTED: "Sistem önerisi",
    TEMPLATE: "Şablon",
    PERSONAL_GOAL: "Bireysel hedef",
  }[source];
}

export function taskKindLabel(kind: KocumTaskKind): string {
  return {
    TOPIC_STUDY: "Konu çalışması",
    QUESTION_PRACTICE: "Soru çözümü",
    REVIEW: "Tekrar",
    VIDEO: "Video izleme",
    MATERIAL_READ: "Materyal okuma",
    CLASSIC_ASSIGNMENT: "Klasik ödev",
    MOCK_EXAM: "Deneme",
    ERROR_ANALYSIS: "Yanlış analizi",
    PERSONAL_GOAL: "Bireysel hedef",
    CUSTOM: "Özel görev",
  }[kind];
}

/** Task türüne göre hangi tamamlanma alanlarının gösterileceği. */
export function completionFieldsForKind(kind: KocumTaskKind): CompletionField[] {
  switch (kind) {
    case "QUESTION_PRACTICE":
    case "ERROR_ANALYSIS":
      return [
        "actualQuestions",
        "actualCorrect",
        "actualIncorrect",
        "actualBlank",
        "actualMinutes",
        "studentNote",
        "difficultyFelt",
        "energyFelt",
      ];
    case "MOCK_EXAM":
      return ["actualMinutes", "studentNote", "difficultyFelt", "energyFelt"];
    case "TOPIC_STUDY":
    case "VIDEO":
    case "MATERIAL_READ":
    case "REVIEW":
      return ["actualMinutes", "studentNote", "difficultyFelt", "energyFelt"];
    case "CLASSIC_ASSIGNMENT":
      return ["actualMinutes", "studentNote"];
    case "PERSONAL_GOAL":
    case "CUSTOM":
    default:
      return ["actualMinutes", "studentNote", "energyFelt"];
  }
}

export function validateFeltScale(value: number | null | undefined): string | null {
  if (value == null) return null;
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    return "Değer 1–5 arasında olmalıdır.";
  }
  return null;
}

export function validateNonNegativeInt(value: number | null | undefined, label: string): string | null {
  if (value == null) return null;
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    return `${label} negatif olamaz.`;
  }
  return null;
}

export function validateTaskCompletion(input: TaskCompletionInput): string | null {
  const allowed: TaskCompletionInput["status"][] = [
    "IN_PROGRESS",
    "DONE",
    "PARTIAL",
    "COULD_NOT",
  ];
  if (!allowed.includes(input.status)) return "Geçersiz görev durumu.";

  for (const [value, label] of [
    [input.actualQuestions, "Soru sayısı"],
    [input.actualCorrect, "Doğru"],
    [input.actualIncorrect, "Yanlış"],
    [input.actualBlank, "Boş"],
    [input.actualMinutes, "Süre"],
  ] as const) {
    const err = validateNonNegativeInt(value, label);
    if (err) return err;
  }

  const difficultyErr = validateFeltScale(input.difficultyFelt);
  if (difficultyErr) return difficultyErr;
  const energyErr = validateFeltScale(input.energyFelt);
  if (energyErr) return energyErr;

  if (input.studentNote && input.studentNote.length > 500) {
    return "Öğrenci notu en fazla 500 karakter olabilir.";
  }

  if (
    input.actualQuestions != null &&
    input.actualCorrect != null &&
    input.actualIncorrect != null &&
    input.actualBlank != null
  ) {
    const sum = input.actualCorrect + input.actualIncorrect + input.actualBlank;
    if (sum > input.actualQuestions) {
      return "Doğru + yanlış + boş, toplam soru sayısını aşamaz.";
    }
  }

  return null;
}

/** ASSIGNMENT kaynaklı görev tamamlanınca Dershanem progress senkronu gerekir. */
export function shouldSyncAssignmentProgress(
  sourceType: KocumTaskSource,
  sourceReferenceId: string | null | undefined,
  status: KocumTaskStatus,
): boolean {
  return (
    sourceType === "ASSIGNMENT" &&
    Boolean(sourceReferenceId) &&
    (status === "DONE" || status === "PARTIAL" || status === "IN_PROGRESS")
  );
}

export function assignmentProgressStatusFor(
  status: KocumTaskStatus,
): "TODO" | "IN_PROGRESS" | "DONE" | null {
  if (status === "DONE") return "DONE";
  if (status === "IN_PROGRESS" || status === "PARTIAL") return "IN_PROGRESS";
  if (status === "PLANNED" || status === "COULD_NOT") return "TODO";
  return null;
}
