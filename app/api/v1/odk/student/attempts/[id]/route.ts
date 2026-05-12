import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionApi, apiOk, apiErr } from "@/lib/odk/api";

export const dynamic = "force-dynamic";

const ANSWER_OPTIONS = ["A", "B", "C", "D", "E"] as const;

const AnswerSchema = z.object({
  questionNumber: z.number().int().positive(),
  selectedOption: z.enum(ANSWER_OPTIONS).nullable(), // null = sil/boşalt
});

const PatchSchema = z.object({
  answers: z.array(AnswerSchema).min(1).max(500),
});

/**
 * GET /api/v1/odk/student/attempts/[id]
 * Attempt + exam context + mevcut işaretli cevaplar.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: attemptId } = await ctx.params;
  const auth = await requireSessionApi();
  if (!auth.ok) return auth.response;

  const attempt = await prisma.odkExamAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      userId: true,
      status: true,
      startedAt: true,
      submittedAt: true,
      cheatViolationCount: true,
      autoSubmitted: true,
      score: true,
      correctCount: true,
      wrongCount: true,
      blankCount: true,
      sectionScores: true,
      exam: {
        select: {
          id: true,
          title: true,
          slug: true,
          durationMinutes: true,
          settings: true,
          cadenceFamily: true,
          classLevel: true,
          sections: {
            orderBy: { orderIndex: "asc" },
            select: { id: true, title: true, questionCount: true, orderIndex: true },
          },
          files: {
            where: { fileType: "BOOKLET_PDF" },
            select: { publicUrl: true, originalFileName: true },
            take: 1,
          },
        },
      },
      opticalAnswers: {
        select: { sectionId: true, questionNumber: true, selectedOption: true },
      },
    },
  });
  if (!attempt) return apiErr("Çözüm bulunamadı.", 404);
  if (attempt.userId !== auth.userId && auth.role !== "ADMIN") {
    return apiErr("Bu çözüme erişiminiz yok.", 403);
  }

  const bookletUrl = attempt.exam.files[0]?.publicUrl ?? null;
  return apiOk({
    attempt: {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      cheatViolationCount: attempt.cheatViolationCount,
      autoSubmitted: attempt.autoSubmitted,
      score: attempt.score ? Number(attempt.score) : null,
      correctCount: attempt.correctCount,
      wrongCount: attempt.wrongCount,
      blankCount: attempt.blankCount,
      sectionScores: attempt.sectionScores,
    },
    exam: {
      id: attempt.exam.id,
      title: attempt.exam.title,
      durationMinutes: attempt.exam.durationMinutes,
      settings: attempt.exam.settings,
      family: attempt.exam.cadenceFamily,
      classLevel: attempt.exam.classLevel,
      sections: attempt.exam.sections,
      bookletUrl,
    },
    answers: attempt.opticalAnswers,
  });
}

/**
 * PATCH /api/v1/odk/student/attempts/[id]
 * Autosave: bir veya daha fazla soru için işaretli şıkkı kaydeder.
 * selectedOption=null => kayıt silinir. Soru numarası bölüm sınırlarına göre
 * doğru bölüme yazılır.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: attemptId } = await ctx.params;
  const auth = await requireSessionApi();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try { body = await req.json(); } catch { return apiErr("Geçersiz JSON.", 400); }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return apiErr("Geçersiz istek.", 422, parsed.error.flatten());

  const attempt = await prisma.odkExamAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true, userId: true, status: true,
      exam: {
        select: {
          sections: {
            orderBy: { orderIndex: "asc" },
            select: { id: true, questionCount: true },
          },
        },
      },
    },
  });
  if (!attempt) return apiErr("Çözüm bulunamadı.", 404);
  if (attempt.userId !== auth.userId) return apiErr("Bu çözüme erişiminiz yok.", 403);
  if (attempt.status !== "IN_PROGRESS") return apiErr("Çözüm artık aktif değil.", 409);

  // Soru numarasından bölüm bulma
  const sectionRanges: Array<{ id: string; from: number; to: number }> = [];
  let cursor = 1;
  for (const s of attempt.exam.sections) {
    sectionRanges.push({ id: s.id, from: cursor, to: cursor + s.questionCount - 1 });
    cursor += s.questionCount;
  }
  const totalSlots = cursor - 1;

  type Op = { sectionId: string; questionNumber: number; selectedOption: string | null };
  const ops: Op[] = [];
  for (const a of parsed.data.answers) {
    if (a.questionNumber < 1 || a.questionNumber > totalSlots) {
      return apiErr(`Soru numarası geçersiz: ${a.questionNumber}`, 422);
    }
    const sec = sectionRanges.find((r) => a.questionNumber >= r.from && a.questionNumber <= r.to);
    if (!sec) return apiErr(`Bölüm bulunamadı: ${a.questionNumber}`, 422);
    ops.push({
      sectionId: sec.id,
      questionNumber: a.questionNumber,
      selectedOption: a.selectedOption,
    });
  }

  await prisma.$transaction(async (tx) => {
    for (const op of ops) {
      if (op.selectedOption === null) {
        await tx.odkAttemptOpticalAnswer.deleteMany({
          where: {
            attemptId,
            sectionId: op.sectionId,
            questionNumber: op.questionNumber,
          },
        });
      } else {
        await tx.odkAttemptOpticalAnswer.upsert({
          where: {
            attemptId_sectionId_questionNumber: {
              attemptId,
              sectionId: op.sectionId,
              questionNumber: op.questionNumber,
            },
          },
          update: { selectedOption: op.selectedOption, answeredAt: new Date() },
          create: {
            attemptId,
            sectionId: op.sectionId,
            questionNumber: op.questionNumber,
            selectedOption: op.selectedOption,
          },
        });
      }
    }
    await tx.odkExamAttempt.update({
      where: { id: attemptId },
      data: { lastEventAt: new Date() },
    });
  });

  return apiOk({ saved: ops.length });
}
