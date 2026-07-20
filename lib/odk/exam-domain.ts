import type { OdkAnswerOption, OdkExamFamily, OdkExamStatus, OdkExamFileType } from "@prisma/client";

export type ReadinessIssue = { level: "error" | "warning"; code: string; message: string; sectionCode?: string; questionNumber?: number };

export type VersionReadinessInput = {
  family: OdkExamFamily;
  durationMinutes: number;
  scoringPolicyCode: string;
  files: OdkExamFileType[];
  sections: Array<{
    code: string;
    questionCount: number;
    questions: Array<{
      questionNumber: number;
      correctOption: OdkAnswerOption | null;
      outcomes: Array<{ outcomeId: string; isPrimary: boolean }>;
    }>;
  }>;
};

const EXPECTED_MATH_QUESTIONS: Record<OdkExamFamily, number> = { LGS: 20, TYT: 40, AYT: 40 };
const EXPECTED_POLICY: Record<OdkExamFamily, string> = { LGS: "LGS_MATH_V1", TYT: "YKS_MATH_V1", AYT: "YKS_MATH_V1" };

export function validateVersionReadiness(input: VersionReadinessInput): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 5 || input.durationMinutes > 360) issues.push({ level: "error", code: "INVALID_DURATION", message: "Sınav süresi 5–360 dakika arasında olmalıdır." });
  if (input.scoringPolicyCode !== EXPECTED_POLICY[input.family]) issues.push({ level: "error", code: "SCORING_POLICY_MISMATCH", message: `${input.family} için doğru matematik puanlama politikası seçilmelidir.` });
  if (!input.files.includes("BOOKLET_PDF")) issues.push({ level: "error", code: "BOOKLET_MISSING", message: "Öğrenci kitapçığı PDF'i yüklenmelidir." });
  if (!input.sections.length) issues.push({ level: "error", code: "SECTION_MISSING", message: "En az bir matematik bölümü eklenmelidir." });

  const sectionCodes = new Set<string>();
  for (const section of input.sections) {
    if (sectionCodes.has(section.code)) issues.push({ level: "error", code: "DUPLICATE_SECTION", message: "Bölüm kodları benzersiz olmalıdır.", sectionCode: section.code });
    sectionCodes.add(section.code);
    if (section.questionCount !== section.questions.length) issues.push({ level: "error", code: "QUESTION_COUNT_MISMATCH", message: `Tanımlı soru sayısı ${section.questionCount} ile soru kayıtları eşleşmiyor.`, sectionCode: section.code });
    const numbers = new Set<number>();
    for (const question of section.questions) {
      if (numbers.has(question.questionNumber)) issues.push({ level: "error", code: "DUPLICATE_QUESTION", message: "Soru numarası bölüm içinde tekrarlanamaz.", sectionCode: section.code, questionNumber: question.questionNumber });
      numbers.add(question.questionNumber);
      if (!question.correctOption) issues.push({ level: "error", code: "ANSWER_MISSING", message: "Her soru için doğru cevap girilmelidir.", sectionCode: section.code, questionNumber: question.questionNumber });
      if (question.questionNumber < 1 || question.questionNumber > section.questionCount) issues.push({ level: "error", code: "QUESTION_OUT_OF_RANGE", message: "Soru numarası bölüm aralığının dışında.", sectionCode: section.code, questionNumber: question.questionNumber });
      const outcomeIds = question.outcomes.map((outcome) => outcome.outcomeId);
      if (!outcomeIds.length) issues.push({ level: "error", code: "OUTCOME_MISSING", message: "Her soru en az bir kazanıma bağlanmalıdır.", sectionCode: section.code, questionNumber: question.questionNumber });
      if (new Set(outcomeIds).size !== outcomeIds.length) issues.push({ level: "error", code: "DUPLICATE_OUTCOME", message: "Aynı kazanım bir soruya iki kez bağlanamaz.", sectionCode: section.code, questionNumber: question.questionNumber });
      if (question.outcomes.filter((outcome) => outcome.isPrimary).length !== 1) issues.push({ level: "error", code: "PRIMARY_OUTCOME_REQUIRED", message: "Her sorunun tam bir ana kazanımı olmalıdır.", sectionCode: section.code, questionNumber: question.questionNumber });
    }
  }

  const total = input.sections.reduce((sum, section) => sum + section.questionCount, 0);
  if (total !== EXPECTED_MATH_QUESTIONS[input.family]) issues.push({ level: "warning", code: "NONSTANDARD_QUESTION_COUNT", message: `${input.family} matematik için standart ${EXPECTED_MATH_QUESTIONS[input.family]} soru yerine ${total} soru tanımlandı.` });
  return issues;
}

const TRANSITIONS: Record<OdkExamStatus, OdkExamStatus[]> = {
  DRAFT: ["READY"],
  READY: ["DRAFT", "SCHEDULED"],
  SCHEDULED: ["READY", "LIVE"],
  LIVE: ["ENDED"],
  ENDED: ["SCORED"],
  SCORED: ["RELEASED"],
  RELEASED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransitionExam(from: OdkExamStatus, to: OdkExamStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function validateSchedule(input: { startsAt: Date | null; endsAt: Date | null; meetRequired: boolean; meetUrl: string | null }): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];
  if (!input.startsAt || !input.endsAt) issues.push({ level: "error", code: "SCHEDULE_MISSING", message: "Başlangıç ve bitiş zamanı belirlenmelidir." });
  else if (input.endsAt <= input.startsAt) issues.push({ level: "error", code: "INVALID_SCHEDULE", message: "Bitiş zamanı başlangıçtan sonra olmalıdır." });
  if (input.meetRequired) {
    try {
      const url = new URL(input.meetUrl || "");
      if (url.protocol !== "https:" || url.hostname !== "meet.google.com") throw new Error("invalid");
    } catch {
      issues.push({ level: "error", code: "MEET_URL_MISSING", message: "Meet zorunluysa geçerli bir meet.google.com bağlantısı girilmelidir." });
    }
  }
  return issues;
}
