import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, requireMobileUser } from "@/lib/mobile-auth";
import { notifyUser } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(5000).optional(),
  subject: z.string().max(100).optional(),
  classroomId: z.string().optional(),
  studentId: z.string().optional(),
  dueAt: z.string().optional(), // ISO
  maxScore: z.number().int().min(1).max(1000).optional(),
  attachmentUrl: z.string().url().max(2048).optional(),
});

export async function GET(req: Request) {
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

  const items = await prisma.assignment.findMany({
    where: { teacherId: teacher.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      classroom: { select: { id: true, name: true } },
      student: { select: { id: true, fullName: true } },
      _count: { select: { submissions: true } },
    },
  });

  return NextResponse.json({
    data: items.map((a) => ({
      id: a.id,
      title: a.title,
      subject: a.subject,
      dueAt: a.dueAt?.toISOString() ?? null,
      maxScore: a.maxScore,
      status: a.status,
      classroom: a.classroom,
      student: a.student,
      submissionCount: a._count.submissions,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
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
  if (!parsed.data.classroomId && !parsed.data.studentId) {
    return jsonError(400, "BAD_REQUEST", "classroomId veya studentId zorunlu.");
  }

  const assignment = await prisma.assignment.create({
    data: {
      teacherId: teacher.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      subject: parsed.data.subject ?? null,
      classroomId: parsed.data.classroomId ?? null,
      studentId: parsed.data.studentId ?? null,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      maxScore: parsed.data.maxScore ?? null,
      attachmentUrl: parsed.data.attachmentUrl ?? null,
    },
  });

  // Hedef öğrenciler — submission satırlarını da hazırla
  const targetStudentIds = parsed.data.studentId
    ? [parsed.data.studentId]
    : (await prisma.classroomStudent.findMany({
        where: { classroomId: parsed.data.classroomId!, leftAt: null },
        select: { studentId: true },
      })).map((s) => s.studentId);

  if (targetStudentIds.length > 0) {
    await prisma.assignmentSubmission.createMany({
      data: targetStudentIds.map((sid) => ({
        assignmentId: assignment.id,
        studentId: sid,
        status: "PENDING" as const,
      })),
      skipDuplicates: true,
    });

    // Bildirim fan-out
    const students = await prisma.student.findMany({
      where: { id: { in: targetStudentIds }, userId: { not: null } },
      select: { userId: true },
    });
    await Promise.all(
      students.map((s) =>
        s.userId
          ? notifyUser({
              userId: s.userId,
              title: "Yeni ödev",
              body: assignment.title,
              href: "/panel/ogrenci/odevler",
              type: "CONTENT",
            }).catch(() => undefined)
          : Promise.resolve(),
      ),
    );
  }

  return NextResponse.json({ data: { id: assignment.id } });
}
