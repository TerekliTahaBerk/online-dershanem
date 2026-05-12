import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  const student = await prisma.student.findFirst({
    where: { userId: auth.userId },
    select: { id: true },
  });
  if (!student) return jsonError(404, "STUDENT_NOT_FOUND", "Öğrenci kaydı bulunamadı.");

  const results = await prisma.studentExamResult.findMany({
    where: { studentId: student.id },
    orderBy: { takenAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    data: results.map((r) => ({
      id: r.id,
      title: r.title,
      examType: r.examType,
      takenAt: r.takenAt.toISOString(),
      net: r.net != null ? Number(r.net) : null,
      correct: r.correctCount,
      wrong: r.wrongCount,
      blank: r.blankCount,
      ranking: r.ranking,
    })),
  });
}
