/**
 * Config-based TYT / AYT / LGS sınav şablonları.
 * Hard-coded fragile logic yerine tek kaynak; create + readiness buradan okur.
 */

import type { OdkExamFamily } from "@prisma/client";

export type ExamTemplateSection = {
  code: string;
  title: string;
  questionCount: number;
  durationMinutes?: number;
};

export type ExamTemplate = {
  code: string;
  family: OdkExamFamily;
  label: string;
  structureMode: "MATH_ONLY" | "FULL_TEMPLATE";
  durationMinutes: number;
  scoringPolicyCode: string;
  wrongPenalty: number;
  sections: ExamTemplateSection[];
};

export const ODK_EXAM_TEMPLATES: Record<string, ExamTemplate> = {
  LGS_MATH: {
    code: "LGS_MATH",
    family: "LGS",
    label: "LGS Matematik",
    structureMode: "MATH_ONLY",
    durationMinutes: 40,
    scoringPolicyCode: "LGS_MATH_V1",
    wrongPenalty: 3,
    sections: [{ code: "MAT", title: "LGS Matematik", questionCount: 20 }],
  },
  TYT_MATH: {
    code: "TYT_MATH",
    family: "TYT",
    label: "TYT Matematik",
    structureMode: "MATH_ONLY",
    durationMinutes: 40,
    scoringPolicyCode: "YKS_MATH_V1",
    wrongPenalty: 4,
    sections: [{ code: "MAT", title: "TYT Matematik", questionCount: 40 }],
  },
  AYT_MATH: {
    code: "AYT_MATH",
    family: "AYT",
    label: "AYT Matematik",
    structureMode: "MATH_ONLY",
    durationMinutes: 40,
    scoringPolicyCode: "YKS_MATH_V1",
    wrongPenalty: 4,
    sections: [{ code: "MAT", title: "AYT Matematik", questionCount: 40 }],
  },
  LGS_FULL: {
    code: "LGS_FULL",
    family: "LGS",
    label: "LGS Tam Deneme",
    structureMode: "FULL_TEMPLATE",
    durationMinutes: 155,
    scoringPolicyCode: "LGS_FULL_V1",
    wrongPenalty: 3,
    sections: [
      { code: "TURKCE", title: "Türkçe", questionCount: 20 },
      { code: "INKILAP", title: "T.C. İnkılap Tarihi ve Atatürkçülük", questionCount: 10 },
      { code: "DIN", title: "Din Kültürü ve Ahlak Bilgisi", questionCount: 10 },
      { code: "INGILIZCE", title: "Yabancı Dil", questionCount: 10 },
      { code: "MAT", title: "Matematik", questionCount: 20 },
      { code: "FEN", title: "Fen Bilimleri", questionCount: 20 },
    ],
  },
  TYT_FULL: {
    code: "TYT_FULL",
    family: "TYT",
    label: "TYT Tam Deneme",
    structureMode: "FULL_TEMPLATE",
    durationMinutes: 165,
    scoringPolicyCode: "TYT_FULL_V1",
    wrongPenalty: 4,
    sections: [
      { code: "TURKCE", title: "Türkçe", questionCount: 40 },
      { code: "SOSYAL", title: "Sosyal Bilimler", questionCount: 20 },
      { code: "MAT", title: "Temel Matematik", questionCount: 40 },
      { code: "FEN", title: "Fen Bilimleri", questionCount: 20 },
    ],
  },
  AYT_FULL: {
    code: "AYT_FULL",
    family: "AYT",
    label: "AYT Tam Deneme",
    structureMode: "FULL_TEMPLATE",
    durationMinutes: 180,
    scoringPolicyCode: "AYT_FULL_V1",
    wrongPenalty: 4,
    sections: [
      { code: "EDB_SOS1", title: "Türk Dili ve Edebiyatı / Sosyal Bilimler-1", questionCount: 40 },
      { code: "SOS2", title: "Sosyal Bilimler-2", questionCount: 40 },
      { code: "MAT", title: "Matematik", questionCount: 40 },
      { code: "FEN", title: "Fen Bilimleri", questionCount: 40 },
    ],
  },
};

export function getExamTemplate(code: string): ExamTemplate | null {
  return ODK_EXAM_TEMPLATES[code] ?? null;
}

export function resolveTemplateForCreate(input: {
  family: OdkExamFamily;
  structureMode?: "MATH_ONLY" | "FULL_TEMPLATE";
  templateCode?: string | null;
}): ExamTemplate {
  if (input.templateCode) {
    const template = getExamTemplate(input.templateCode);
    if (!template) throw new Error(`Bilinmeyen sınav şablonu: ${input.templateCode}`);
    if (template.family !== input.family) throw new Error("Şablon sınav türüyle eşleşmiyor.");
    return template;
  }
  const mode = input.structureMode || "FULL_TEMPLATE";
  const code = mode === "MATH_ONLY" ? `${input.family}_MATH` : `${input.family}_FULL`;
  const template = getExamTemplate(code);
  if (!template) throw new Error(`Şablon bulunamadı: ${code}`);
  return template;
}

export function templateTotalQuestions(template: ExamTemplate): number {
  return template.sections.reduce((sum, section) => sum + section.questionCount, 0);
}

export function withSectionRanges(template: ExamTemplate): Array<ExamTemplateSection & { questionStart: number; questionEnd: number; position: number }> {
  let cursor = 1;
  return template.sections.map((section, position) => {
    const questionStart = cursor;
    const questionEnd = cursor + section.questionCount - 1;
    cursor = questionEnd + 1;
    return { ...section, questionStart, questionEnd, position };
  });
}
