import "server-only";
import { prisma } from "@/lib/prisma";
import { mockExamViewInclude } from "@/lib/mock-exam-view";

export async function loadTeacherMockExams(teacherId: string) {
  const students = await prisma.studentProfile.findMany({
    where: {
      user: { status: "ACTIVE" },
      enrollments: {
        some: {
          endedAt: null,
          group: { teacherId: teacherId, isActive: true },
        },
      },
    },
    orderBy: { user: { fullName: "asc" } },
    include: { user: { select: { fullName: true, email: true } } },
  });
  const exams = await prisma.mockExam.findMany({
    where: { studentId: { in: students.map((student) => student.id) } },
    orderBy: { takenAt: "desc" },
    take: 80,
    include: mockExamViewInclude,
  });
  return { students, exams };
}
