import "server-only";

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma, type OdkAnswerOption, type PrismaClient } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { afterResponse } from "@/lib/after-response";
import { afterEducationCommit, transactionalAudit } from "@/lib/panel/education-write";
import { getOdkExamReadiness } from "@/lib/odk/admin-exam-server";
import type { assignmentCreateSchema, updateExamScheduleSchema, updateQuestionsSchema } from "@/lib/odk/admin-schemas";
import { getOdkExamFamilyCode } from "@/lib/odk/exam-family";
import { previewAnswerKeyImport, summarizeAnswerKeyPreview } from "@/lib/odk/answer-key-import";
import { resolveAssignmentStudents } from "@/lib/odk/assignment-resolve";
import { validateSchedule } from "@/lib/odk/exam-domain";
import { DEFAULT_EXAM_SECURITY_POLICY, mergeExamSettings, parseExamSecurityPolicy } from "@/lib/odk/exam-security";
import { applySessionPlanEdits, readSessionPlan, sessionPlanWorkingMinutes } from "@/lib/odk/exam-sessions";
import { importTargetStateHash, previewOutcomeImport, type OutcomeCatalogHit } from "@/lib/odk/outcome-import";

/**
 * DENEME HAZIRLIK KOMUTLARI (K03b) — web `/api/odk/admin/exams/[id]/**` uçları
 * ve mobil `POST /api/panel/odk/management/exams/[id]` AYNI kuralları çağırır
 * (rota gövdelerinden taşındı). Yanıt biçimi web uçlarıyla aynıdır. `db`
 * verilmezse kendi transaction'ı / global istemci kullanılır; mobil komut
 * `runEducationMutation` transaction'ını geçirir (audit ve makbuz aynı
 * transaction'da, yan etkiler commit sonrası).
 */
type Db = PrismaClient;
type ScheduleInput = z.output<typeof updateExamScheduleSchema>;
type AssignmentInput = z.output<typeof assignmentCreateSchema>;
type QuestionsInput = z.output<typeof updateQuestionsSchema>["questions"];
export type ImportKind = "answer-key" | "outcomes";

export async function updateOdkExamSchedule(id: string, input: ScheduleInput, actorId: string, db: Db = prisma) {
  const current = await db.odkExam.findFirst({
    where: { id, status: { in: ["DRAFT", "READY"] } },
    select: { id: true, currentVersionId: true, currentVersion: { select: { id: true, settings: true, autoSubmit: true } } },
  });
  if (!current) return NextResponse.json({ error: "Yalnız taslak veya hazır deneme düzenlenebilir." }, { status: 409 });
  const startsAt = input.startsAt ? new Date(input.startsAt) : null;
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;
  const existingPolicy = parseExamSecurityPolicy(current.currentVersion?.settings);
  const security = {
    ...DEFAULT_EXAM_SECURITY_POLICY,
    ...existingPolicy,
    ...(input.security || {}),
    autoSubmit: input.autoSubmit ?? input.security?.autoSubmit ?? existingPolicy.autoSubmit,
  };
  const exam = await db.$transaction(async (tx) => {
    const updated = await tx.odkExam.update({
      where: { id },
      data: {
        title: input.title,
        startsAt,
        endsAt,
        lateEntryMinutes: input.lateEntryMinutes,
        meetRequired: input.meetRequired,
        meetUrl: input.meetUrl || null,
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.internalCode !== undefined ? { internalCode: input.internalCode } : {}),
      },
    });
    if (current.currentVersionId) {
      await tx.odkExamVersion.update({
        where: { id: current.currentVersionId },
        data: {
          autoSubmit: security.autoSubmit,
          settings: mergeExamSettings(current.currentVersion?.settings, security) as Prisma.InputJsonValue,
          extraTimePolicy: security.allowExtraTimeMinutes > 0 ? ({ allowExtraTimeMinutes: security.allowExtraTimeMinutes } as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      });
    }
    return updated;
  });
  await transactionalAudit(db)({ actorUserId: actorId, entityType: "OdkExam", entityId: id, action: "odk.exam_updated", summary: "ODK deneme planlama ve güvenlik bilgileri güncellendi" });
  return NextResponse.json({ exam: { id: exam.id } });
}

export async function lockOdkExam(id: string, actorId: string, db: Db = prisma) {
  const { exam, issues } = await getOdkExamReadiness(id, db);
  if (!exam?.currentVersion || exam.status !== "DRAFT" || exam.currentVersion.status !== "DRAFT") return NextResponse.json({ error: "Yalnız taslak sürüm kilitlenebilir." }, { status: 409 });
  const errors = issues.filter((issue) => issue.level === "error");
  if (errors.length) return NextResponse.json({ error: "Yayın kontrolleri tamamlanmadı.", issues }, { status: 400 });
  const versionId = exam.currentVersion.id;
  await db.$transaction(async (tx) => {
    await tx.odkExamVersion.update({ where: { id: versionId }, data: { status: "LOCKED", lockedAt: new Date() } });
    await tx.odkExam.update({ where: { id }, data: { status: "READY" } });
  });
  await transactionalAudit(db)({ actorUserId: actorId, entityType: "OdkExam", entityId: id, action: "odk.exam_version_locked", summary: "Sınav sürümü kilitlendi ve planlamaya hazırlandı", payload: { warningCount: issues.length } });
  return NextResponse.json({ status: "READY", issues });
}

export async function scheduleOdkExam(id: string, actorId: string, db: Db = prisma) {
  const exam = await db.odkExam.findFirst({ where: { id, status: "READY", currentVersion: { status: "LOCKED" } }, select: { startsAt: true, endsAt: true, meetRequired: true, meetUrl: true } });
  if (!exam) return NextResponse.json({ error: "Deneme planlamaya hazır değil." }, { status: 409 });
  const issues = validateSchedule(exam);
  if (issues.length) return NextResponse.json({ error: issues[0].message, issues }, { status: 400 });
  await db.odkExam.update({ where: { id }, data: { status: "SCHEDULED", publishedAt: new Date() } });
  await transactionalAudit(db)({ actorUserId: actorId, entityType: "OdkExam", entityId: id, action: "odk.exam_scheduled", summary: "ODK denemesi planlandı ve erişim hazırlığına açıldı" });
  return NextResponse.json({ status: "SCHEDULED" });
}

export async function updateOdkExamSessions(id: string, sessions: Array<{ key: string; durationMinutes: number; breakAfterMinutes: number }>, actorId: string, db: Db = prisma) {
  const exam = await db.odkExam.findFirst({ where: { id, status: "DRAFT", currentVersion: { status: "DRAFT" } }, select: { currentVersion: { select: { id: true, settings: true } } } });
  if (!exam?.currentVersion) return NextResponse.json({ error: "Kilitlenmiş veya bulunamayan sürüm düzenlenemez." }, { status: 409 });
  const plan = readSessionPlan(exam.currentVersion.settings);
  if (!plan) return NextResponse.json({ error: "Bu denemenin oturum planı yok." }, { status: 409 });
  const result = applySessionPlanEdits(plan, sessions);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  const settings = { ...(exam.currentVersion.settings as Record<string, unknown>), sessions: result.plan };
  await db.odkExamVersion.update({ where: { id: exam.currentVersion.id }, data: { settings: settings as Prisma.InputJsonValue, durationMinutes: sessionPlanWorkingMinutes(result.plan) } });
  await transactionalAudit(db)({
    actorUserId: actorId,
    entityType: "OdkExam",
    entityId: id,
    action: "odk.exam_sessions_updated",
    summary: "Oturumlu deneme süre ve ara planı güncellendi",
    payload: { sessions: result.plan.map((item) => ({ key: item.key, durationMinutes: item.durationMinutes, breakAfterMinutes: item.breakAfterMinutes })) },
  });
  return NextResponse.json({ ok: true, sessions: result.plan });
}

export async function assignOdkExam(id: string, input: AssignmentInput, actorId: string, db: Db = prisma) {
  const exam = await db.odkExam.findUnique({ where: { id }, select: { id: true, status: true, startsAt: true } });
  if (!exam) return NextResponse.json({ error: "Deneme bulunamadı." }, { status: 404 });
  if (["ARCHIVED"].includes(exam.status)) return NextResponse.json({ error: "Arşivlenmiş denemeye atama yapılamaz." }, { status: 409 });
  const resolved = await resolveAssignmentStudents(input);
  const studentIds = resolved.studentUserIds;
  if (!studentIds.length) return NextResponse.json({ error: "Seçilen kaynakta aktif öğrenci bulunamadı." }, { status: 400 });
  const { source, sourceRefId } = resolved;
  const students = await db.user.findMany({ where: { id: { in: studentIds }, role: "STUDENT", status: "ACTIVE" }, select: { id: true, fullName: true, email: true } });
  if (!students.length) return NextResponse.json({ error: "Aktif öğrenci bulunamadı." }, { status: 400 });
  let created = 0;
  let updated = 0;
  await db.$transaction(async (tx) => {
    for (const student of students) {
      const existing = await tx.odkExamAssignment.findUnique({ where: { examId_studentUserId: { examId: id, studentUserId: student.id } } });
      const snapshot = { fullName: student.fullName, email: student.email, source, sourceRefId, resolvedFrom: resolved.resolvedFrom, assignedAt: new Date().toISOString() };
      if (existing) {
        await tx.odkExamAssignment.update({ where: { id: existing.id }, data: { isActive: true, revokedAt: null, source, sourceRefId, snapshot, assignedById: actorId, assignedAt: new Date() } });
        updated += 1;
      } else {
        await tx.odkExamAssignment.create({ data: { examId: id, studentUserId: student.id, source, sourceRefId, snapshot, assignedById: actorId } });
        created += 1;
      }
    }
  });
  await transactionalAudit(db)({
    actorUserId: actorId,
    entityType: "OdkExam",
    entityId: id,
    action: "odk.exam_assigned",
    summary: `${created + updated} öğrenci denemeye atandı`,
    payload: { created, updated, source, sourceRefId, resolvedFrom: resolved.resolvedFrom },
  });
  // Ürünler arası olay: commit sonrası (mobil transaction'da) / yanıt sonrası.
  await afterEducationCommit(db, async () => {
    const { onMockExamAssigned } = await import("@/lib/student-success/server/emit-hooks");
    for (const student of students) {
      const profile = await prisma.studentProfile.findUnique({ where: { userId: student.id }, select: { id: true } });
      if (!profile) continue;
      afterResponse("odk.exam_assignment.cross_product_emit_failed", () => onMockExamAssigned({ examId: id, studentId: profile.id, actorUserId: actorId, startsAt: exam.startsAt ?? null, assignmentId: null }), { examId: id, studentId: profile.id });
    }
  });
  return NextResponse.json({ created, updated, total: created + updated, source, sourceRefId }, { status: 201 });
}

async function loadImportQuestions(db: Db, examId: string) {
  const exam = await db.odkExam.findUnique({
    where: { id: examId },
    include: {
      examFamilyRef: { select: { code: true } },
      currentVersion: { include: { sections: { orderBy: { position: "asc" }, include: { questions: { where: { isActive: true }, orderBy: { position: "asc" }, select: { id: true, questionNumber: true, correctOption: true, outcomes: { select: { outcomeId: true, isPrimary: true } } } } } } } },
    },
  });
  if (!exam?.currentVersion) return null;
  const questions = exam.currentVersion.sections.flatMap((section) => section.questions.map((question) => ({ ...question, sectionCode: section.code })));
  return { exam, version: exam.currentVersion, questions };
}

type ImportQuestions = NonNullable<Awaited<ReturnType<typeof loadImportQuestions>>>["questions"];

/** Import'un yazacağı alanın güncel durumu (P0-4): önizleme ile commit arasında değişirse commit reddedilir. */
function importStateHash(kind: ImportKind, questions: ImportQuestions) {
  return importTargetStateHash(questions.map((question) => ({
    id: question.id,
    state: kind === "answer-key"
      ? `${question.sectionCode}:${question.questionNumber}:${question.correctOption ?? "-"}`
      : `${question.sectionCode}:${question.questionNumber}:${question.outcomes.map((outcome) => `${outcome.outcomeId}${outcome.isPrimary ? "*" : ""}`).sort().join(",")}`,
  })));
}

/** Sınav ailesinin (taslak/aktif müfredat sürümleri) kazanım kataloğu; ders ve yıl bilgisiyle (P0-5). */
async function familyOutcomeCatalog(db: Db, familyCode: string): Promise<OutcomeCatalogHit[]> {
  const rows = await db.learningOutcome.findMany({
    where: { isActive: true, unit: { subject: { version: { examFamilyRef: { code: familyCode }, status: { in: ["DRAFT", "ACTIVE"] } } } } },
    select: { id: true, code: true, title: true, unit: { select: { subject: { select: { code: true, version: { select: { academicYear: true, status: true } } } } } } },
    take: 20_000,
  });
  return rows.map((row) => ({ id: row.id, code: row.code, title: row.title, subjectCode: row.unit.subject.code, academicYear: row.unit.subject.version.academicYear, versionStatus: row.unit.subject.version.status }));
}

/** JSON içe aktarma önizlemesi (cevap anahtarı / kazanım): `PREVIEW` audit kaydı açar. */
export async function previewOdkImport(kind: ImportKind, id: string, payload: unknown, actorId: string, db: Db = prisma) {
  const loaded = await loadImportQuestions(db, id);
  if (!loaded) return NextResponse.json({ error: "Deneme bulunamadı." }, { status: 404 });
  const payloadHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  const targetStateHash = importStateHash(kind, loaded.questions);
  const slots = loaded.questions.map(({ sectionCode, questionNumber }) => ({ sectionCode, questionNumber }));
  if (kind === "answer-key") {
    if (!loaded.exam.family) return NextResponse.json({ error: "Katalog tabanlı sınavlarda doğrudan soru düzenleme API'sini kullanın." }, { status: 400 });
    const preview = previewAnswerKeyImport(payload, slots, loaded.exam.family);
    const summary = summarizeAnswerKeyPreview(preview);
    const audit = await db.odkImportAudit.create({
      data: { examId: id, versionId: loaded.version.id, kind: "ANSWER_KEY", schemaVersion: preview.schemaVersion, status: "PREVIEW", payloadHash, rawPayload: payload as object, previewSummary: { ...summary, issues: preview.issues, mappings: preview.mappings, targetStateHash }, errorCount: summary.errors, createdById: actorId },
    });
    return NextResponse.json({ importId: audit.id, summary: { message: `${summary.found} soru bulundu. ${summary.valid} geçerli. ${summary.errors} hata.`, ...summary }, issues: preview.issues });
  }
  const catalog = await familyOutcomeCatalog(db, getOdkExamFamilyCode(loaded.exam));
  const preview = previewOutcomeImport(payload, slots, catalog, { academicYear: loaded.exam.academicYear });
  const errors = preview.issues.filter((issue) => issue.level === "error").length;
  const audit = await db.odkImportAudit.create({
    data: { examId: id, versionId: loaded.version.id, kind: "OUTCOME", schemaVersion: preview.schemaVersion, status: "PREVIEW", payloadHash, rawPayload: payload as object, previewSummary: { ...preview, targetStateHash } as unknown as Prisma.InputJsonValue, errorCount: errors, createdById: actorId },
  });
  return NextResponse.json({
    importId: audit.id,
    summary: {
      message: `${preview.totalMappings} soru eşlemesi. ${preview.catalogHits} katalog eşleşmesi. ${errors} hata. ${preview.unresolvedCodes.length} çözülmemiş kod.`,
      totalMappings: preview.totalMappings,
      catalogHits: preview.catalogHits,
      errors,
      unresolvedCodes: preview.unresolvedCodes,
      ready: errors === 0 && preview.mappings.every((row) => row.outcomes.every((outcome) => outcome.catalogId)),
    },
    issues: preview.issues,
  });
}

class ImportStaleError extends Error {}

/**
 * Önizlenmiş içe aktarmayı uygular; yalnız kilitlenmemiş sürümde.
 * Sürüm ve hedef durum hash'i önizlemedekiyle aynı olmalıdır; `PREVIEW →
 * COMMITTED` geçişi koşulludur (iki eşzamanlı commit'ten biri yazar). Daha önce
 * commit edilmiş import tekrar gönderilirse yazmadan aynı sonucu döner.
 */
export async function commitOdkImport(kind: ImportKind, id: string, importId: string, actorId: string, db: Db = prisma) {
  const loaded = await loadImportQuestions(db, id);
  if (!loaded) return NextResponse.json({ error: "Deneme bulunamadı." }, { status: 404 });
  const audit = await db.odkImportAudit.findFirst({ where: { id: importId, examId: id, kind: kind === "answer-key" ? "ANSWER_KEY" : "OUTCOME" } });
  if (!audit) return NextResponse.json({ error: "Onaylanacak önizleme bulunamadı." }, { status: 404 });
  const summary = audit.previewSummary as { targetStateHash?: string; mappings?: unknown[] };
  if (audit.status === "COMMITTED") return NextResponse.json({ committed: true, idempotent: true, count: summary.mappings?.length ?? 0 });
  if (audit.status !== "PREVIEW") return NextResponse.json({ error: "Bu önizleme artık geçerli değil. Yeniden önizleyin.", code: "IMPORT_STALE" }, { status: 409 });
  if (!["DRAFT", "READY"].includes(loaded.exam.status) || loaded.version.status !== "DRAFT") {
    return NextResponse.json({ error: kind === "answer-key" ? "Cevap anahtarı yalnız taslak/hazır ve kilitlenmemiş sürümde doğrudan yazılabilir. LIVE sonrası revision kullanın." : "Kazanım import yalnız kilitlenmemiş sürümde commit edilebilir." }, { status: 409 });
  }
  if (audit.errorCount > 0) return NextResponse.json({ error: "Hatalı önizleme commit edilemez." }, { status: 400 });
  const staleResponse = () => NextResponse.json({ error: "Önizlemeden sonra deneme değişti. Yeniden önizleyin.", code: "IMPORT_STALE" }, { status: 409 });
  if (audit.versionId !== loaded.version.id || !summary.targetStateHash || summary.targetStateHash !== importStateHash(kind, loaded.questions)) return staleResponse();
  const byKey = new Map(loaded.questions.map((question) => [`${question.sectionCode}:${question.questionNumber}`, question.id]));

  /** Aynı transaction'da: sürüm/hash hâlâ aynı mı, önizleme hâlâ PREVIEW mi (koşullu geçiş). */
  const claim = async (tx: Prisma.TransactionClient) => {
    const fresh = await loadImportQuestions(tx as unknown as Db, id);
    if (!fresh || fresh.version.id !== audit.versionId || fresh.version.status !== "DRAFT" || importStateHash(kind, fresh.questions) !== summary.targetStateHash) throw new ImportStaleError();
    const claimed = await tx.odkImportAudit.updateMany({ where: { id: audit.id, status: "PREVIEW" }, data: { status: "COMMITTED", committedAt: new Date() } });
    if (claimed.count !== 1) throw new ImportStaleError();
  };

  try {
    if (kind === "answer-key") {
      const mappings = (summary as { mappings?: Array<{ sectionCode: string; questionNumber: number; correctOption: OdkAnswerOption }> }).mappings || [];
      if (!mappings.length) return NextResponse.json({ error: "Commit için geçerli eşleme yok." }, { status: 400 });
      await db.$transaction(async (tx) => {
        await claim(tx);
        for (const mapping of mappings) {
          const questionId = byKey.get(`${mapping.sectionCode}:${mapping.questionNumber}`);
          if (!questionId) continue;
          await tx.odkExamQuestion.update({ where: { id: questionId }, data: { correctOption: mapping.correctOption } });
        }
      });
      await transactionalAudit(db)({ actorUserId: actorId, entityType: "OdkExam", entityId: id, action: "odk.answer_key_imported", summary: "Cevap anahtarı JSON import commit edildi", payload: { importId: audit.id, count: mappings.length, payloadHash: audit.payloadHash, targetStateHash: summary.targetStateHash } });
      return NextResponse.json({ committed: true, count: mappings.length });
    }
    const preview = audit.previewSummary as unknown as ReturnType<typeof previewOutcomeImport>;
    if (!preview.mappings?.length) return NextResponse.json({ error: "Commit için geçerli eşleme yok." }, { status: 400 });
    if (preview.mappings.some((row) => row.outcomes.some((outcome) => !outcome.catalogId))) {
      return NextResponse.json({ error: "Katalogda çözülmemiş kazanım kodları var. Önce kazanım kataloğunu tamamlayın." }, { status: 400 });
    }
    // Savunma: önizlemeden sonra kazanım pasifleşmiş ya da başka aileye taşınmış olabilir.
    const catalogIds = [...new Set(preview.mappings.flatMap((row) => row.outcomes.map((outcome) => outcome.catalogId!)))];
    const valid = await db.learningOutcome.count({ where: { id: { in: catalogIds }, isActive: true, unit: { subject: { version: { examFamilyRef: { code: getOdkExamFamilyCode(loaded.exam) }, status: { in: ["DRAFT", "ACTIVE"] } } } } } });
    if (valid !== catalogIds.length) return staleResponse();
    await db.$transaction(async (tx) => {
      await claim(tx);
      for (const mapping of preview.mappings) {
        const questionId = byKey.get(`${mapping.sectionCode}:${mapping.questionNumber}`);
        if (!questionId) continue;
        await tx.odkQuestionOutcome.deleteMany({ where: { questionId } });
        await tx.odkQuestionOutcome.createMany({ data: mapping.outcomes.map((outcome) => ({ questionId, outcomeId: outcome.catalogId!, isPrimary: outcome.isPrimary })) });
      }
    });
    await transactionalAudit(db)({ actorUserId: actorId, entityType: "OdkExam", entityId: id, action: "odk.outcomes_imported", summary: "Kazanım JSON import commit edildi", payload: { importId: audit.id, count: preview.mappings.length, payloadHash: audit.payloadHash, targetStateHash: summary.targetStateHash } });
    return NextResponse.json({ committed: true, count: preview.mappings.length });
  } catch (error) {
    if (error instanceof ImportStaleError) {
      const latest = await db.odkImportAudit.findUnique({ where: { id: audit.id }, select: { status: true } });
      if (latest?.status === "COMMITTED") return NextResponse.json({ committed: true, idempotent: true, count: summary.mappings?.length ?? 0 });
      return staleResponse();
    }
    throw error;
  }
}

/** Taslak sürümün tüm soru listesi: anahtar, zorluk, sayfa, içerik ve kazanımlar (web soru editörü). */
export async function updateOdkExamQuestions(id: string, questions: QuestionsInput, actorId: string, db: Db = prisma) {
  const exam = await db.odkExam.findFirst({ where: { id, status: "DRAFT", currentVersion: { status: "DRAFT" } }, select: { family: true, examFamilyRef: { select: { code: true } }, currentVersion: { select: { id: true, sections: { select: { code: true, questions: { select: { id: true } } } } } } } });
  if (!exam?.currentVersion) return NextResponse.json({ error: "Kilitlenmiş veya bulunamayan sürüm düzenlenemez." }, { status: 409 });
  const familyCode = getOdkExamFamilyCode(exam);
  const expectedIds = exam.currentVersion.sections.flatMap((section) => section.questions.map((question) => question.id));
  const sectionCodeByQuestion = new Map(exam.currentVersion.sections.flatMap((section) => section.questions.map((question) => [question.id, section.code] as const)));
  const submittedIds = questions.map((question) => question.id);
  if (submittedIds.length !== expectedIds.length || new Set(submittedIds).size !== submittedIds.length || submittedIds.some((questionId) => !expectedIds.includes(questionId))) return NextResponse.json({ error: "Soru listesi aktif sürümle eşleşmiyor." }, { status: 400 });
  const requestedOutcomeIds = [...new Set(questions.flatMap((question) => question.outcomeIds))];
  if (requestedOutcomeIds.length) {
    const familyScope = { examFamilyRef: { code: familyCode }, status: { in: ["DRAFT", "ACTIVE"] as Array<"DRAFT" | "ACTIVE"> } };
    const validOutcomes = await db.learningOutcome.findMany({ where: { id: { in: requestedOutcomeIds }, isActive: true, unit: { subject: { version: familyScope } } }, select: { id: true, unit: { select: { subject: { select: { code: true } } } } } });
    if (validOutcomes.length !== requestedOutcomeIds.length) return NextResponse.json({ error: "Kazanımlardan biri sınav türüyle eşleşmiyor veya aktif değil." }, { status: 400 });
    // Kazanım sorunun dersinden olmalı (P0-5): ailede bölüm koduyla aynı kodlu ders varsa yalnız o ders.
    const familySubjectCodes = new Set((await db.curriculumSubject.findMany({ where: { version: familyScope }, select: { code: true }, distinct: ["code"] })).map((row) => row.code));
    const subjectByOutcome = new Map(validOutcomes.map((outcome) => [outcome.id, outcome.unit.subject.code]));
    const mismatch = questions.find((question) => {
      const sectionCode = sectionCodeByQuestion.get(question.id);
      return sectionCode && familySubjectCodes.has(sectionCode) && question.outcomeIds.some((outcomeId) => subjectByOutcome.get(outcomeId) !== sectionCode);
    });
    if (mismatch) return NextResponse.json({ error: "Kazanımlardan biri sorunun dersine ait değil.", code: "OUTCOME_SUBJECT_MISMATCH", questionId: mismatch.id }, { status: 400 });
  }
  await db.$transaction(async (tx) => {
    await tx.odkQuestionOutcome.deleteMany({ where: { questionId: { in: expectedIds } } });
    for (const question of questions) {
      await tx.odkExamQuestion.update({ where: { id: question.id }, data: { correctOption: question.correctOption, difficulty: question.difficulty, bookletPage: question.bookletPage, contentType: question.contentType, contentText: question.contentText, assetUrl: question.assetUrl } });
      if (question.outcomeIds.length) await tx.odkQuestionOutcome.createMany({ data: question.outcomeIds.map((outcomeId) => ({ questionId: question.id, outcomeId, isPrimary: outcomeId === question.primaryOutcomeId })) });
    }
  });
  await transactionalAudit(db)({ actorUserId: actorId, entityType: "OdkExam", entityId: id, action: "odk.questions_updated", summary: "Cevap anahtarı ve soru kazanımları güncellendi", payload: { questionCount: questions.length, outcomeLinkCount: requestedOutcomeIds.length } });
  return NextResponse.json({ ok: true });
}

/**
 * Tek soru düzenlemesi (mobil): güncel taslak listesini okur, yalnız o sorunun
 * anahtar / zorluk / sayfa / kazanım alanlarını değiştirir (içerik alanları
 * korunur) ve web editörüyle AYNI `updateOdkExamQuestions` kurallarından geçer.
 */
export async function updateOdkExamQuestion(id: string, edit: { id: string; correctOption: OdkAnswerOption | null; difficulty: "EASY" | "MEDIUM" | "HARD"; bookletPage: number | null; outcomeIds: string[]; primaryOutcomeId: string | null }, actorId: string, db: Db = prisma) {
  const version = await db.odkExam.findFirst({ where: { id, status: "DRAFT", currentVersion: { status: "DRAFT" } }, select: { currentVersion: { select: { sections: { orderBy: { position: "asc" }, select: { questions: { orderBy: { position: "asc" }, select: { id: true, correctOption: true, difficulty: true, bookletPage: true, contentType: true, contentText: true, assetUrl: true, outcomes: { select: { outcomeId: true, isPrimary: true } } } } } } } } } });
  if (!version?.currentVersion) return NextResponse.json({ error: "Kilitlenmiş veya bulunamayan sürüm düzenlenemez." }, { status: 409 });
  const current = version.currentVersion.sections.flatMap((section) => section.questions);
  if (!current.some((question) => question.id === edit.id)) return NextResponse.json({ error: "Soru bu denemenin aktif sürümünde değil." }, { status: 404 });
  const questions = current.map((question) =>
    question.id === edit.id
      ? { ...edit, contentType: question.contentType, contentText: question.contentText, assetUrl: question.assetUrl }
      : { id: question.id, correctOption: question.correctOption, difficulty: question.difficulty, bookletPage: question.bookletPage, contentType: question.contentType, contentText: question.contentText, assetUrl: question.assetUrl, outcomeIds: question.outcomes.map((outcome) => outcome.outcomeId), primaryOutcomeId: question.outcomes.find((outcome) => outcome.isPrimary)?.outcomeId ?? null },
  );
  return updateOdkExamQuestions(id, questions, actorId, db);
}
