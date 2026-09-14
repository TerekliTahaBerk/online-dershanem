import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { createExamSchema } from "@/lib/odk/admin-schemas";
import { resolveTemplateForCreate, withSectionRanges } from "@/lib/odk/exam-templates";
import { DEFAULT_EXAM_SETTINGS } from "@/lib/odk/exam-domain";
import { asLegacyOdkExamFamily } from "@/lib/odk/exam-family";
import { getExamFamilyByCode } from "@/lib/products/registry";

export async function POST(request: Request) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.exam.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:exam-create:${auth.session.userId}`, rateLimit: { max: 30, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = createExamSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Deneme bilgilerini kontrol edin." }, { status: 400 });
  const input = parsed.data;
  const familyCode = input.examFamilyCode ?? input.family!;
  const examFamily = await getExamFamilyByCode(familyCode).catch(() => null);
  if (!examFamily?.isActive) return NextResponse.json({ error: "Seçilen sınav ailesi aktif değil." }, { status: 400 });
  const legacyFamily = asLegacyOdkExamFamily(familyCode);
  if (await prisma.odkExam.findUnique({ where: { slug: input.slug }, select: { id: true } })) return NextResponse.json({ error: "Bu deneme adresi kullanımda." }, { status: 409 });
  if (input.seriesId) {
    const series = await prisma.odkExamSeries.findFirst({ where: { id: input.seriesId, examFamilyRefId: examFamily.id, isActive: true }, select: { id: true } });
    if (!series) return NextResponse.json({ error: "Seçilen seri sınav türüyle eşleşmiyor." }, { status: 400 });
  }

  let template = null;
  if (legacyFamily) {
    try {
      template = resolveTemplateForCreate({ family: legacyFamily, structureMode: input.structureMode, templateCode: input.templateCode });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Şablon çözümlenemedi." }, { status: 400 });
    }
  } else if (input.structureMode !== "FULL_TEMPLATE") {
    return NextResponse.json({ error: "Katalog tabanlı sınav aileleri çok bölümlü yapı kullanmalıdır." }, { status: 400 });
  }

  const registrySubjects = template ? [] : await prisma.curriculumSubject.findMany({
    where: { version: { examFamilyRefId: examFamily.id, status: { in: ["DRAFT", "ACTIVE"] } } },
    orderBy: [{ version: { academicYear: "desc" } }, { position: "asc" }],
    distinct: ["code"],
    take: 3,
    select: { code: true, name: true },
  });
  if (!template && registrySubjects.length < 2) return NextResponse.json({ error: "Bu sınav ailesi için en az iki müfredat bölümü bulunmalıdır." }, { status: 400 });
  // Geriye uyumluluk: MATH_ONLY + questionCount override
  const sections = template
    ? withSectionRanges(template).map((section) => {
        if (template.structureMode === "MATH_ONLY" && input.questionCount && section.code === "MAT") {
          return { ...section, questionCount: input.questionCount, questionEnd: input.questionCount };
        }
        return section;
      })
    : registrySubjects.map((subject, position) => ({ code: subject.code, title: subject.name, position, questionCount: 2, questionStart: position * 2 + 1, questionEnd: position * 2 + 2 }));
  const durationMinutes = input.durationMinutes || template?.durationMinutes || 60;
  const scoringPolicyCode = template?.scoringPolicyCode ?? "ODK_GENERIC_FOUR_WRONG_V1";
  const policy = await prisma.odkScoringPolicy.findUnique({ where: { code: scoringPolicyCode }, select: { id: true } });
  if (!policy) return NextResponse.json({ error: "Puanlama politikası kurulmamış. Migration’ı kontrol edin." }, { status: 503 });

  const exam = await prisma.$transaction(async (tx) => {
    const created = await tx.odkExam.create({
      data: {
        title: input.title,
        slug: input.slug,
        family: legacyFamily,
        examFamilyRefId: examFamily.id,
        seriesId: input.seriesId || null,
        structureMode: template?.structureMode ?? "FULL_TEMPLATE",
        templateCode: template?.code ?? null,
        description: input.description || null,
        internalCode: input.internalCode || null,
        academicYear: input.academicYear || null,
        publisher: input.publisher || null,
        settings: DEFAULT_EXAM_SETTINGS,
        createdById: auth.session.userId,
      },
    });
    const version = await tx.odkExamVersion.create({
      data: {
        examId: created.id,
        versionNumber: 1,
        durationMinutes,
        scoringPolicyId: policy.id,
        createdById: auth.session.userId,
        settings: DEFAULT_EXAM_SETTINGS,
        autoSubmit: true,
      },
    });
    for (const section of sections) {
      const createdSection = await tx.odkExamSection.create({
        data: {
          versionId: version.id,
          code: section.code,
          title: section.title,
          position: section.position,
          questionCount: section.questionCount,
          questionStart: section.questionStart,
          questionEnd: section.questionEnd,
          durationMinutes: "durationMinutes" in section && typeof section.durationMinutes === "number" ? section.durationMinutes : null,
        },
      });
      await tx.odkExamQuestion.createMany({
        data: Array.from({ length: section.questionCount }, (_, index) => ({
          sectionId: createdSection.id,
          questionNumber: index + 1,
          position: index,
          bookletCode: "A",
          bookletQuestionNumber: index + 1,
          canonicalQuestionNumber: section.questionStart + index,
          contentType: template ? "BOOKLET_PDF" : "RICH_CONTENT",
          contentText: template ? null : "Test Sorusu — içerik ekibi tarafından değiştirilecek",
        })),
      });
    }
    return tx.odkExam.update({ where: { id: created.id }, data: { currentVersionId: version.id } });
  });

  const totalQuestions = sections.reduce((sum, section) => sum + section.questionCount, 0);
  await logAudit({
    actorUserId: auth.session.userId,
    entityType: "OdkExam",
    entityId: exam.id,
    action: "odk.exam_created",
    summary: `${familyCode} denemesi taslağı oluşturuldu (${template?.code ?? "CUSTOM"})`,
    payload: { questionCount: totalQuestions, version: 1, templateCode: template?.code ?? null, structureMode: template?.structureMode ?? "FULL_TEMPLATE" },
  });
  return NextResponse.json({ exam: { id: exam.id, templateCode: template?.code ?? null } }, { status: 201 });
}
