import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  const student = await prisma.student.findFirst({
    where: { userId: auth.userId },
    select: { id: true },
  });
  if (!student) return jsonError(404, "STUDENT_NOT_FOUND", "Öğrenci kaydı bulunamadı.");

  const { id } = await params;
  const existing = await prisma.studentDailyTask.findFirst({
    where: { id, studentId: student.id },
  });
  if (!existing) return jsonError(404, "NOT_FOUND", "Görev bulunamadı.");

  const updated = await prisma.studentDailyTask.update({
    where: { id },
    data: {
      isDone: !existing.isDone,
      doneAt: !existing.isDone ? new Date() : null,
    },
  });

  // Streak için telemetri.
  if (!existing.isDone) {
    await prisma.appActivityLog
      .create({
        data: { userId: auth.userId, action: "task_done", payload: { taskId: id } },
      })
      .catch(() => undefined);
  }

  return NextResponse.json({
    data: {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      sourceType: updated.sourceType,
      sourceId: updated.sourceId,
      dueAt: updated.dueAt?.toISOString() ?? null,
      isDone: updated.isDone,
      doneAt: updated.doneAt?.toISOString() ?? null,
    },
  });
}
