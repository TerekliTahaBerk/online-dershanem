import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, apiOk, apiErr } from "@/lib/odk/api";
import { validateAnswerKey } from "@/lib/odk/validate";

export const dynamic = "force-dynamic";

/**
 * Cevap anahtarı JSON ingestion.
 * Body: { answerKey: AnswerKeyItem[] }
 *
 * Davranış:
 *   - Validate (zod + duplicate + gap warnings).
 *   - Section'lara questionNumber sırasıyla mapping (sırayla doldurulur).
 *   - Mevcut OdkExamOfficialAnswer'lar truncate edilir, yenileri create edilir.
 *   - Bölümlerin questionCount toplamı = answer key uzunluğu olmalı.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  let body: { answerKey?: unknown };
  try { body = await req.json(); } catch { return apiErr("Geçersiz JSON.", 400); }

  const validation = validateAnswerKey(body.answerKey);
  if (!validation.ok || !validation.data) {
    return apiErr("Cevap anahtarı geçersiz.", 422, validation.issues);
  }

  const exam = await prisma.odkExam.findUnique({
    where: { id },
    include: {
      sections: { orderBy: { orderIndex: "asc" } },
    },
  });
  if (!exam) return apiErr("Deneme bulunamadı.", 404);
  if (exam.status === "ARCHIVED") {
    return apiErr("Arşivlenmiş denemeye cevap anahtarı yüklenemez.", 409);
  }

  if (exam.sections.length === 0) {
    return apiErr("Önce deneme bölümlerini tanımlayın.", 422);
  }
  const totalSlots = exam.sections.reduce((a, s) => a + s.questionCount, 0);
  if (totalSlots !== validation.data.length) {
    return apiErr(
      `Bölüm soru toplamı (${totalSlots}) ile cevap anahtarı uzunluğu (${validation.data.length}) eşleşmiyor.`,
      422,
    );
  }

  // Mevcut answer key kazanım alanlarını korumak için: önceki kazanım
  // alanlarını (lesson/topic vb.) questionNumber bazlı backup et.
  const previous = await prisma.odkExamOfficialAnswer.findMany({
    where: { examId: id },
    select: {
      questionNumber: true, lesson: true, unit: true, topic: true,
      learningOutcomeCode: true, learningOutcome: true, difficulty: true, outcomes: true,
    },
  });
  const prevByQ = new Map(previous.map((p) => [p.questionNumber, p]));

  // questionNumber → sectionId mapping (1..n sırasıyla bölümlere doldur)
  const sortedSections = exam.sections;
  const qToSection = new Map<number, string>();
  let cursor = 0;
  for (const sec of sortedSections) {
    for (let i = 0; i < sec.questionCount; i++) {
      cursor++;
      qToSection.set(cursor, sec.id);
    }
  }

  await prisma.$transaction([
    prisma.odkExamOfficialAnswer.deleteMany({ where: { examId: id } }),
    prisma.odkExamOfficialAnswer.createMany({
      data: validation.data.map((item) => {
        const prev = prevByQ.get(item.questionNumber);
        return {
          examId: id,
          sectionId: qToSection.get(item.questionNumber)!,
          questionNumber: item.questionNumber,
          correctOption: item.correctAnswer,
          // İlgili JSON'da gelen alanlar varsa onları, yoksa önceki backup'ı kullan
          lesson: item.subject ?? prev?.lesson ?? null,
          topic: item.topic ?? prev?.topic ?? null,
          learningOutcome: item.learningOutcome ?? prev?.learningOutcome ?? null,
          unit: prev?.unit ?? null,
          learningOutcomeCode: prev?.learningOutcomeCode ?? null,
          difficulty: prev?.difficulty ?? null,
          outcomes: prev?.outcomes ?? undefined,
        };
      }),
    }),
  ]);

  return apiOk({
    inserted: validation.data.length,
    warnings: validation.issues.filter((i) => i.level === "warning"),
  });
}
