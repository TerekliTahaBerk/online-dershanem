import "server-only";

import { prisma } from "@/lib/prisma";
import { istanbulDayStart } from "@/lib/istanbul-time";

export type TeacherLifecycleSummary = {
  teacher: {
    id: string;
    name: string;
    email: string;
    status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
    subjects: string[];
    isCoach: boolean;
    coachCapacity: number | null;
  };
  groups: Array<{ id: string; name: string; subject: string; studentCount: number }>;
  students: Array<{ id: string; name: string; groupName: string }>;
  upcomingLessons: Array<{ id: string; title: string; startsAt: string; groupName: string }>;
  pendingLessonClosures: Array<{ id: string; title: string; startsAt: string; groupName: string }>;
  activeResponsibilities: {
    coachAssignments: number;
    openInterventions: number;
    openHelpRequests: number;
  };
  counts: {
    activeGroups: number;
    activeStudents: number;
    upcomingLessons: number;
    pendingLessonClosures: number;
  };
};

export async function getTeacherLifecycleSummary(
  teacherUserId: string,
  now: Date = new Date(),
): Promise<TeacherLifecycleSummary | null> {
  const teacher = await prisma.user.findFirst({
    where: { id: teacherUserId, role: "TEACHER" },
    select: {
      id: true,
      email: true,
      fullName: true,
      status: true,
      teacherProfile: {
        select: { id: true, subjects: true, isCoach: true, coachCapacity: true },
      },
      taughtGroups: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          subject: true,
          enrollments: {
            where: { endedAt: null },
            select: {
              student: {
                select: {
                  id: true,
                  user: { select: { fullName: true, email: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!teacher || !teacher.teacherProfile) return null;

  const dayStart = istanbulDayStart(now);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [upcomingLessons, pendingLessonClosures, openInterventions, openHelpRequests, coachAssignments] =
    await Promise.all([
      prisma.lesson.findMany({
        where: {
          teacherId: teacherUserId,
          status: "PLANNED",
          startsAt: { gte: dayStart },
        },
        orderBy: { startsAt: "asc" },
        take: 8,
        select: {
          id: true,
          title: true,
          startsAt: true,
          group: { select: { name: true } },
        },
      }),
      prisma.lesson.findMany({
        where: {
          teacherId: teacherUserId,
          startsAt: { lt: now, gte: twoWeeksAgo },
          status: { in: ["PLANNED", "COMPLETED"] },
          notes: { none: { studentId: null } },
        },
        orderBy: { startsAt: "desc" },
        take: 8,
        select: {
          id: true,
          title: true,
          startsAt: true,
          group: { select: { name: true } },
        },
      }),
      prisma.interventionCase.count({
        where: {
          ownerId: teacherUserId,
          status: { in: ["OPEN", "IN_PROGRESS", "SNOOZED"] },
        },
      }),
      prisma.studentHelpRequest.count({
        where: {
          status: "OPEN",
          group: { teacherId: teacherUserId, isActive: true },
        },
      }),
      teacher.teacherProfile.isCoach
        ? prisma.coachAssignment.count({
            where: { coachId: teacher.teacherProfile.id, endedAt: null },
          })
        : Promise.resolve(0),
    ]);

  const students = teacher.taughtGroups.flatMap((group) =>
    group.enrollments.map((enrollment) => ({
      id: enrollment.student.id,
      name: enrollment.student.user.fullName || enrollment.student.user.email,
      groupName: group.name,
    })),
  );
  const uniqueStudents = new Map(students.map((student) => [student.id, student]));

  return {
    teacher: {
      id: teacher.id,
      name: teacher.fullName || teacher.email,
      email: teacher.email,
      status: teacher.status,
      subjects: teacher.teacherProfile.subjects,
      isCoach: teacher.teacherProfile.isCoach,
      coachCapacity: teacher.teacherProfile.coachCapacity,
    },
    groups: teacher.taughtGroups.map((group) => ({
      id: group.id,
      name: group.name,
      subject: group.subject,
      studentCount: group.enrollments.length,
    })),
    students: [...uniqueStudents.values()],
    upcomingLessons: upcomingLessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      startsAt: lesson.startsAt.toISOString(),
      groupName: lesson.group.name,
    })),
    pendingLessonClosures: pendingLessonClosures.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      startsAt: lesson.startsAt.toISOString(),
      groupName: lesson.group.name,
    })),
    activeResponsibilities: {
      coachAssignments,
      openInterventions,
      openHelpRequests,
    },
    counts: {
      activeGroups: teacher.taughtGroups.length,
      activeStudents: uniqueStudents.size,
      upcomingLessons: upcomingLessons.length,
      pendingLessonClosures: pendingLessonClosures.length,
    },
  };
}
