import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  const student = await prisma.student.findFirst({
    where: { userId: auth.userId },
    select: { id: true },
  });
  if (!student) return jsonError(404, "STUDENT_NOT_FOUND", "Öğrenci kaydı yok.");

  const { id } = await params;
  const result = await prisma.studentExamResult.findFirst({
    where: { id, studentId: student.id },
    include: { subjectStats: { include: { topicStats: true } } },
  });
  if (!result) return jsonError(404, "NOT_FOUND", "Sonuç bulunamadı.");

  return NextResponse.json({
    data: {
      id: result.id,
      title: result.title,
      examType: result.examType,
      takenAt: result.takenAt.toISOString(),
      net: result.net != null ? Number(result.net) : null,
      correct: result.correctCount,
      wrong: result.wrongCount,
      blank: result.blankCount,
      ranking: result.ranking,
      subjects: result.subjectStats.map((s) => ({
        id: s.id,
        name: s.subject,
        correct: s.correctCount,
        wrong: s.wrongCount,
        blank: s.blankCount,
        net: s.net != null ? Number(s.net) : null,
        topics: s.topicStats.map((t) => ({
          id: t.id,
          name: t.topic,
          correct: t.correctCount,
          wrong: t.wrongCount,
          blank: t.blankCount,
        })),
      })),
    },
  });
}
