import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma, type CurriculumExam, type MockExamErrorCategory, type UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { mockExamTemplates, validateMockExamSections } from "@/lib/mock-exams";
import { mockExamViewInclude, toMockExamView } from "@/lib/mock-exam-view";
import { initialReviewDueAt } from "@/lib/review-scheduler";
import { operationDigest } from "./group-mutation-core";
import { mockExamRevision } from "./mock-exam-core";

export { mockExamRevision };

/**
 * DIŞ DENEME (MockExam) yazma servisi — `POST /api/panel/mock-exams` ve
 * `PATCH /api/panel/mock-exams/:id` (web çalışma alanı ve mobil yönetim
 * ekranı AYNI uçlar) buradan çalışır. Kurallar rotalardan olduğu gibi
 * taşındı; ek olarak:
 *  - İsteğe bağlı `idempotencyKey` aktöre bağlıdır; aynı gövdeyle tekrar
 *    ilk sonucu döndürür, farklı gövdede 409 `IDEMPOTENCY_REUSE`.
 *  - Revizyonda isteğe bağlı `expectedRevision` (nedenler + sonraki adım
 *    özeti); başka yerde değişen kayıt 409 `MOCK_EXAM_CONFLICT`.
 *  - Kayıt ve audit makbuzu tek transaction'dadır; ürün olayları commit
 *    sonrası yazılır.
 */

export class MockExamError extends Error {
  constructor(
    public status: 400 | 403 | 404 | 409,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

type Actor = { userId: string; role: UserRole };
export type MockExamCreateInput = {
  studentId?: string;
  exam: CurriculumExam;
  title?: string;
  publisher?: string;
  takenAt: string;
  durationMinutes?: number | null;
  entryDurationMs?: number;
  source: "MANUAL" | "PASTE";
  sections: { subjectCode: string; correctCount: number; incorrectCount: number; blankCount: number; durationMinutes?: number | null; errorCategories: MockExamErrorCategory[] }[];
  idempotencyKey?: string;
};
export type MockExamReviseInput = {
  reasons: { sectionId: string; categories: MockExamErrorCategory[] }[];
  nextAction?: string | null;
  idempotencyKey?: string;
  expectedRevision?: string;
};

const reuse = () => new MockExamError(409, "IDEMPOTENCY_REUSE", "İşlem anahtarı farklı bir istek için kullanılamaz.");
const isRetryable = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code);

function receiptEntity(payload: unknown, digest: string) {
  const saved = payload as { operationDigest?: string } | null;
  if (saved?.operationDigest !== digest) throw reuse();
}

export async function createMockExamService(actor: Actor, input: MockExamCreateInput) {
  const ownProfile = actor.role === "STUDENT" ? await prisma.studentProfile.findUnique({ where: { userId: actor.userId }, select: { id: true } }) : null;
  const studentId = actor.role === "STUDENT" ? ownProfile?.id : input.studentId;
  if (!studentId) throw new MockExamError(400, "STUDENT_REQUIRED", "Öğrenci seçin.");

  const { entryDurationMs: _duration, idempotencyKey, ...body } = input;
  void _duration;
  const key = `mock-exam-create:${actor.userId}:${idempotencyKey ?? randomUUID()}`;
  const digest = operationDigest({ ...body, studentId });
  const replay = async () => {
    const receipt = await prisma.auditLog.findUnique({ where: { idempotencyKey: key }, select: { payload: true, entityId: true } });
    if (!receipt) return null;
    receiptEntity(receipt.payload, digest);
    const exam = await prisma.mockExam.findUniqueOrThrow({ where: { id: receipt.entityId! }, include: mockExamViewInclude });
    return { exam: toMockExamView(exam), replayed: true };
  };
  const prior = await replay();
  if (prior) return prior;

  const student = await prisma.studentProfile.findFirst({ where: { id: studentId, user: { status: "ACTIVE" }, ...(actor.role === "TEACHER" ? { enrollments: { some: { endedAt: null, group: { teacherId: actor.userId, isActive: true } } } } : {}) }, select: { id: true } });
  if (!student) throw new MockExamError(404, "STUDENT_NOT_FOUND", "Yetkili olduğunuz öğrenci bulunamadı.");
  const validationError = validateMockExamSections(input.exam, input.sections);
  if (validationError) throw new MockExamError(400, "INVALID_SECTIONS", validationError);
  const sectionDuration = input.sections.reduce((sum, section) => sum + (section.durationMinutes || 0), 0);
  if (input.durationMinutes && sectionDuration > input.durationMinutes) throw new MockExamError(400, "INVALID_DURATION", "Bölüm süreleri toplam süreden büyük olamaz.");

  const template = mockExamTemplates[input.exam];
  const reviewQueue = getPanelFeatureFlags().reviewQueue;
  const reasonCount = input.sections.reduce((sum, section) => sum + section.errorCategories.length, 0);
  let examId: string;
  try {
    examId = await prisma.$transaction(
      async (tx) => {
        const saved = await tx.auditLog.findUnique({ where: { idempotencyKey: key }, select: { payload: true, entityId: true } });
        if (saved) {
          receiptEntity(saved.payload, digest);
          return saved.entityId!;
        }
        const created = await tx.mockExam.create({ data: { studentId, exam: input.exam, title: input.title || null, publisher: input.publisher || null, takenAt: new Date(input.takenAt), durationMinutes: input.durationMinutes || null, createdById: actor.userId } });
        for (const [position, expected] of template.sections.entries()) {
          const section = input.sections.find((item) => item.subjectCode === expected.code)!;
          const createdSection = await tx.mockExamSection.create({ data: { mockExamId: created.id, subjectCode: expected.code, subjectName: expected.name, questionCount: expected.questions, correctCount: section.correctCount, incorrectCount: section.incorrectCount, blankCount: section.blankCount, durationMinutes: section.durationMinutes || null, position, errors: { create: section.errorCategories.map((errorCategory) => ({ category: errorCategory })) } } });
          if (reviewQueue && section.incorrectCount > 0) await tx.reviewItem.create({ data: { studentId, sourceType: "MOCK_EXAM_SECTION", mockExamSectionId: createdSection.id, createdById: actor.userId, title: `${expected.name} deneme dönüşü`, sourceReference: `${input.exam} · ${input.title || input.publisher || "deneme"} · ${section.incorrectCount} yanlış`, dueAt: initialReviewDueAt(new Date(input.takenAt)) } });
        }
        await tx.auditLog.create({ data: { actorUserId: actor.userId, actorType: "USER", idempotencyKey: key, entityType: "MockExam", entityId: created.id, action: "mock_exam.created", summary: `${input.exam} deneme sonucu eklendi`, payload: { operationDigest: digest, exam: input.exam, sectionCount: input.sections.length, reasonCount } } });
        return created.id;
      },
      { isolationLevel: "Serializable", timeout: 15_000 },
    );
  } catch (error) {
    if (isRetryable(error)) {
      const saved = await replay();
      if (saved) return saved;
      throw new MockExamError(409, "MOCK_EXAM_CONFLICT", "Deneme kaydı eşzamanlı değişti. Görünümü yenileyin.");
    }
    throw error;
  }

  await recordPanelProductEvent({ name: "mock_exam_entry_completed", properties: { examType: input.exam, entryDurationMs: input.entryDurationMs || 0, sectionCount: input.sections.length, reasonCount, source: input.source } }, actor.role);
  const reviewItemCount = reviewQueue ? input.sections.filter((section) => section.incorrectCount > 0).length : 0;
  if (reviewItemCount) await recordPanelProductEvent({ name: "review_items_created", properties: { sourceType: "MOCK_EXAM_SECTION", itemCount: reviewItemCount } }, actor.role);
  const fullExam = await prisma.mockExam.findUniqueOrThrow({ where: { id: examId }, include: mockExamViewInclude });
  return { exam: toMockExamView(fullExam), replayed: false };
}

export async function reviseMockExamService(actor: Actor, examId: string, input: MockExamReviseInput) {
  if (input.reasons.reduce((sum, item) => sum + new Set(item.categories).size, 0) > 3) throw new MockExamError(400, "TOO_MANY_REASONS", "Bir deneme için en fazla üç hata nedeni seçilebilir.");
  if (actor.role === "STUDENT" && input.nextAction !== undefined) throw new MockExamError(403, "NEXT_ACTION_FORBIDDEN", "Sonraki eylemi yalnız öğretmen veya admin onaylayabilir.");

  const key = `mock-exam-revise:${actor.userId}:${input.idempotencyKey ?? randomUUID()}`;
  const digest = operationDigest({ examId, reasons: input.reasons, nextAction: input.nextAction ?? null, expectedRevision: input.expectedRevision ?? null });
  const replay = async () => {
    const receipt = await prisma.auditLog.findUnique({ where: { idempotencyKey: key }, select: { payload: true } });
    if (!receipt) return null;
    receiptEntity(receipt.payload, digest);
    return { replayed: true };
  };
  const prior = await replay();
  if (prior) return prior;

  const scope = actor.role === "STUDENT" ? { student: { userId: actor.userId } } : actor.role === "TEACHER" ? { student: { enrollments: { some: { endedAt: null, group: { teacherId: actor.userId, isActive: true } } } } } : {};
  const exam = await prisma.mockExam.findFirst({ where: { id: examId, ...scope }, include: { sections: { include: { errors: true } } } });
  if (!exam) throw new MockExamError(404, "NOT_FOUND", "Yetkili olduğunuz deneme bulunamadı.");
  const sectionIds = new Set(exam.sections.map((section) => section.id));
  if (input.reasons.some((item) => !sectionIds.has(item.sectionId) || new Set(item.categories).size !== item.categories.length)) throw new MockExamError(400, "INVALID_REASONS", "Geçersiz bölüm veya tekrar eden hata nedeni.");
  const before = exam.sections.flatMap((section) => section.errors.map((error) => `${section.id}:${error.category}`)).sort();
  const after = input.reasons.flatMap((section) => section.categories.map((error) => `${section.sectionId}:${error}`)).sort();
  const changed = before.filter((item) => !after.includes(item)).length + after.filter((item) => !before.includes(item)).length;

  try {
    await prisma.$transaction(
      async (tx) => {
        const saved = await tx.auditLog.findUnique({ where: { idempotencyKey: key }, select: { payload: true } });
        if (saved) return receiptEntity(saved.payload, digest);
        if (input.expectedRevision !== undefined) {
          const current = await tx.mockExam.findUniqueOrThrow({ where: { id: examId }, select: { nextAction: true, sections: { select: { id: true, errors: { select: { category: true } } } } } });
          if (mockExamRevision(current) !== input.expectedRevision) throw new MockExamError(409, "MOCK_EXAM_CONFLICT", "Deneme başka bir yerde güncellendi. Görünümü yenileyin.");
        }
        await tx.mockExamSectionError.deleteMany({ where: { sectionId: { in: [...sectionIds] } } });
        for (const section of input.reasons) if (section.categories.length) await tx.mockExamSectionError.createMany({ data: section.categories.map((errorCategory) => ({ sectionId: section.sectionId, category: errorCategory, revisedById: actor.role === "STUDENT" ? null : actor.userId })) });
        if (input.nextAction !== undefined) await tx.mockExam.update({ where: { id: examId }, data: { nextAction: input.nextAction || null, nextActionApprovedAt: input.nextAction ? new Date() : null, reviewedById: input.nextAction ? actor.userId : null } });
        await tx.auditLog.create({ data: { actorUserId: actor.userId, actorType: "USER", idempotencyKey: key, entityType: "MockExam", entityId: examId, action: "mock_exam.reasons_revised", summary: "Deneme hata nedenleri güncellendi", payload: { operationDigest: digest, changedCount: changed, reasonCount: after.length, nextActionApproved: Boolean(input.nextAction) } } });
      },
      { isolationLevel: "Serializable", timeout: 15_000 },
    );
  } catch (error) {
    if (isRetryable(error)) {
      const saved = await replay();
      if (saved) return saved;
      throw new MockExamError(409, "MOCK_EXAM_CONFLICT", "Deneme başka bir yerde güncellendi. Görünümü yenileyin.");
    }
    throw error;
  }
  if (changed) await recordPanelProductEvent({ name: "error_reason_revised", properties: { examType: exam.exam, actorRole: actor.role as "ADMIN" | "TEACHER" | "STUDENT", changedCount: changed, reasonCount: after.length } }, actor.role);
  return { replayed: false };
}
