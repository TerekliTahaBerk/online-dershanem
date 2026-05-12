import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const links = await prisma.classroomTeacher.findMany({
    where: { teacherId: teacher.id },
    include: {
      classroom: {
        select: {
          id: true, name: true, branch: true, level: true,
          _count: { select: { students: { where: { leftAt: null } } } },
        },
      },
    },
  });

  return NextResponse.json({
    data: links.map((l) => ({
      id: l.classroom.id,
      name: l.classroom.name,
      branch: l.classroom.branch,
      level: l.classroom.level,
      isLead: l.isLead,
      subject: l.subject,
      studentCount: l.classroom._count.students,
    })),
  });
}
