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

  const tasks = await prisma.studentDailyTask.findMany({
    where: { studentId: student.id },
    orderBy: [{ isDone: "asc" }, { dueAt: "asc" }],
    take: 50,
  });

  return NextResponse.json({
    data: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      sourceType: t.sourceType,
      sourceId: t.sourceId,
      dueAt: t.dueAt?.toISOString() ?? null,
      isDone: t.isDone,
      doneAt: t.doneAt?.toISOString() ?? null,
    })),
  });
}
