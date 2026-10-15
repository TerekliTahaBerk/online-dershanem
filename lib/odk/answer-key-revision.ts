/**
 * Cevap anahtarı REVİZYONU (P0-2, docs/roadmaps/odk-exam-experience-overhaul.md).
 *
 * Kilitli (LIVE ve sonrası) bir denemenin anahtarı doğrudan yazılmaz; yetkili
 * personel bir revizyon önerir: soru başına yeni doğru seçenek ya da iptal,
 * gerekçe ve etki önizlemesi. Onaylanan revizyon `OdkAnswerKeyRevision` olarak
 * saklanır (önceki/yeni cevaplar), soru kayıtları güncellenir ve deneme
 * yeniden puanlanır. Bu modül saf doğrulama ve fark hesabıdır.
 */

import type { OdkAnswerOption, OdkExamStatus } from "@prisma/client";

/**
 * İptal edilen sorunun puanlama politikası. Tek uygulanan değer "EXCLUDE":
 * soru tüm adaylar için değerlendirme dışı bırakılır (doğru/yanlış/boş
 * sayılmaz, bölüm soru sayısından düşer). ÖSYM/MEB'in o yıla özgü farklı bir
 * kuralı (ör. herkese doğru sayma) gerekirse burada AÇIKÇA yeni bir değer
 * olarak eklenmeli ve puanlama servisine bağlanmalıdır; sessizce varsayılmaz.
 */
export const CANCELLED_QUESTION_POLICY = "EXCLUDE" as const;

/** Revizyonun açık olduğu durumlar. DRAFT/READY'de taslak editörü kullanılır. */
export const ANSWER_KEY_REVISION_STATUSES = ["LIVE", "ENDED", "SCORED", "RELEASED"] as const satisfies readonly OdkExamStatus[];

export type AnswerKeyEntry = { questionId: string; correctOption: OdkAnswerOption };

/** Önceki ve sonraki puanlama anahtarı arasındaki fark (iptal = anahtardan çıkış). */
export function diffAnswerKey(previous: readonly AnswerKeyEntry[], next: readonly AnswerKeyEntry[]) {
  const before = new Map(previous.map((entry) => [entry.questionId, entry.correctOption]));
  const after = new Map(next.map((entry) => [entry.questionId, entry.correctOption]));
  return {
    changed: [...after].filter(([questionId, option]) => before.has(questionId) && before.get(questionId) !== option).map(([questionId]) => questionId),
    removed: [...before.keys()].filter((questionId) => !after.has(questionId)),
    added: [...after.keys()].filter((questionId) => !before.has(questionId)),
  };
}

export type AnswerKeyChange =
  | { questionId: string; action: "SET_ANSWER"; correctOption: OdkAnswerOption }
  | { questionId: string; action: "CANCEL" };

export type RevisionQuestion = { id: string; sectionCode: string; questionNumber: number; correctOption: OdkAnswerOption | null; isActive: boolean };

export type RevisionIssue = { code: string; message: string; questionId?: string; sectionCode?: string; questionNumber?: number };

export type AnswerKeyRevisionPlan =
  | {
      ok: true;
      override: Map<string, { correctOption: OdkAnswerOption } | { cancelled: true }>;
      previousAnswers: Record<string, OdkAnswerOption | null>;
      nextAnswers: Record<string, OdkAnswerOption | "CANCELLED">;
      cancelledQuestionPolicy: typeof CANCELLED_QUESTION_POLICY;
    }
  | { ok: false; issues: RevisionIssue[] };

export function planAnswerKeyRevision(input: { examStatus: OdkExamStatus; questions: readonly RevisionQuestion[]; changes: readonly AnswerKeyChange[] }): AnswerKeyRevisionPlan {
  if (!(ANSWER_KEY_REVISION_STATUSES as readonly OdkExamStatus[]).includes(input.examStatus)) {
    return { ok: false, issues: [{ code: "REVISION_NOT_ALLOWED", message: "Anahtar revizyonu yalnız canlı, kapanmış, puanlanmış veya yayınlanmış denemede yapılır. Taslakta soru editörünü kullanın." }] };
  }
  if (!input.changes.length) return { ok: false, issues: [{ code: "EMPTY_REVISION", message: "En az bir soru değişikliği gerekir." }] };

  const byId = new Map(input.questions.map((question) => [question.id, question]));
  const issues: RevisionIssue[] = [];
  const seen = new Set<string>();
  const override = new Map<string, { correctOption: OdkAnswerOption } | { cancelled: true }>();
  const previousAnswers: Record<string, OdkAnswerOption | null> = {};
  const nextAnswers: Record<string, OdkAnswerOption | "CANCELLED"> = {};

  for (const change of input.changes) {
    const question = byId.get(change.questionId);
    const where = question ? { questionId: change.questionId, sectionCode: question.sectionCode, questionNumber: question.questionNumber } : { questionId: change.questionId };
    if (!question) {
      issues.push({ code: "UNKNOWN_QUESTION", message: "Soru bu denemenin güncel sürümünde yok.", ...where });
      continue;
    }
    if (seen.has(change.questionId)) {
      issues.push({ code: "DUPLICATE_CHANGE", message: "Aynı soru için tek değişiklik girilebilir.", ...where });
      continue;
    }
    seen.add(change.questionId);
    if (!question.isActive) {
      issues.push({ code: "QUESTION_ALREADY_CANCELLED", message: "İptal edilmiş soru revizyonla değiştirilemez.", ...where });
      continue;
    }
    if (change.action === "SET_ANSWER") {
      if (change.correctOption === question.correctOption) {
        issues.push({ code: "ANSWER_UNCHANGED", message: "Yeni cevap mevcut cevapla aynı.", ...where });
        continue;
      }
      override.set(question.id, { correctOption: change.correctOption });
      nextAnswers[question.id] = change.correctOption;
    } else {
      override.set(question.id, { cancelled: true });
      nextAnswers[question.id] = "CANCELLED";
    }
    previousAnswers[question.id] = question.correctOption;
  }

  const remainingActive = input.questions.filter((question) => question.isActive && !(override.get(question.id) && "cancelled" in override.get(question.id)!)).length;
  if (!remainingActive) issues.push({ code: "ALL_QUESTIONS_CANCELLED", message: "Tüm sorular iptal edilemez." });

  return issues.length ? { ok: false, issues } : { ok: true, override, previousAnswers, nextAnswers, cancelledQuestionPolicy: CANCELLED_QUESTION_POLICY };
}
