import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, apiOk, apiErr } from "@/lib/odk/api";
import { validateLearningOutcomes } from "@/lib/odk/validate";

export const dynamic = "force-dynamic";

/**
 * Soru / Kazanım JSON ingestion. Cevap anahtarı yüklenmiş olmalı.
 * Body: { outcomes: LearningOutcomeItem[] }
 *
 * Davranış:
 *   - Validate (zod + duplicate)
 *   - Cevap anahtarı questionNumber kümesi ile birebir eşleşmeli (cross check)
 *   - Mevcut OdkExamOfficialAnswer satırları update edilir
 *     (lesson, unit, topic, learningOutcomeCode, learningOutcome, difficulty
 *      + outcomes JSON snapshot).
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  let body: { outcomes?: unknown };
  try { body = await req.json(); } catch { return apiErr("Geçersiz JSON.", 400); }

  const validation = validateLearningOutcomes(body.outcomes);
  if (!validation.ok || !validation.data) {
    return apiErr("Kazanım JSON'u geçersiz.", 422, validation.issues);
  }

  const exam = await prisma.odkExam.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!exam) return apiErr("Deneme bulunamadı.", 404);
  if (exam.status === "ARCHIVED") {
    return apiErr("Arşivlenmiş denemeye kazanım yüklenemez.", 409);
  }

  const existing = await prisma.odkExamOfficialAnswer.findMany({
    where: { examId: id },
    select: { id: true, questionNumber: true },
  });
  if (existing.length === 0) {
    return apiErr("Önce cevap anahtarını yükleyin.", 422);
  }

  const existingByQ = new Map(existing.map((e) => [e.questionNumber, e.id]));
  const missing: number[] = [];
  for (const item of validation.data) {
    if (!existingByQ.has(item.questionNumber)) missing.push(item.questionNumber);
  }
  if (missing.length > 0) {
    return apiErr(
      `Cevap anahtarında olmayan ${missing.length} soru için kazanım gönderildi: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? "…" : ""}`,
      422,
    );
  }
  // Reverse check: cevap anahtarındaki her soru için kazanım var mı?
  const incomingSet = new Set(validation.data.map((d) => d.questionNumber));
  const missingOutcomes: number[] = [];
  for (const e of existing) {
    if (!incomingSet.has(e.questionNumber)) missingOutcomes.push(e.questionNumber);
  }
  if (missingOutcomes.length > 0) {
    return apiErr(
      `Cevap anahtarındaki ${missingOutcomes.length} soru için kazanım eksik: ${missingOutcomes.slice(0, 10).join(", ")}${missingOutcomes.length > 10 ? "…" : ""}`,
      422,
    );
  }

  await prisma.$transaction(
    validation.data.map((item) => {
      const targetId = existingByQ.get(item.questionNumber)!;
      return prisma.odkExamOfficialAnswer.update({
        where: { id: targetId },
        data: {
          lesson: item.lesson,
          unit: item.unit ?? null,
          topic: item.topic ?? null,
          learningOutcomeCode: item.learningOutcomeCode,
          learningOutcome: item.learningOutcome,
          difficulty: item.difficulty ?? null,
          outcomes: {
            lesson: item.lesson,
            unit: item.unit ?? null,
            topic: item.topic ?? null,
            learningOutcomeCode: item.learningOutcomeCode,
            learningOutcome: item.learningOutcome,
            difficulty: item.difficulty ?? null,
            examType: item.examType,
          },
        },
      });
    }),
  );

  return apiOk({ updated: validation.data.length });
}
