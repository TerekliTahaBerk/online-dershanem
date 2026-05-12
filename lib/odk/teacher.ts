import { prisma } from "@/lib/prisma";
import { requireOdkPanel } from "@/lib/access/odk-panel";

/**
 * Öğretmenin bağlı olduğu sınıflardaki aktif (henüz ayrılmamış) öğrencileri döndürür.
 * Aktif = ClassroomStudent.leftAt = null.
 */
export async function requireTeacherWithScope() {
  const ctx = await requireOdkPanel("ogretmen");
  const teacher = await prisma.teacher.findFirst({
    where: { userId: ctx.userId },
    select: { id: true },
  });
  if (!teacher) {
    return { ctx, teacherId: null as string | null, classroomIds: [] as string[], studentIds: [] as string[], userIds: [] as string[] };
  }

  const classroomLinks = await prisma.classroomTeacher.findMany({
    where: { teacherId: teacher.id },
    select: { classroomId: true },
  });
  const classroomIds = classroomLinks.map((c) => c.classroomId);

  if (classroomIds.length === 0) {
    return { ctx, teacherId: teacher.id, classroomIds, studentIds: [], userIds: [] };
  }

  const studentLinks = await prisma.classroomStudent.findMany({
    where: { classroomId: { in: classroomIds }, leftAt: null },
    select: { studentId: true },
  });
  const studentIds = Array.from(new Set(studentLinks.map((s) => s.studentId)));

  const students = studentIds.length === 0
    ? []
    : await prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: { userId: true },
      });
  const userIds = Array.from(new Set(students.map((s) => s.userId).filter((u): u is string => Boolean(u))));

  return { ctx, teacherId: teacher.id, classroomIds, studentIds, userIds };
}

/**
 * Bir attemptId'nin öğretmenin scope'unda olup olmadığını döndürür.
 */
export async function teacherCanAccessAttempt(attemptId: string, teacherUserIds: string[]): Promise<boolean> {
  if (teacherUserIds.length === 0) return false;
  const a = await prisma.odkExamAttempt.findUnique({
    where: { id: attemptId },
    select: { userId: true },
  });
  return Boolean(a && teacherUserIds.includes(a.userId));
}
