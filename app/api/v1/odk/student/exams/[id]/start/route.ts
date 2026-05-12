import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOdkApiAccess, canStudentAccessExam } from "@/lib/access/odk";
import { apiOk, apiErr } from "@/lib/odk/api";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/odk/student/exams/[id]/start
 * Yeni bir attempt yaratır (veya mevcut IN_PROGRESS olanı döner).
 */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: examId } = await ctx.params;
  const auth = await ensureOdkApiAccess();
  if (!auth.ok) return apiErr(auth.message, auth.status);

  const can = await canStudentAccessExam(auth.userId, auth.role, examId);
  if (!can) return apiErr("Bu denemeye erişiminiz yok.", 403);

  const exam = await prisma.odkExam.findUnique({
    where: { id: examId },
    select: { id: true, status: true, durationMinutes: true },
  });
  if (!exam) return apiErr("Deneme bulunamadı.", 404);
  if (exam.status !== "PUBLISHED" && auth.role !== "ADMIN") {
    return apiErr("Bu deneme henüz yayında değil.", 403);
  }

  // Mevcut IN_PROGRESS attempt varsa onu döner (idempotent başlatma).
  const existing = await prisma.odkExamAttempt.findFirst({
    where: { userId: auth.userId, examId, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
    select: { id: true, startedAt: true },
  });
  if (existing) {
    return apiOk({ attemptId: existing.id, resumed: true, startedAt: existing.startedAt });
  }

  const created = await prisma.odkExamAttempt.create({
    data: {
      userId: auth.userId,
      examId,
      status: "IN_PROGRESS",
    },
    select: { id: true, startedAt: true },
  });

  return apiOk({ attemptId: created.id, resumed: false, startedAt: created.startedAt });
}
