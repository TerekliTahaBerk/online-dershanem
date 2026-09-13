import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { OdkAnswerOption } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { jsonImportCommitSchema, jsonImportPreviewSchema } from "@/lib/odk/admin-schemas";
import { previewAnswerKeyImport, summarizeAnswerKeyPreview } from "@/lib/odk/answer-key-import";
import { isCriticalFieldLocked } from "@/lib/odk/exam-domain";

async function loadExamQuestions(examId: string) {
  const exam = await prisma.odkExam.findUnique({
    where: { id: examId },
    include: {
      currentVersion: {
        include: {
          sections: { orderBy: { position: "asc" }, include: { questions: { where: { isActive: true }, orderBy: { position: "asc" }, select: { id: true, questionNumber: true } } } },
        },
      },
    },
  });
  if (!exam?.currentVersion) return null;
  const questions = exam.currentVersion.sections.flatMap((section) =>
    section.questions.map((question) => ({ id: question.id, sectionCode: section.code, questionNumber: question.questionNumber })),
  );
  return { exam, version: exam.currentVersion, questions };
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.answer_key.import_preview", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:ak-preview:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const { id } = await context.params;
  const parsed = jsonImportPreviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "JSON gövdesi gerekli." }, { status: 400 });
  const loaded = await loadExamQuestions(id);
  if (!loaded) return NextResponse.json({ error: "Deneme bulunamadı." }, { status: 404 });
  if (isCriticalFieldLocked(loaded.exam.status) && loaded.exam.status !== "DRAFT" && loaded.exam.status !== "READY") {
    // LIVE sonrası preview serbest; commit ayrı gate
  }
  const preview = previewAnswerKeyImport(parsed.data.payload, loaded.questions.map(({ sectionCode, questionNumber }) => ({ sectionCode, questionNumber })), loaded.exam.family);
  const summary = summarizeAnswerKeyPreview(preview);
  const payloadHash = createHash("sha256").update(JSON.stringify(parsed.data.payload)).digest("hex");
  const audit = await prisma.odkImportAudit.create({
    data: {
      examId: id,
      versionId: loaded.version.id,
      kind: "ANSWER_KEY",
      schemaVersion: preview.schemaVersion,
      status: "PREVIEW",
      payloadHash,
      rawPayload: parsed.data.payload as object,
      previewSummary: { ...summary, issues: preview.issues, mappings: preview.mappings },
      errorCount: summary.errors,
      createdById: auth.session.userId,
    },
  });
  return NextResponse.json({
    importId: audit.id,
    summary: {
      message: `${summary.found} soru bulundu. ${summary.valid} geçerli. ${summary.errors} hata.`,
      ...summary,
    },
    issues: preview.issues,
  });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.answer_key.import_commit", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:ak-commit:${auth.session.userId}`, rateLimit: { max: 20, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const { id } = await context.params;
  const parsed = jsonImportCommitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "importId gerekli." }, { status: 400 });
  const loaded = await loadExamQuestions(id);
  if (!loaded) return NextResponse.json({ error: "Deneme bulunamadı." }, { status: 404 });
  if (!["DRAFT", "READY"].includes(loaded.exam.status) || loaded.version.status !== "DRAFT") {
    return NextResponse.json({ error: "Cevap anahtarı yalnız taslak/hazır ve kilitlenmemiş sürümde doğrudan yazılabilir. LIVE sonrası revision kullanın." }, { status: 409 });
  }
  const audit = await prisma.odkImportAudit.findFirst({ where: { id: parsed.data.importId, examId: id, kind: "ANSWER_KEY", status: "PREVIEW" } });
  if (!audit) return NextResponse.json({ error: "Onaylanacak önizleme bulunamadı." }, { status: 404 });
  if (audit.errorCount > 0) return NextResponse.json({ error: "Hatalı önizleme commit edilemez." }, { status: 400 });

  const summary = audit.previewSummary as { mappings?: Array<{ sectionCode: string; questionNumber: number; correctOption: OdkAnswerOption }> };
  const mappings = summary.mappings || [];
  if (!mappings.length) return NextResponse.json({ error: "Commit için geçerli eşleme yok." }, { status: 400 });

  const byKey = new Map(loaded.questions.map((question) => [`${question.sectionCode}:${question.questionNumber}`, question.id]));
  await prisma.$transaction(async (tx) => {
    for (const mapping of mappings) {
      const questionId = byKey.get(`${mapping.sectionCode}:${mapping.questionNumber}`);
      if (!questionId) continue;
      await tx.odkExamQuestion.update({ where: { id: questionId }, data: { correctOption: mapping.correctOption } });
    }
    await tx.odkImportAudit.update({ where: { id: audit.id }, data: { status: "COMMITTED", committedAt: new Date() } });
  });
  await logAudit({ actorUserId: auth.session.userId, entityType: "OdkExam", entityId: id, action: "odk.answer_key_imported", summary: "Cevap anahtarı JSON import commit edildi", payload: { importId: audit.id, count: mappings.length } });
  return NextResponse.json({ committed: true, count: mappings.length });
}
