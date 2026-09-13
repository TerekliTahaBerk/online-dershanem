/**
 * Admin preview — gerçek attempt oluşturmadan öğrenci / öğretmen / veli deneyimini gösterir.
 */

import type { ExamSecurityPolicy } from "@/lib/odk/exam-security";
import { securityPolicySummary } from "@/lib/odk/exam-security";

export type AdminPreviewKind = "STUDENT_EXAM" | "TEACHER_REPORT" | "PARENT_REPORT";

export type AdminPreviewPayload = {
  kind: AdminPreviewKind;
  examId: string;
  title: string;
  family: string;
  disclaimer: string;
  createsAttempt: false;
  studentExam?: {
    durationMinutes: number;
    questionCount: number;
    sections: Array<{ code: string; title: string; questionCount: number }>;
    securityNotes: string[];
    startBlockedReason: string;
  };
  teacherReport?: {
    visibleFields: string[];
    hiddenFields: string[];
    sampleNote: string;
  };
  parentReport?: {
    visibleFields: string[];
    hiddenFields: string[];
    sampleNote: string;
  };
};

export function buildAdminPreview(input: {
  kind: AdminPreviewKind;
  examId: string;
  title: string;
  family: string;
  durationMinutes: number;
  sections: Array<{ code: string; title: string; questionCount: number }>;
  security: ExamSecurityPolicy;
}): AdminPreviewPayload {
  const base = {
    kind: input.kind,
    examId: input.examId,
    title: input.title,
    family: input.family,
    createsAttempt: false as const,
  };

  if (input.kind === "STUDENT_EXAM") {
    return {
      ...base,
      disclaimer: "Önizleme gerçek sınav oturumu başlatmaz; süre işlemez ve cevap kaydı oluşmaz.",
      studentExam: {
        durationMinutes: input.durationMinutes,
        questionCount: input.sections.reduce((sum, section) => sum + section.questionCount, 0),
        sections: input.sections,
        securityNotes: securityPolicySummary(input.security),
        startBlockedReason: "Admin önizlemesi — Denemeye Gir kapalı",
      },
    };
  }

  if (input.kind === "TEACHER_REPORT") {
    return {
      ...base,
      disclaimer: "Öğretmen yalnız erişebildiği öğrencilerin yayınlanmış sonuçlarını görür.",
      teacherReport: {
        visibleFields: ["öğrenci listesi", "net", "ders performansı", "kazanım eksikleri", "süre davranışı özeti"],
        hiddenFields: ["raw integrity event log", "IP / session metadata"],
        sampleNote: "Integrity için yalnız ‘Yönetim incelemesi mevcut’ bilgisi gösterilir.",
      },
    };
  }

  return {
    ...base,
    disclaimer: "Veli yalnız bağlı öğrencinin yayınlanmış sonucunu görür; raw integrity log yok.",
    parentReport: {
      visibleFields: ["toplam performans", "dersler", "güçlü alanlar", "gelişim alanları", "önceki denemeye göre değişim"],
      hiddenFields: ["integrity event timeline", "cevap değişiklik history"],
      sampleNote: "Sonuçlar yönetim yayınlamadan veliye açılmaz.",
    },
  };
}
