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
  if (auth.role !== "TEACHER" && auth.role !== "ADMIN") {
    return jsonError(403, "FORBIDDEN", "Yetkisiz.");
  }

  const teacher = await prisma.teacher.findFirst({
    where: { userId: auth.userId },
    select: { id: true },
  });
  if (!teacher) return jsonError(404, "TEACHER_NOT_FOUND", "Öğretmen kaydı yok.");

  const { id } = await params;
  // Yetki kontrolü
  const link = await prisma.classroomTeacher.findUnique({
    where: { classroomId_teacherId: { classroomId: id, teacherId: teacher.id } },
  });
  if (!link && auth.role !== "ADMIN") return jsonError(403, "FORBIDDEN", "Bu sınıfa erişim yok.");

  const classroom = await prisma.classroom.findUnique({
    where: { id },
    include: {
      students: {
        where: { leftAt: null },
        include: {
          student: {
            select: {
              id: true, fullName: true, classLevel: true,
              user: { select: { email: true } },
            },
          },
        },
      },
    },
  });
  if (!classroom) return jsonError(404, "NOT_FOUND", "Sınıf bulunamadı.");

  return NextResponse.json({
    data: {
      id: classroom.id,
      name: classroom.name,
      branch: classroom.branch,
      level: classroom.level,
      capacity: classroom.capacity,
      students: classroom.students.map((s) => ({
        id: s.student.id,
        fullName: s.student.fullName,
        gradeLevel: s.student.classLevel,
        email: s.student.user?.email ?? null,
        joinedAt: s.joinedAt.toISOString(),
      })),
    },
  });
}
