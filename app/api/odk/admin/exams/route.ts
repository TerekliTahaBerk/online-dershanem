import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { createExamSchema } from "@/lib/odk/admin-schemas";

export async function POST(request: Request) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.exam.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:exam-create:${auth.session.userId}`, rateLimit: { max: 30, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = createExamSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Deneme bilgilerini kontrol edin." }, { status: 400 });
  const input = parsed.data;
  if (await prisma.odkExam.findUnique({ where: { slug: input.slug }, select: { id: true } })) return NextResponse.json({ error: "Bu deneme adresi kullanımda." }, { status: 409 });
  if (input.seriesId) {
    const series = await prisma.odkExamSeries.findFirst({ where: { id: input.seriesId, family: input.family, isActive: true }, select: { id: true } });
    if (!series) return NextResponse.json({ error: "Seçilen seri sınav türüyle eşleşmiyor." }, { status: 400 });
  }
  const policyCode = input.family === "LGS" ? "LGS_MATH_V1" : "YKS_MATH_V1";
  const policy = await prisma.odkScoringPolicy.findUnique({ where: { code: policyCode }, select: { id: true } });
  if (!policy) return NextResponse.json({ error: "Puanlama politikası kurulmamış. Migration’ı kontrol edin." }, { status: 503 });

  const exam = await prisma.$transaction(async (tx) => {
    const created = await tx.odkExam.create({ data: { title: input.title, slug: input.slug, family: input.family, seriesId: input.seriesId || null, createdById: auth.session.userId } });
    const version = await tx.odkExamVersion.create({ data: { examId: created.id, versionNumber: 1, durationMinutes: input.durationMinutes, scoringPolicyId: policy.id, createdById: auth.session.userId } });
    const section = await tx.odkExamSection.create({ data: { versionId: version.id, code: "MAT", title: `${input.family} Matematik`, position: 0, questionCount: input.questionCount } });
    await tx.odkExamQuestion.createMany({ data: Array.from({ length: input.questionCount }, (_, index) => ({ sectionId: section.id, questionNumber: index + 1, position: index })) });
    return tx.odkExam.update({ where: { id: created.id }, data: { currentVersionId: version.id } });
  });
  await logAudit({ actorUserId: auth.session.userId, entityType: "OdkExam", entityId: exam.id, action: "odk.exam_created", summary: `${exam.family} matematik denemesi taslağı oluşturuldu`, payload: { questionCount: input.questionCount, version: 1 } });
  return NextResponse.json({ exam: { id: exam.id } }, { status: 201 });
}
