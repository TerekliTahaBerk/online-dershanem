import "server-only";
import type { Prisma } from "@prisma/client";
export function teacherHelpScope(userId: string): Prisma.StudentHelpRequestWhereInput {
  return { checkIn: { shareWithTeacher: true }, OR: [
    { groupId: { not: null }, group: { teacherId: userId, isActive: true }, student: { enrollments: { some: { endedAt: null, group: { teacherId: userId, isActive: true } } } } },
    { groupId: null, coachAssignment: { endedAt: null, coach: { userId }, student: { user: { status: "ACTIVE" } } } },
  ] };
}
