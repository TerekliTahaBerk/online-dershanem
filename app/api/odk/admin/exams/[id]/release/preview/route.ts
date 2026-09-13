import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { releasePreviewSchema } from "@/lib/odk/admin-schemas";
import { previewResultPublication } from "@/lib/odk/result-publication";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const parsed = releasePreviewSchema.safeParse(await request.json().catch(() => ({})));
  const exam = await prisma.odkExam.findUnique({
    where: { id },
    select: {
      status: true,
      attempts: {
        where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED", "REVIEW_REQUIRED"] } },
        select: {
          id: true,
          integrityLevel: true,
          status: true,
          student: { select: { fullName: true } },
          score: { select: { attemptId: true } },
        },
      },
    },
  });
  if (!exam) return NextResponse.json({ error: "Deneme bulunamadı." }, { status: 404 });
  if (exam.status !== "SCORED") return NextResponse.json({ error: "Yalnız puanlanmış deneme için yayın önizlemesi alınabilir." }, { status: 409 });

  const preview = previewResultPublication(
    exam.attempts.map((attempt) => ({
      attemptId: attempt.id,
      studentLabel: attempt.student.fullName || "Öğrenci",
      hasScore: Boolean(attempt.score),
      scoringError: !attempt.score,
      integrityLevel: attempt.integrityLevel,
      reviewRequired: attempt.status === "REVIEW_REQUIRED" || attempt.integrityLevel !== "NORMAL",
    })),
    { excludeReviewRequired: parsed.success ? parsed.data.excludeReviewRequired : false },
  );

  return NextResponse.json({
    message: `${preview.publishable} öğrencinin sonucu yayınlanacak.`,
    ...preview,
  });
}
