import type { CurriculumExam, MockExamErrorCategory } from "@prisma/client";

export type MockExamTemplateSection = { code: string; name: string; questions: number };

export const mockExamTemplates: Record<CurriculumExam, { label: string; defaultDuration: number; penalty: number; sections: MockExamTemplateSection[] }> = {
  LGS: { label: "LGS", defaultDuration: 155, penalty: 3, sections: [{ code: "TR", name: "Türkçe", questions: 20 }, { code: "INK", name: "T.C. İnkılap Tarihi", questions: 10 }, { code: "DIN", name: "Din Kültürü", questions: 10 }, { code: "EN", name: "İngilizce", questions: 10 }, { code: "MAT", name: "Matematik", questions: 20 }, { code: "FEN", name: "Fen Bilimleri", questions: 20 }] },
  TYT: { label: "TYT", defaultDuration: 165, penalty: 4, sections: [{ code: "TR", name: "Türkçe", questions: 40 }, { code: "SOS", name: "Sosyal Bilimler", questions: 20 }, { code: "MAT", name: "Temel Matematik", questions: 40 }, { code: "FEN", name: "Fen Bilimleri", questions: 20 }] },
  AYT: { label: "AYT", defaultDuration: 180, penalty: 4, sections: [{ code: "EDB", name: "Türk Dili ve Edebiyatı–Sosyal 1", questions: 40 }, { code: "SOS2", name: "Sosyal Bilimler 2", questions: 40 }, { code: "MAT", name: "Matematik", questions: 40 }, { code: "FEN", name: "Fen Bilimleri", questions: 40 }] },
  YDT: { label: "YDT", defaultDuration: 120, penalty: 4, sections: [{ code: "YDT", name: "Yabancı Dil", questions: 80 }] },
};

export const mockExamErrorLabels: Record<MockExamErrorCategory, string> = {
  KNOWLEDGE: "Bilgi eksiği",
  PROCESS: "İşlem / yöntem",
  ATTENTION: "Dikkat",
  TIME: "Süre yönetimi",
  BLANK: "Boş bırakma / başlayamama",
};

export const mockExamErrorActions: Record<MockExamErrorCategory, string> = {
  KNOWLEDGE: "En çok tekrar eden bölümden 15 dakikalık konu özeti ve 5 temel soru çöz.",
  PROCESS: "Bir çözümü adımlarına ayır; son iki adımı yazılı olarak kontrol et.",
  ATTENTION: "Bugünkü kısa sette her sorunun istenenini çözmeden önce işaretle.",
  TIME: "Bir kısa bölümde geçme–geri dönme kararını süre tutarak prova et.",
  BLANK: "Boş bıraktığın bölümden erişilebilir üç soruyla başlama adımını tekrar et.",
};

export type MockExamSectionInput = {
  subjectCode: string;
  correctCount: number;
  incorrectCount: number;
  blankCount: number;
  durationMinutes?: number | null;
  errorCategories?: MockExamErrorCategory[];
};

export function sectionNet(exam: CurriculumExam, correct: number, incorrect: number): number {
  return Math.round((correct - incorrect / mockExamTemplates[exam].penalty) * 100) / 100;
}

export function validateMockExamSections(exam: CurriculumExam, sections: MockExamSectionInput[]): string | null {
  const template = mockExamTemplates[exam];
  if (sections.length !== template.sections.length) return `${template.label} için ${template.sections.length} bölüm girilmelidir.`;
  const byCode = new Map(sections.map((section) => [section.subjectCode, section]));
  let reasonCount = 0;
  for (const expected of template.sections) {
    const section = byCode.get(expected.code);
    if (!section) return `${expected.name} bölümü eksik.`;
    if (section.correctCount + section.incorrectCount + section.blankCount !== expected.questions) return `${expected.name} toplamı ${expected.questions} soru olmalıdır.`;
    if ([section.correctCount, section.incorrectCount, section.blankCount].some((value) => !Number.isInteger(value) || value < 0)) return `${expected.name} sonuçlarını kontrol edin.`;
    if (section.durationMinutes != null && (!Number.isInteger(section.durationMinutes) || section.durationMinutes < 0 || section.durationMinutes > 600)) return `${expected.name} süresini kontrol edin.`;
    const categories = new Set(section.errorCategories || []);
    if (categories.size !== (section.errorCategories || []).length) return "Aynı hata nedeni bir bölümde bir kez seçilebilir.";
    reasonCount += categories.size;
  }
  if (reasonCount > 3) return "Bir deneme için en fazla üç hata nedeni seçilebilir.";
  return null;
}

export type MockExamTrendRow = { exam: CurriculumExam; takenAt: Date; sections: { subjectCode: string; subjectName: string; correctCount: number; incorrectCount: number; errors: { category: MockExamErrorCategory }[] }[] };

export function summarizeMockExamTrend(rows: MockExamTrendRow[]) {
  const ordered = [...rows].sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
  const recent = ordered.slice(0, 3);
  const errorCounts = new Map<MockExamErrorCategory, number>();
  const heatmap = new Map<string, { subject: string; categories: Record<MockExamErrorCategory, number> }>();
  for (const row of ordered) for (const section of row.sections) {
    const key = `${row.exam}:${section.subjectCode}`;
    const cell = heatmap.get(key) || { subject: section.subjectName, categories: { KNOWLEDGE: 0, PROCESS: 0, ATTENTION: 0, TIME: 0, BLANK: 0 } };
    for (const error of section.errors) {
      cell.categories[error.category] += 1;
      if (recent.includes(row)) errorCounts.set(error.category, (errorCounts.get(error.category) || 0) + 1);
    }
    heatmap.set(key, cell);
  }
  const recurring = [...errorCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] || null;
  return {
    heatmap: [...heatmap.entries()].map(([key, value]) => ({ key, ...value })),
    recurringError: recurring ? { category: recurring[0], count: recurring[1], action: mockExamErrorActions[recurring[0]] } : null,
  };
}
