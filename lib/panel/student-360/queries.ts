/** Student 360 için Prisma veri erişimini tek bir sunucu katmanında toplar. */
import "server-only";

import { notFound } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PanelFeatureFlags } from "@/lib/panel-feature-flags";
import { findCoachAssignmentForCoach, getStudentCoaching } from "@/lib/panel/coaching";
import { getStudentGoals } from "@/lib/panel/goals";
import { listStudentExams } from "@/lib/odk/student-exam-server";
import { canViewStudent360Commerce, type Student360Tab } from "@/lib/panel/student-360";
import type { Student360Access, Student360AccessMode } from "./dto";
import { asViewerRole, deriveStudent360QueryRequirements } from "./policy";

/**
 * Yatay erişim: admin her öğrenci; öğretmen yalnız kendi grubu veya koç ataması.
 * Veli / öğrenci → 404.
 */
export async function resolveStudent360Access(
  viewer: { userId: string; role: UserRole },
  studentProfileId: string,
): Promise<Student360Access> {
  const viewerRole = asViewerRole(viewer.role);
  if (!viewerRole) notFound();

  const profile = await prisma.studentProfile.findUnique({
    where: { id: studentProfileId },
    select: {
      id: true,
      userId: true,
      enrollments: {
        where: { endedAt: null, group: { isActive: true } },
        select: {
          groupId: true,
          group: {
            select: {
              id: true,
              name: true,
              subject: true,
              teacherId: true,
            },
          },
        },
      },
    },
  });
  if (!profile) notFound();

  if (viewerRole === "ADMIN") {
    return {
      role: "ADMIN",
      mode: "admin",
      studentProfileId: profile.id,
      studentUserId: profile.userId,
      canViewCommerce: canViewStudent360Commerce("ADMIN"),
      hasCoachAccess: true,
      groupIds: profile.enrollments.map((row) => row.groupId),
      subjects: null,
      viewerUserId: viewer.userId,
    };
  }

  const teacherGroups = profile.enrollments.filter((row) => row.group.teacherId === viewer.userId);
  const coachAssignment = await findCoachAssignmentForCoach(viewer.userId, profile.id);
  const directLink = await prisma.studentTeacherAssignment.findFirst({
    where: {
      studentId: profile.id,
      teacherId: viewer.userId,
      active: true,
      endedAt: null,
    },
    select: { id: true, subject: true },
  });

  if (!teacherGroups.length && !coachAssignment && !directLink) notFound();

  const mode: Student360AccessMode = teacherGroups.length
    ? "teacher_group"
    : directLink
      ? "teacher_direct"
      : "coach";
  const scopedGroups = teacherGroups.length ? teacherGroups : profile.enrollments;
  const directSubjects = directLink ? [directLink.subject] : [];

  return {
    role: "TEACHER",
    mode,
    studentProfileId: profile.id,
    studentUserId: profile.userId,
    canViewCommerce: false,
    hasCoachAccess: Boolean(coachAssignment),
    groupIds: scopedGroups.map((row) => row.groupId),
    subjects: teacherGroups.length
      ? [...new Set(teacherGroups.map((row) => row.group.subject))]
      : directSubjects.length
        ? directSubjects
        : null,
    viewerUserId: viewer.userId,
  };
}

export async function loadStudent360QueryData(input: {
  access: Student360Access;
  flags: PanelFeatureFlags;
  tab: Student360Tab;
  now: Date;
  weekStart: Date;
  since14d: Date;
}) {
  const { access, flags, tab, now, weekStart, since14d } = input;
  const student = await prisma.studentProfile.findUnique({
    where: { id: access.studentProfileId },
    select: {
      id: true,
      classLevel: true,
      targetGoal: true,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          lastLoginAt: true,
          productMemberships: {
            where: { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            select: { product: true, expiresAt: true },
            orderBy: { product: "asc" },
          },
          odOrders: access.canViewCommerce
            ? {
                orderBy: { createdAt: "desc" },
                take: 8,
                select: {
                  id: true,
                  packageName: true,
                  status: true,
                  provisioningStatus: true,
                  provisioningError: true,
                  createdAt: true,
                  totalCents: true,
                },
              }
            : false,
        },
      },
      parents: {
        include: {
          parent: { select: { id: true, fullName: true, email: true } },
        },
      },
      enrollments: {
        where: { endedAt: null },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              subject: true,
              teacher: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
      },
      coachAssignments: {
        where: { endedAt: null },
        take: 1,
        select: {
          cadenceDays: true,
          coach: { select: { id: true, user: { select: { fullName: true, email: true } } } },
        },
      },
    },
  });
  if (!student) notFound();

  // Legacy ürünler (OD/OK/ODK); registry-only üyelikler (KPSS) bu ekranda henüz etiketlenmez.
  const products = student.user.productMemberships.flatMap((row) => (row.product ? [row.product] : []));
  const orders = access.canViewCommerce ? (student.user.odOrders ?? []) : [];
  const blockedOrders = orders.filter(
    (order) => order.status === "PAID" && order.provisioningStatus !== "SUCCEEDED",
  );
  const currentCoach = student.coachAssignments[0] ?? null;
  const groupIds =
    access.mode === "admin"
      ? student.enrollments.map((row) => row.group.id)
      : access.groupIds;

  const lessonScope = groupIds.length ? { groupId: { in: groupIds } } : { id: "__none__" };
  const assignmentScope = groupIds.length ? { groupId: { in: groupIds } } : { id: "__none__" };

  const {
    needsOverview,
    needsAcademic,
    needsLessons,
    needsAssignmentsTab,
    needsTeachersTab,
    needsCoaching,
    needsExams,
    needsRisk,
    needsParent,
    needsCommerce,
    needsAdminForms,
    needsExamSignals,
    needsAssignmentList,
  } = deriveStudent360QueryRequirements({ access, tab, flags });

  const lessonNoteWhere =
    access.mode === "teacher_group"
      ? { studentId: student.id, lesson: { teacherId: access.viewerUserId } }
      : { studentId: student.id };

  const [
    attendances14d,
    weekAttendances,
    overdueProgress,
    assignmentProgress,
    upcomingLessons,
    pastLessons,
    plan,
    reviewDueCount,
    helpOpenCount,
    interventionCases,
    mockExams,
    odkExams,
    coaching,
    goalViews,
    checkIns,
    digests,
    outcomeHints,
    recoveryOpenCount,
    coachOptions,
    parentOptions,
    teacherLinksRaw,
    teacherOptionsRaw,
  ] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        studentId: student.id,
        lesson: {
          ...lessonScope,
          status: "COMPLETED",
          startsAt: { gte: since14d, lte: now },
        },
      },
      select: { status: true },
    }),
    prisma.attendance.findMany({
      where: {
        studentId: student.id,
        lesson: {
          ...lessonScope,
          startsAt: { gte: weekStart, lte: now },
        },
      },
      select: { status: true },
    }),
    prisma.assignmentProgress.count({
      where: {
        studentId: student.id,
        status: { not: "DONE" },
        assignment: {
          ...assignmentScope,
          dueAt: { lt: now },
          isActive: true,
        },
      },
    }),
    needsAssignmentList
      ? prisma.assignmentProgress.findMany({
          where: {
            studentId: student.id,
            assignment: assignmentScope,
          },
          orderBy: { updatedAt: "desc" },
          take: 12,
          select: {
            id: true,
            status: true,
            assignment: {
              select: {
                id: true,
                title: true,
                dueAt: true,
                group: { select: { name: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    prisma.lesson.findMany({
      where: { ...lessonScope, status: "PLANNED", startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: needsLessons ? 8 : 3,
      select: {
        id: true,
        title: true,
        startsAt: true,
        group: { select: { name: true } },
      },
    }),
    needsLessons
      ? prisma.lesson.findMany({
          where: {
            ...lessonScope,
            status: "COMPLETED",
            startsAt: { lte: now },
          },
          orderBy: { startsAt: "desc" },
          take: 10,
          select: {
            id: true,
            title: true,
            startsAt: true,
            attendances: {
              where: { studentId: student.id },
              select: { status: true },
              take: 1,
            },
            notes: {
              where: lessonNoteWhere,
              select: { note: true, topic: true },
              take: 1,
              orderBy: { updatedAt: "desc" },
            },
          },
        })
      : Promise.resolve([]),
    flags.adaptivePlan
      ? prisma.weeklyPlan.findFirst({
          where: { studentId: student.id, weekStart },
          select: {
            weekStart: true,
            status: true,
            changeRequestCategory: true,
            tasks: {
              orderBy: [{ scheduledFor: "asc" }, { position: "asc" }],
              select: {
                id: true,
                title: true,
                status: true,
                scheduledFor: true,
              },
            },
          },
        })
      : Promise.resolve(null),
    flags.reviewQueue
      ? prisma.reviewItem.count({
          where: {
            studentId: student.id,
            status: "ACTIVE",
            dueAt: { lte: now },
          },
        })
      : Promise.resolve(0),
    flags.studentCheckIn
      ? prisma.studentHelpRequest.count({
          where: {
            studentId: student.id,
            status: "OPEN",
            ...(access.mode === "teacher_group" && groupIds.length
              ? { groupId: { in: groupIds } }
              : {}),
          },
        })
      : Promise.resolve(0),
    flags.interventionInbox
      ? prisma.interventionCase.findMany({
          where: {
            studentId: student.id,
            status: { in: ["OPEN", "IN_PROGRESS", "SNOOZED"] },
          },
          orderBy: { dueAt: "asc" },
          take: 12,
          select: {
            id: true,
            reasonCode: true,
            explanation: true,
            suggestedAction: true,
            status: true,
            dueAt: true,
            createdAt: true,
            owner: { select: { fullName: true, email: true } },
          },
        })
      : Promise.resolve([]),
    needsExamSignals && flags.mockExamAnalysis
      ? prisma.mockExam.findMany({
          where: { studentId: student.id },
          orderBy: { takenAt: "desc" },
          take: 6,
          select: {
            id: true,
            exam: true,
            takenAt: true,
            sections: {
              where: access.subjects ? { subjectName: { in: access.subjects } } : undefined,
              select: {
                subjectName: true,
                correctCount: true,
                incorrectCount: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    products.includes("ODK") && needsOverview
      ? listStudentExams(student.user.id)
      : Promise.resolve([]),
    needsCoaching || needsOverview ? getStudentCoaching(student.id) : Promise.resolve(null),
    needsCoaching ? getStudentGoals(student.id) : Promise.resolve([]),
    needsCoaching && flags.studentCheckIn
      ? prisma.studentCheckIn.findMany({
          where: {
            studentId: student.id,
            ...(access.role === "TEACHER"
              ? {
                  OR: [
                    { shareWithTeacher: true },
                    ...(groupIds.length ? [{ groupId: { in: groupIds } }] : []),
                  ],
                }
              : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true,
            createdAt: true,
            energy: true,
            barrier: true,
            shareWithTeacher: true,
          },
        })
      : Promise.resolve([]),
    needsParent && flags.parentWeeklyDigest
      ? prisma.weeklyDigest.findMany({
          where: {
            studentId: student.id,
            ...(access.role === "TEACHER" ? { status: "PUBLISHED" } : {}),
          },
          orderBy: { weekStart: "desc" },
          take: 6,
          select: {
            id: true,
            weekStart: true,
            status: true,
            publishedAt: true,
            trendBand: true,
            supportArea: true,
          },
        })
      : Promise.resolve([]),
    needsAcademic && flags.learningOutcomes
      ? prisma.lessonOutcome.findMany({
          where: {
            evidenceType: "NEEDS_REVIEW",
            lesson: {
              status: "COMPLETED",
              ...lessonScope,
            },
          },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            evidenceType: true,
            outcome: {
              select: {
                title: true,
                unit: { select: { subject: { select: { name: true } } } },
              },
            },
          },
        })
      : Promise.resolve([]),
    needsLessons && flags.recoveryPackage
      ? prisma.recoveryPackage.count({
          where: {
            studentId: student.id,
            status: "PUBLISHED",
            completedAt: null,
          },
        })
      : Promise.resolve(0),
    needsAdminForms
      ? prisma.teacherProfile.findMany({
          where: { isCoach: true },
          orderBy: { user: { fullName: "asc" } },
          select: { id: true, user: { select: { fullName: true, email: true } } },
        })
      : Promise.resolve([]),
    needsAdminForms
      ? prisma.user.findMany({
          where: {
            role: "PARENT",
            status: "ACTIVE",
            id: { notIn: student.parents.map((link) => link.parentId) },
          },
          orderBy: { fullName: "asc" },
          take: 40,
          select: { id: true, fullName: true, email: true },
        })
      : Promise.resolve([]),
    needsTeachersTab || needsAdminForms
      ? prisma.studentTeacherAssignment.findMany({
          where: { studentId: student.id, active: true, endedAt: null },
          orderBy: [{ subject: "asc" }],
          include: {
            teacher: { select: { id: true, fullName: true, email: true } },
          },
        })
      : Promise.resolve([]),
    needsTeachersTab
      ? prisma.user.findMany({
          where: { role: "TEACHER", status: "ACTIVE" },
          orderBy: { fullName: "asc" },
          take: 60,
          select: { id: true, fullName: true, email: true },
        })
      : Promise.resolve([]),
  ]);

  return {
    student,
    products,
    orders,
    blockedOrders,
    currentCoach,
    needsOverview,
    needsAcademic,
    needsLessons,
    needsAssignmentsTab,
    needsTeachersTab,
    needsCoaching,
    needsExams,
    needsRisk,
    needsParent,
    needsCommerce,
    attendances14d,
    weekAttendances,
    overdueProgress,
    assignmentProgress,
    upcomingLessons,
    pastLessons,
    plan,
    reviewDueCount,
    helpOpenCount,
    interventionCases,
    mockExams,
    odkExams,
    coaching,
    goalViews,
    checkIns,
    digests,
    outcomeHints,
    recoveryOpenCount,
    coachOptions,
    parentOptions,
    teacherLinksRaw,
    teacherOptionsRaw,
  };
}
