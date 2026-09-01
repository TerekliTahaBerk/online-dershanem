import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { jsonImportCommitSchema, jsonImportPreviewSchema } from "@/lib/odk/admin-schemas";
import { previewOutcomeImport } from "@/lib/odk/outcome-import";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.outcome.import_preview", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:out-preview:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const { id } = await context.params;
  const parsed = jsonImportPreviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "JSON gövdesi gerekli." }, { status: 400 });

  const exam = await prisma.odkExam.findUnique({
    where: { id },
    include: {
      currentVersion: {
        include: {
          sections: { orderBy: { position: "asc" }, include: { questions: { where: { isActive: true }, orderBy: { position: "asc" }, select: { id: true, questionNumber: true } } } },
        },
      },
    },
  });
  if (!exam?.currentVersion) return NextResponse.json({ error: "Deneme bulunamadı." }, { status: 404 });
  const questions = exam.currentVersion.sections.flatMap((section) => section.questions.map((question) => ({ id: question.id, sectionCode: section.code, questionNumber: question.questionNumber })));
  const catalog = await prisma.learningOutcome.findMany({ where: { isActive: true }, select: { id: true, code: true, title: true }, take: 5000 });
  const preview = previewOutcomeImport(parsed.data.payload, questions.map(({ sectionCode, questionNumber }) => ({ sectionCode, questionNumber })), catalog);
  const errors = preview.issues.filter((issue) => issue.level === "error").length;
  const payloadHash = createHash("sha256").update(JSON.stringify(parsed.data.payload)).digest("hex");
  const audit = await prisma.odkImportAudit.create({
    data: {
      examId: id,
      versionId: exam.currentVersion.id,
      kind: "OUTCOME",
      schemaVersion: preview.schemaVersion,
      status: "PREVIEW",
      payloadHash,
      rawPayload: parsed.data.payload as object,
      previewSummary: preview,
      errorCount: errors,
      createdById: auth.session.userId,
    },
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

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.outcome.import_commit", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:out-commit:${auth.session.userId}`, rateLimit: { max: 20, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const { id } = await context.params;
  const parsed = jsonImportCommitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "importId gerekli." }, { status: 400 });

  const exam = await prisma.odkExam.findUnique({
    where: { id },
    include: {
      currentVersion: {
        include: {
          sections: { orderBy: { position: "asc" }, include: { questions: { where: { isActive: true }, orderBy: { position: "asc" }, select: { id: true, questionNumber: true } } } },
        },
      },
    },
  });
  if (!exam?.currentVersion) return NextResponse.json({ error: "Deneme bulunamadı." }, { status: 404 });
  if (!["DRAFT", "READY"].includes(exam.status) || exam.currentVersion.status !== "DRAFT") {
    return NextResponse.json({ error: "Kazanım import yalnız kilitlenmemiş sürümde commit edilebilir." }, { status: 409 });
  }
  const audit = await prisma.odkImportAudit.findFirst({ where: { id: parsed.data.importId, examId: id, kind: "OUTCOME", status: "PREVIEW" } });
  if (!audit) return NextResponse.json({ error: "Onaylanacak önizleme bulunamadı." }, { status: 404 });
  if (audit.errorCount > 0) return NextResponse.json({ error: "Hatalı önizleme commit edilemez." }, { status: 400 });

  const preview = audit.previewSummary as Awaited<ReturnType<typeof previewOutcomeImport>>;
  if (!preview.mappings?.length) return NextResponse.json({ error: "Commit için geçerli eşleme yok." }, { status: 400 });
  if (preview.mappings.some((row) => row.outcomes.some((outcome) => !outcome.catalogId))) {
    return NextResponse.json({ error: "Katalogda çözülmemiş kazanım kodları var. Önce kazanım kataloğunu tamamlayın." }, { status: 400 });
  }

  const byKey = new Map(
    exam.currentVersion.sections.flatMap((section) =>
      section.questions.map((question) => [`${section.code}:${question.questionNumber}`, question.id]),
    ),
  );

  await prisma.$transaction(async (tx) => {
    for (const mapping of preview.mappings) {
      const questionId = byKey.get(`${mapping.sectionCode}:${mapping.questionNumber}`);
      if (!questionId) continue;
      await tx.odkQuestionOutcome.deleteMany({ where: { questionId } });
      await tx.odkQuestionOutcome.createMany({
        data: mapping.outcomes.map((outcome) => ({
          questionId,
          outcomeId: outcome.catalogId!,
          isPrimary: outcome.isPrimary,
        })),
      });
    }
    await tx.odkImportAudit.update({ where: { id: audit.id }, data: { status: "COMMITTED", committedAt: new Date() } });
  });

  await logAudit({ actorUserId: auth.session.userId, entityType: "OdkExam", entityId: id, action: "odk.outcomes_imported", summary: "Kazanım JSON import commit edildi", payload: { importId: audit.id, count: preview.mappings.length } });
  return NextResponse.json({ committed: true, count: preview.mappings.length });
}
