import {
  AnswerKey,
  LearningOutcomeList,
  type AnswerKeyItem,
  type LearningOutcomeItem,
} from "@/lib/odk/schemas";

export type ValidationIssue = {
  level: "error" | "warning";
  message: string;
  questionNumber?: number;
};

export type AnswerKeyValidationResult = {
  ok: boolean;
  data: AnswerKeyItem[] | null;
  issues: ValidationIssue[];
  totalQuestions: number;
};

export type LearningOutcomeValidationResult = {
  ok: boolean;
  data: LearningOutcomeItem[] | null;
  issues: ValidationIssue[];
  totalQuestions: number;
};

export type CrossValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
  /** Cevap anahtarında olup kazanım listesinde olmayan soru no'ları. */
  missingInOutcomes: number[];
  /** Kazanım listesinde olup cevap anahtarında olmayan soru no'ları. */
  missingInAnswerKey: number[];
};

/**
 * Cevap anahtarı JSON'unu doğrular.
 *  - questionNumber tekrar varsa error
 *  - 1'den başlayıp ardışık değilse warning (soru no atlanmış olabilir)
 */
export function validateAnswerKey(payload: unknown): AnswerKeyValidationResult {
  const parsed = AnswerKey.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      data: null,
      totalQuestions: 0,
      issues: parsed.error.issues.map((i) => ({
        level: "error" as const,
        message: `${i.path.join(".") || "root"}: ${i.message}`,
      })),
    };
  }
  const issues: ValidationIssue[] = [];
  const seen = new Set<number>();
  for (const item of parsed.data) {
    if (seen.has(item.questionNumber)) {
      issues.push({
        level: "error",
        message: `Soru ${item.questionNumber} birden fazla kez tanımlı.`,
        questionNumber: item.questionNumber,
      });
    }
    seen.add(item.questionNumber);
  }
  // Ardışıklık kontrolü
  const sorted = [...parsed.data].sort((a, b) => a.questionNumber - b.questionNumber);
  if (sorted.length > 0 && sorted[0].questionNumber !== 1) {
    issues.push({ level: "warning", message: `Soru numaraları 1'den başlamıyor (ilk: ${sorted[0].questionNumber}).` });
  }
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].questionNumber - sorted[i - 1].questionNumber;
    if (gap > 1) {
      issues.push({
        level: "warning",
        message: `Soru ${sorted[i - 1].questionNumber} ile ${sorted[i].questionNumber} arasında ${gap - 1} soru atlanmış.`,
      });
    }
  }
  return {
    ok: !issues.some((i) => i.level === "error"),
    data: parsed.data,
    issues,
    totalQuestions: parsed.data.length,
  };
}

/**
 * Kazanım JSON'unu doğrular.
 *  - questionNumber tekrar varsa error
 */
export function validateLearningOutcomes(payload: unknown): LearningOutcomeValidationResult {
  const parsed = LearningOutcomeList.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      data: null,
      totalQuestions: 0,
      issues: parsed.error.issues.map((i) => ({
        level: "error" as const,
        message: `${i.path.join(".") || "root"}: ${i.message}`,
      })),
    };
  }
  const issues: ValidationIssue[] = [];
  const seen = new Set<number>();
  for (const item of parsed.data) {
    if (seen.has(item.questionNumber)) {
      issues.push({
        level: "error",
        message: `Soru ${item.questionNumber} birden fazla kez tanımlı.`,
        questionNumber: item.questionNumber,
      });
    }
    seen.add(item.questionNumber);
  }
  return {
    ok: !issues.some((i) => i.level === "error"),
    data: parsed.data,
    issues,
    totalQuestions: parsed.data.length,
  };
}

/**
 * Cevap anahtarı + kazanım listesinin questionNumber kümeleri eşleşmeli.
 */
export function crossValidate(
  answerKey: AnswerKeyItem[],
  outcomes: LearningOutcomeItem[],
): CrossValidationResult {
  const akSet = new Set(answerKey.map((a) => a.questionNumber));
  const loSet = new Set(outcomes.map((o) => o.questionNumber));
  const missingInOutcomes: number[] = [];
  const missingInAnswerKey: number[] = [];
  akSet.forEach((n) => { if (!loSet.has(n)) missingInOutcomes.push(n); });
  loSet.forEach((n) => { if (!akSet.has(n)) missingInAnswerKey.push(n); });
  missingInOutcomes.sort((a, b) => a - b);
  missingInAnswerKey.sort((a, b) => a - b);
  const issues: ValidationIssue[] = [];
  if (missingInOutcomes.length > 0) {
    issues.push({
      level: "error",
      message: `Cevap anahtarındaki ${missingInOutcomes.length} soru için kazanım eksik: ${missingInOutcomes.slice(0, 10).join(", ")}${missingInOutcomes.length > 10 ? "…" : ""}`,
    });
  }
  if (missingInAnswerKey.length > 0) {
    issues.push({
      level: "error",
      message: `Kazanım listesindeki ${missingInAnswerKey.length} soru için cevap anahtarı eksik: ${missingInAnswerKey.slice(0, 10).join(", ")}${missingInAnswerKey.length > 10 ? "…" : ""}`,
    });
  }
  return {
    ok: issues.length === 0,
    issues,
    missingInOutcomes,
    missingInAnswerKey,
  };
}

/** Bir denemenin section'larındaki questionCount toplamı = total questions olmalı. */
export function validateSectionTotal(
  sectionTotals: number[],
  totalQuestions: number,
): ValidationIssue[] {
  const sum = sectionTotals.reduce((a, b) => a + b, 0);
  if (sum !== totalQuestions) {
    return [{
      level: "error",
      message: `Bölüm soru toplamı (${sum}) ile cevap anahtarı/kazanım soru sayısı (${totalQuestions}) eşleşmiyor.`,
    }];
  }
  return [];
}
