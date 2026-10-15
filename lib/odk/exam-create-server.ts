import "server-only";
import { NextResponse } from "next/server";
import { type PrismaClient } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { educationTransactionClient, transactionalAudit } from "@/lib/panel/education-write";
import { createExamSchema, createSeriesSchema } from "./admin-schemas";
import { buildTemplateSnapshot, resolveTemplateForCreate, withSectionRanges } from "./exam-templates";
import { DEFAULT_EXAM_SETTINGS } from "./exam-domain";
import { asLegacyOdkExamFamily } from "./exam-family";

export async function createOdkExam(input: z.output<typeof createExamSchema>, actorId: string, client: PrismaClient = prisma) {
  return client.$transaction(async (tx) => {
    const db = educationTransactionClient(tx);
    const familyCode = input.examFamilyCode ?? input.family!;
    const examFamily = await db.examFamily.findFirst({ where: { code: familyCode, isActive: true, product: { isActive: true } } });
    if (!examFamily?.isActive) return NextResponse.json({ error: "Seçilen sınav ailesi aktif değil." }, { status: 400 });
    const legacyFamily = asLegacyOdkExamFamily(familyCode);
    if (await db.odkExam.findUnique({ where: { slug: input.slug }, select: { id: true } })) return NextResponse.json({ error: "Bu deneme adresi kullanımda." }, { status: 409 });
    if (input.seriesId) {
      const series = await db.odkExamSeries.findFirst({ where: { id: input.seriesId, examFamilyRefId: examFamily.id, isActive: true }, select: { id: true } });
      if (!series) return NextResponse.json({ error: "Seçilen seri sınav türüyle eşleşmiyor." }, { status: 400 });
    }

    let template = null;
    if (legacyFamily) {
      try {
        template = resolveTemplateForCreate({ family: legacyFamily, structureMode: input.structureMode, templateCode: input.templateCode, academicYear: input.academicYear || new Date().getFullYear() });
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Şablon çözümlenemedi." }, { status: 400 });
      }
    } else if (input.structureMode !== "FULL_TEMPLATE") {
      return NextResponse.json({ error: "Katalog tabanlı sınav aileleri çok bölümlü yapı kullanmalıdır." }, { status: 400 });
    }

    const registrySubjects = template ? [] : await db.curriculumSubject.findMany({
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
    const templateSnapshot = template ? buildTemplateSnapshot(template, Object.fromEntries(sections.map((section) => [section.code, section.questionCount]))) : null;
    const durationMinutes = input.durationMinutes || template?.durationMinutes || 60;
    const scoringPolicyCode = template?.scoringPolicyCode ?? "ODK_GENERIC_FOUR_WRONG_V1";
    const policy = await db.odkScoringPolicy.findUnique({ where: { code: scoringPolicyCode }, select: { id: true } });
    if (!policy) return NextResponse.json({ error: "Puanlama politikası kurulmamış. Migration’ı kontrol edin." }, { status: 503 });

    const exam = await db.$transaction(async (tx) => {
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
          createdById: actorId,
        },
      });
      const version = await tx.odkExamVersion.create({
        data: {
          examId: created.id,
          versionNumber: 1,
          durationMinutes,
          scoringPolicyId: policy.id,
          createdById: actorId,
          // Oturumlu şablon (LGS tam deneme) sürüm ayarlarına oturum planını taşır; şablon
          // anlık görüntüsü (sürüm, mod, alt test aralıkları, alanlar) tarihsel kararlılık için yazılır.
          settings: {
            ...DEFAULT_EXAM_SETTINGS,
            ...(template?.sessions ? { sessions: template.sessions } : {}),
            ...(templateSnapshot ? { template: templateSnapshot } : {}),
          },
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
    await transactionalAudit(db)({
      actorUserId: actorId,
      entityType: "OdkExam",
      entityId: exam.id,
      action: "odk.exam_created",
      summary: `${familyCode} denemesi taslağı oluşturuldu (${template?.code ?? "CUSTOM"})`,
      payload: { questionCount: totalQuestions, version: 1, templateCode: template?.code ?? null, templateVersion: template?.templateVersion ?? null, templateMode: template?.mode ?? null, structureMode: template?.structureMode ?? "FULL_TEMPLATE" },
    });
    return NextResponse.json({ exam: { id: exam.id, templateCode: template?.code ?? null } }, { status: 201 });
  }, { isolationLevel: "Serializable", timeout: 30000 });
}

export async function createOdkSeries(input: z.output<typeof createSeriesSchema>, actorId: string, client: PrismaClient = prisma) {
  return client.$transaction(async (tx) => {
    const db = educationTransactionClient(tx);
    if (await db.odkExamSeries.findUnique({ where: { slug: input.slug }, select: { id: true } })) return NextResponse.json({ error: "Bu seri adresi kullanımda." }, { status: 409 });
    const familyCode = input.examFamilyCode ?? input.family!;
    const examFamily = await db.examFamily.findFirst({ where: { code: familyCode, isActive: true, product: { isActive: true } } });
    if (!examFamily?.isActive) return NextResponse.json({ error: "Seçilen sınav ailesi aktif değil." }, { status: 400 });
    const family = asLegacyOdkExamFamily(familyCode);
    const series = await db.odkExamSeries.create({
      data: {
        title: input.title,
        slug: input.slug,
        family,
        examFamilyRefId: examFamily.id,
        academicYear: input.academicYear,
        classLevel: input.classLevel || null,
        createdById: actorId,
      },
    });
    await transactionalAudit(db)({ actorUserId: actorId, entityType: "OdkExamSeries", entityId: series.id, action: "odk.series_created", summary: `${familyCode} serisi oluşturuldu` });
    return NextResponse.json({ series: { id: series.id, title: series.title, familyCode } }, { status: 201 });
  }, { isolationLevel: "Serializable", timeout: 30000 });
}
