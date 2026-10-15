import type { OdkAnswerOption, OdkExamFamily, OdkExamStatus, OdkExamFileType } from "@prisma/client";
import { bookletFileIssues, sessionBookletIssues } from "@/lib/odk/booklet-access";
import { getExamTemplate, type ExamTemplateMode, type TemplateSnapshot } from "@/lib/odk/exam-templates";

export type ReadinessIssue = { level: "error" | "warning"; code: string; message: string; sectionCode?: string; questionNumber?: number };

export type VersionReadinessInput = {
  family: OdkExamFamily | null;
  familyCode: string;
  durationMinutes: number;
  scoringPolicyCode: string;
  files: OdkExamFileType[];
  /** Oturumlu sınavın oturum anahtarları ve yüklenen kitapçıkların oturumları ("" = tüm deneme). */
  sessionKeys?: string[];
  bookletSessionKeys?: string[];
  /** Çoklu kitapçık: kullanılabilir kitapçık türleri ve yüklenen kitapçık dosyaları. */
  bookletCodes?: string[];
  bookletFiles?: Array<{ sessionKey: string; bookletCode: string }>;
  structureMode?: "MATH_ONLY" | "FULL_TEMPLATE";
  templateCode?: string | null;
  /** Sürüm ayarlarındaki şablon görüntüsü; varsa güncel şablon yerine bu kullanılır (Faz 3). */
  templateSnapshot?: TemplateSnapshot | null;
  requireOutcomes?: boolean;
  requireBookletPdf?: boolean;
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

/** Ürün dili ↔ DB durum eşlemesi. */
export const EXAM_STATUS_PRODUCT_ALIAS: Record<OdkExamStatus, string> = {
  DRAFT: "DRAFT",
  READY: "READY",
  SCHEDULED: "SCHEDULED",
  LIVE: "LIVE",
  ENDED: "CLOSED",
  SCORED: "REVIEW",
  RELEASED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
};

const TRANSITIONS: Record<OdkExamStatus, OdkExamStatus[]> = {
  DRAFT: ["READY"],
  READY: ["DRAFT", "SCHEDULED"],
  SCHEDULED: ["READY", "LIVE"],
  LIVE: ["ENDED"],
  ENDED: ["SCORED"],
  SCORED: ["RELEASED", "ENDED"],
  RELEASED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransitionExam(from: OdkExamStatus, to: OdkExamStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** DRAFT → PUBLISHED doğrudan olamaz. */
export function assertExplicitTransition(from: OdkExamStatus, to: OdkExamStatus): ReadinessIssue | null {
  if (canTransitionExam(from, to)) return null;
  return {
    level: "error",
    code: "INVALID_TRANSITION",
    message: `${EXAM_STATUS_PRODUCT_ALIAS[from]} → ${EXAM_STATUS_PRODUCT_ALIAS[to]} geçişine izin verilmez.`,
  };
}

export function isExamContentLocked(status: OdkExamStatus): boolean {
  return !["DRAFT", "READY"].includes(status);
}

export function isCriticalFieldLocked(status: OdkExamStatus): boolean {
  return ["LIVE", "ENDED", "SCORED", "RELEASED", "ARCHIVED"].includes(status);
}

type ExpectedStructure = { label: string; mode: ExamTemplateMode; scoringPolicyCode: string; sections: Array<{ code: string; title: string; questionCount: number }> };

/** Beklenen yapı: önce sürümün kendi şablon görüntüsü (tarihsel kararlılık), yoksa güncel şablon. */
function resolveExpectedTemplate(input: VersionReadinessInput): ExpectedStructure | null {
  if (input.templateSnapshot) {
    const registry = getExamTemplate(input.templateSnapshot.code);
    return { label: registry?.label ?? input.templateSnapshot.code, mode: input.templateSnapshot.mode, scoringPolicyCode: input.templateSnapshot.scoringPolicyCode, sections: input.templateSnapshot.sections };
  }
  const template = input.templateCode
    ? getExamTemplate(input.templateCode)
    : input.family
      ? getExamTemplate((input.structureMode || "MATH_ONLY") === "MATH_ONLY" ? `${input.family}_MATH` : `${input.family}_FULL`)
      : null;
  return template ? { label: template.label, mode: template.mode, scoringPolicyCode: template.scoringPolicyCode, sections: template.sections } : null;
}

export function validateVersionReadiness(input: VersionReadinessInput): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];
  const requireOutcomes = input.requireOutcomes !== false;
  const requireBooklet = input.requireBookletPdf !== false;
  const template = resolveExpectedTemplate(input);

  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 5 || input.durationMinutes > 360) {
    issues.push({ level: "error", code: "INVALID_DURATION", message: "Sınav süresi 5–360 dakika arasında olmalıdır." });
  }

  if (template && input.scoringPolicyCode !== template.scoringPolicyCode) {
    issues.push({ level: "error", code: "SCORING_POLICY_MISMATCH", message: `${template.label} için puanlama politikası ${template.scoringPolicyCode} olmalıdır.` });
  }

  if (requireBooklet && !input.files.includes("BOOKLET_PDF")) {
    issues.push({ level: "error", code: "BOOKLET_MISSING", message: "Öğrenci kitapçığı PDF'i yüklenmelidir." });
  } else if (requireBooklet) {
    issues.push(...((input.bookletCodes?.length ?? 0) > 1
      ? bookletFileIssues(input.bookletCodes!, input.sessionKeys ?? [], input.bookletFiles ?? [])
      : sessionBookletIssues(input.sessionKeys ?? [], input.bookletSessionKeys ?? [])));
  }

  if (!input.sections.length) {
    issues.push({ level: "error", code: "SECTION_MISSING", message: "En az bir bölüm eklenmelidir." });
  }

  if (template) {
    const expectedCodes = template.sections.map((section) => section.code);
    const actualCodes = input.sections.map((section) => section.code);
    if (expectedCodes.join("|") !== actualCodes.join("|")) {
      issues.push({
        level: input.structureMode === "FULL_TEMPLATE" ? "error" : "warning",
        code: "SECTION_TEMPLATE_MISMATCH",
        message: `Beklenen bölümler: ${expectedCodes.join(", ")}`,
      });
    }
    for (const expected of template.sections) {
      const actual = input.sections.find((section) => section.code === expected.code);
      if (actual && actual.questionCount !== expected.questionCount) {
        // Resmî biçimde standart dışı soru sayısı yayını engeller; özel/branş denemesinde uyarıdır.
        issues.push({
          level: template.mode === "OFFICIAL" ? "error" : "warning",
          code: "SECTION_QUESTION_COUNT_NONSTANDARD",
          message: `${expected.title} için standart ${expected.questionCount} soru yerine ${actual.questionCount} tanımlandı.`,
          sectionCode: expected.code,
        });
      }
    }
  }

  const sectionCodes = new Set<string>();
  for (const section of input.sections) {
    if (sectionCodes.has(section.code)) issues.push({ level: "error", code: "DUPLICATE_SECTION", message: "Bölüm kodları benzersiz olmalıdır.", sectionCode: section.code });
    sectionCodes.add(section.code);
    if (section.questionCount !== section.questions.length) {
      issues.push({ level: "error", code: "QUESTION_COUNT_MISMATCH", message: `Tanımlı soru sayısı ${section.questionCount} ile soru kayıtları eşleşmiyor.`, sectionCode: section.code });
    }
    const numbers = new Set<number>();
    for (const question of section.questions) {
      if (numbers.has(question.questionNumber)) {
        issues.push({ level: "error", code: "DUPLICATE_QUESTION", message: "Soru numarası bölüm içinde tekrarlanamaz.", sectionCode: section.code, questionNumber: question.questionNumber });
      }
      numbers.add(question.questionNumber);
      if (!question.correctOption) {
        issues.push({ level: "error", code: "ANSWER_MISSING", message: "Her soru için doğru cevap girilmelidir.", sectionCode: section.code, questionNumber: question.questionNumber });
      }
      if (question.questionNumber < 1 || question.questionNumber > section.questionCount) {
        issues.push({ level: "error", code: "QUESTION_OUT_OF_RANGE", message: "Soru numarası bölüm aralığının dışında.", sectionCode: section.code, questionNumber: question.questionNumber });
      }
      if (requireOutcomes) {
        const outcomeIds = question.outcomes.map((outcome) => outcome.outcomeId);
        if (!outcomeIds.length) {
          issues.push({ level: "error", code: "OUTCOME_MISSING", message: "Her soru en az bir kazanıma bağlanmalıdır.", sectionCode: section.code, questionNumber: question.questionNumber });
        }
        if (new Set(outcomeIds).size !== outcomeIds.length) {
          issues.push({ level: "error", code: "DUPLICATE_OUTCOME", message: "Aynı kazanım bir soruya iki kez bağlanamaz.", sectionCode: section.code, questionNumber: question.questionNumber });
        }
        if (question.outcomes.filter((outcome) => outcome.isPrimary).length !== 1) {
          issues.push({ level: "error", code: "PRIMARY_OUTCOME_REQUIRED", message: "Her sorunun tam bir ana kazanımı olmalıdır.", sectionCode: section.code, questionNumber: question.questionNumber });
        }
      }
    }
  }

  const total = input.sections.reduce((sum, section) => sum + section.questionCount, 0);
  if (template) {
    const expectedTotal = template.sections.reduce((sum, section) => sum + section.questionCount, 0);
    if (total !== expectedTotal) {
      issues.push({ level: "warning", code: "NONSTANDARD_QUESTION_COUNT", message: `${template.label} için standart ${expectedTotal} soru yerine ${total} soru tanımlandı.` });
    }
  }

  return issues;
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

export type ExamSettings = {
  fullscreenRequired: boolean;
  blockCopyPaste: boolean;
  autoSubmitOnFullscreenExit: boolean;
  warnOnViolation: boolean;
  showResultImmediately: boolean;
  showAnswerKeyImmediately: boolean;
  allowReview: boolean;
};

export const DEFAULT_EXAM_SETTINGS: ExamSettings = {
  fullscreenRequired: false,
  blockCopyPaste: true,
  autoSubmitOnFullscreenExit: false,
  warnOnViolation: true,
  showResultImmediately: false,
  showAnswerKeyImmediately: false,
  allowReview: true,
};

export function normalizeExamSettings(raw: unknown): ExamSettings {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<ExamSettings>;
  return { ...DEFAULT_EXAM_SETTINGS, ...value };
}
