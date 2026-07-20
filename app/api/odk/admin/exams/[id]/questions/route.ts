import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { updateQuestionsSchema } from "@/lib/odk/admin-schemas";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.exam.questions.update", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:questions:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = updateQuestionsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Soru alanlarını kontrol edin." }, { status: 400 });
  const { id } = await context.params;
  const exam = await prisma.odkExam.findFirst({ where: { id, status: "DRAFT", currentVersion: { status: "DRAFT" } }, select: { family: true, currentVersion: { select: { id: true, sections: { select: { questions: { select: { id: true } } } } } } } });
  if (!exam?.currentVersion) return NextResponse.json({ error: "Kilitlenmiş veya bulunamayan sürüm düzenlenemez." }, { status: 409 });
  const expectedIds = exam.currentVersion.sections.flatMap((section) => section.questions.map((question) => question.id));
  const submittedIds = parsed.data.questions.map((question) => question.id);
  if (submittedIds.length !== expectedIds.length || new Set(submittedIds).size !== submittedIds.length || submittedIds.some((questionId) => !expectedIds.includes(questionId))) return NextResponse.json({ error: "Soru listesi aktif sürümle eşleşmiyor." }, { status: 400 });
  const requestedOutcomeIds = [...new Set(parsed.data.questions.flatMap((question) => question.outcomeIds))];
  if (requestedOutcomeIds.length) {
    const validOutcomes = await prisma.learningOutcome.findMany({ where: { id: { in: requestedOutcomeIds }, isActive: true, unit: { subject: { version: { exam: exam.family, status: "ACTIVE" } } } }, select: { id: true } });
    if (validOutcomes.length !== requestedOutcomeIds.length) return NextResponse.json({ error: "Kazanımlardan biri sınav türüyle eşleşmiyor veya aktif değil." }, { status: 400 });
  }
  await prisma.$transaction(async (tx) => {
    await tx.odkQuestionOutcome.deleteMany({ where: { questionId: { in: expectedIds } } });
    for (const question of parsed.data.questions) {
      await tx.odkExamQuestion.update({ where: { id: question.id }, data: { correctOption: question.correctOption, difficulty: question.difficulty, bookletPage: question.bookletPage } });
      if (question.outcomeIds.length) await tx.odkQuestionOutcome.createMany({ data: question.outcomeIds.map((outcomeId) => ({ questionId: question.id, outcomeId, isPrimary: outcomeId === question.primaryOutcomeId })) });
    }
  });
  await logAudit({ actorUserId: auth.session.userId, entityType: "OdkExam", entityId: id, action: "odk.questions_updated", summary: "Cevap anahtarı ve soru kazanımları güncellendi", payload: { questionCount: parsed.data.questions.length, outcomeLinkCount: requestedOutcomeIds.length } });
  return NextResponse.json({ ok: true });
}
