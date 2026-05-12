import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, requireMobileUser } from "@/lib/mobile-auth";
import { notifyUser } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  content: z.string().max(20_000).optional(),
  attachmentUrl: z.string().url().max(2048).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  const student = await prisma.student.findFirst({
    where: { userId: auth.userId },
    select: { id: true, fullName: true },
  });
  if (!student) return jsonError(404, "STUDENT_NOT_FOUND", "Öğrenci kaydı yok.");

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError(400, "BAD_REQUEST", "Geçersiz gövde.");
  if (!parsed.data.content && !parsed.data.attachmentUrl) {
    return jsonError(400, "EMPTY", "İçerik veya ek zorunlu.");
  }

  const { id: assignmentId } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true, title: true, dueAt: true, teacherId: true,
      teacher: { select: { userId: true } },
    },
  });
  if (!assignment) return jsonError(404, "NOT_FOUND", "Ödev bulunamadı.");

  const now = new Date();
  const isLate = assignment.dueAt ? now > assignment.dueAt : false;

  const sub = await prisma.assignmentSubmission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId: student.id } },
    create: {
      assignmentId,
      studentId: student.id,
      content: parsed.data.content,
      attachmentUrl: parsed.data.attachmentUrl,
      submittedAt: now,
      status: isLate ? "LATE" : "SUBMITTED",
    },
    update: {
      content: parsed.data.content,
      attachmentUrl: parsed.data.attachmentUrl,
      submittedAt: now,
      status: isLate ? "LATE" : "SUBMITTED",
    },
  });

  if (assignment.teacher.userId) {
    await notifyUser({
      userId: assignment.teacher.userId,
      title: "Yeni ödev teslimi",
      body: `${student.fullName} → "${assignment.title}"`,
      href: "/panel/ogretmen/odevler",
      type: "CONTENT",
    }).catch(() => undefined);
  }

  await prisma.appActivityLog
    .create({ data: { userId: auth.userId, action: "assignment_submit", payload: { assignmentId } } })
    .catch(() => undefined);

  return NextResponse.json({
    data: {
      id: sub.id,
      status: sub.status,
      submittedAt: sub.submittedAt?.toISOString() ?? null,
    },
  });
}
