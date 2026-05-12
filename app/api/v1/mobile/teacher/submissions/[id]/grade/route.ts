import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, requireMobileUser } from "@/lib/mobile-auth";
import { notifyUser } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  score: z.number().int().min(0).max(1000).optional(),
  feedback: z.string().max(5000).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "TEACHER" && auth.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "Yetkisiz.");
  }

  const teacher = await prisma.teacher.findFirst({
    where: { userId: auth.userId },
    select: { id: true },
  });
  if (!teacher) return jsonError(404, "TEACHER_NOT_FOUND", "Öğretmen kaydı yok.");

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "BAD_REQUEST", "Geçersiz gövde.");

  const { id } = await params;
  const sub = await prisma.assignmentSubmission.findUnique({
    where: { id },
    include: {
      assignment: { select: { teacherId: true, title: true } },
      student: { select: { userId: true } },
    },
  });
  if (!sub) return jsonError(404, "NOT_FOUND", "Teslim bulunamadı.");
  if (sub.assignment.teacherId !== teacher.id && auth.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "Bu ödev senin değil.");
  }

  const updated = await prisma.assignmentSubmission.update({
    where: { id },
    data: {
      score: parsed.data.score ?? null,
      feedback: parsed.data.feedback ?? null,
      gradedAt: new Date(),
      status: "GRADED",
    },
  });

  if (sub.student.userId) {
    await notifyUser({
      userId: sub.student.userId,
      title: "Ödevin değerlendirildi",
      body: `"${sub.assignment.title}" için puan hazır.`,
      href: "/panel/ogrenci/odevler",
      type: "PERFORMANCE",
    }).catch(() => undefined);
  }

  return NextResponse.json({
    data: {
      id: updated.id,
      score: updated.score,
      status: updated.status,
      gradedAt: updated.gradedAt?.toISOString() ?? null,
    },
  });
}
