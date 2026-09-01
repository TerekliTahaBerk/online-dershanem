import "server-only";

import { notFound } from "next/navigation";
import type { ProductCode, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { productLabel } from "@/lib/auth/roles";
import { getPanelFeatureFlags, type PanelFeatureFlags } from "@/lib/panel-feature-flags";
import { findCoachAssignmentForCoach, getStudentCoaching } from "@/lib/panel/coaching";
import { getStudentGoals } from "@/lib/panel/goals";
import { listStudentExams } from "@/lib/odk/student-exam-server";
import { netScore } from "@/lib/goals";
import { istanbulWeekStart } from "@/lib/istanbul-time";
import {
  canViewStudent360Commerce,
  daysBetween,
  derivePackageStatus,
  deriveStudent360RiskSignals,
  examNetDelta,
  isStudent360ViewerRole,
  parseStudent360Tab,
  planCompletionPercent,
  summarizeStudent360Risk,
  visibleStudent360Actions,
  visibleStudent360Tabs,
  type Student360Action,
  type Student360PackageStatus,
  type Student360RiskSummary,
  type Student360Tab,
  type Student360ViewerRole,
} from "@/lib/panel/student-360";

export type Student360AccessMode = "admin" | "teacher_group" | "teacher_direct" | "coach";

export type Student360Access = {
  role: Student360ViewerRole;
  mode: Student360AccessMode;
  studentProfileId: string;
  studentUserId: string;
  canViewCommerce: boolean;
  hasCoachAccess: boolean;
  groupIds: string[];
  subjects: string[] | null;
  viewerUserId: string;
};

export type Student360Summary = {
  fullName: string;
  email: string;
  classLevel: string | null;
  targetGoal: string | null;
  products: ProductCode[];
  productLabels: string[];
  groups: { id: string; name: string; subject: string; teacherName: string }[];
  coachName: string | null;
  packageStatus: Student360PackageStatus;
  lastActivityAt: Date | null;
  risk: Student360RiskSummary;
};

export type Student360OverviewTab = {
  weekAttendancePresent: number;
  weekAttendanceTotal: number;
  completedAssignments: number;
  assignmentTotal: number;
  planCompletionPercent: number | null;
  recentExams: { id: string; title: string; takenAt: Date; totalNet: number }[];
  activeRiskReasons: string[];
  upcomingLessons: { id: string; title: string; startsAt: Date }[];
  openInterventions: { id: string; reason: string; status: string; dueAt: Date }[];
  openHelpRequests: number;
  nearestOdkExamTitle: string | null;
};

export type Student360AcademicTab = {
  subjectPerformance: { subject: string; avgNet: number | null; sampleSize: number }[];
  outcomeHints: { title: string; subject: string; type: string }[];
  assignmentHistory: {
    id: string;
    title: string;
    status: string;
    dueAt: Date | null;
    groupName: string;
  }[];
  reviewDueCount: number;
  evidenceCount: number;
  unifiedOutcomes: {
    outcomeId: string;
    code: string;
    title: string;
    subjectName: string;
    unitName: string;
    status: string;
    statusLabel: string;
    evidence: {
      lesson: string | null;
      assignment: string | null;
      mockExam: string | null;
      coaching: string | null;
    };
    explanation: { source: string; detail: string }[];
  }[];
};

export type Student360LessonsTab = {
  past: {
    id: string;
    title: string;
    startsAt: Date;
    attendance: string | null;
    note: string | null;
  }[];
  upcoming: { id: string; title: string; startsAt: Date; groupName: string }[];
  recoveryOpenCount: number;
};

export type Student360CoachingTab = {
  coachName: string | null;
  cadenceDays: number | null;
  overdue: boolean;
  sharedNote: string | null;
  focus: string | null;
  goals: { id: string; label: string; target: number; current: number | null }[];
  checkIns: { id: string; createdAt: Date; energy: string; barrier: string; shared: boolean }[];
  plan: {
    weekStart: Date;
    status: string;
    completionPercent: number | null;
    tasks: { id: string; title: string; status: string; scheduledFor: Date }[];
  } | null;
  feedbackCategory: string | null;
  timeline: { id: string; occurredAt: Date; title: string; summary: string | null; kind: string }[];
};

export type Student360ExamsTab = {
  recent: {
    id: string;
    exam: string;
    takenAt: Date;
    totalNet: number;
    sections: { subject: string; net: number }[];
  }[];
  netDelta: number | null;
  subjectDeltas: { subject: string; delta: number | null }[];
  recurringGaps: string[];
};

export type Student360RiskTab = {
  summary: Student360RiskSummary;
  cases: {
    id: string;
    reasonCode: string;
    explanation: string;
    suggestedAction: string;
    status: string;
    dueAt: Date;
    ownerName: string | null;
    createdAt: Date;
  }[];
};

export type Student360ParentTab = {
  parents: {
    linkId: string;
    id: string;
    fullName: string;
    email: string;
    relationship: string | null;
  }[];
  digests: {
    id: string;
    weekStart: Date;
    status: string;
    publishedAt: Date | null;
    trendBand: string;
    supportArea: string;
  }[];
};

export type Student360CommerceTab = {
  memberships: { product: ProductCode; label: string; expiresAt: Date | null }[];
  orders: {
    id: string;
    packageName: string;
    status: string;
    provisioningStatus: string;
    provisioningError: string | null;
    createdAt: Date;
    totalCents: number;
  }[];
  packageStatus: Student360PackageStatus;
};

export type Student360TeachersTab = {
  links: {
    id: string;
    subject: string;
    teacherId: string;
    teacherName: string;
    startedAt: Date;
  }[];
};

export type Student360AssignmentsTab = {
  items: {
    id: string;
    title: string;
    status: string;
    dueAt: Date | null;
    groupName: string;
  }[];
};

export type Student360Bundle = {
  access: Student360Access;
  flags: PanelFeatureFlags;
  basePath: string;
  tab: Student360Tab;
  tabs: Student360Tab[];
  actions: Student360Action[];
  summary: Student360Summary;
  overview: Student360OverviewTab | null;
  academic: Student360AcademicTab | null;
  lessons: Student360LessonsTab | null;
  assignmentsTab: Student360AssignmentsTab | null;
  teachersTab: Student360TeachersTab | null;
  coaching: Student360CoachingTab | null;
  exams: Student360ExamsTab | null;
  riskTab: Student360RiskTab | null;
  parent: Student360ParentTab | null;
  commerce: Student360CommerceTab | null;
  coachOptions: { id: string; label: string }[];
  parentOptions: { id: string; label: string }[];
  teacherOptions: { id: string; label: string }[];
  currentCoachId: string | null;
  currentCadenceDays: number | null;
};

function asViewerRole(role: UserRole): Student360ViewerRole | null {
  return isStudent360ViewerRole(role) ? role : null;
}

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

export async function loadStudent360Bundle(input: {
  viewer: { userId: string; role: UserRole };
  studentProfileId: string;
  tabRaw?: string | string[];
  now?: Date;
}): Promise<Student360Bundle> {
  const now = input.now ?? new Date();
  const access = await resolveStudent360Access(input.viewer, input.studentProfileId);
  const flags = getPanelFeatureFlags();
  const tabs = visibleStudent360Tabs({
    role: access.role,
    canViewCommerce: access.canViewCommerce,
    flags,
  });
  const tab = parseStudent360Tab(input.tabRaw, tabs);
  const basePath =
    access.role === "ADMIN"
      ? `/panel/yonetim/ogrenciler/${access.studentProfileId}`
      : `/panel/ogretmen/ogrenci/${access.studentProfileId}`;

  const weekStart = istanbulWeekStart(now);
  const since14d = new Date(now.getTime() - 14 * 86_400_000);

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

  const products = student.user.productMemberships.map((row) => row.product);
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

  const needsOverview = tab === "genel";
  const needsAcademic = tab === "gelisim";
  const needsLessons = tab === "dersler" || tab === "takvim";
  const needsAssignmentsTab = tab === "odevler";
  const needsTeachersTab = tab === "ogretmenler" && access.role === "ADMIN";
  const needsCoaching = tab === "kocluk" && flags.adaptivePlan;
  const needsExams = tab === "denemeler" && flags.mockExamAnalysis;
  const needsRisk = tab === "risk";
  const needsParent = tab === "veli";
  const needsCommerce = tab === "paket" && access.canViewCommerce;
  const needsAdminForms = access.role === "ADMIN";
  const needsExamSignals = needsExams || needsOverview || needsAcademic;
  const needsAssignmentList = needsAcademic || needsOverview || needsAssignmentsTab;

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

  const absent14 = attendances14d.filter((row) => row.status === "ABSENT").length;
  const weekPresent = weekAttendances.filter(
    (row) => row.status === "PRESENT" || row.status === "LATE",
  ).length;
  const planDone = plan?.tasks.filter((task) => task.status === "DONE").length ?? 0;
  const planTotal = plan?.tasks.length ?? 0;
  const planPct = planCompletionPercent(planDone, planTotal);

  const examNets = mockExams.map((exam) => {
    const totalNet = exam.sections.reduce(
      (sum, section) => sum + netScore(section.correctCount, section.incorrectCount),
      0,
    );
    return {
      id: exam.id,
      exam: String(exam.exam),
      takenAt: exam.takenAt,
      totalNet: Math.round(totalNet * 100) / 100,
      sections: exam.sections.map((section) => ({
        subject: section.subjectName,
        net: Math.round(netScore(section.correctCount, section.incorrectCount) * 100) / 100,
      })),
    };
  });
  const netDelta = examNetDelta(examNets[1]?.totalNet ?? null, examNets[0]?.totalNet ?? null);
  const examDrop = netDelta != null && netDelta > 0 ? netDelta : null;

  const nearestExpiry =
    student.user.productMemberships
      .map((row) => row.expiresAt)
      .filter((value): value is Date => Boolean(value))
      .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

  const packageStatus = derivePackageStatus({
    activeProductCount: products.length,
    blockedProvisioningCount: blockedOrders.length,
    nearestExpiryAt: nearestExpiry,
    now,
  });

  const riskItems = deriveStudent360RiskSignals({
    attendanceAbsentCount14d: absent14,
    attendanceTotalCount14d: attendances14d.length,
    overdueAssignmentCount: overdueProgress,
    planCompletionPercent: planPct,
    planTaskTotal: planTotal,
    examNetDrop: examDrop,
    openHelpRequestCount: helpOpenCount,
    daysSinceLastLogin: student.user.lastLoginAt
      ? daysBetween(student.user.lastLoginAt, now)
      : null,
    reviewDueCount,
    blockedProvisioningCount: access.canViewCommerce ? blockedOrders.length : 0,
    products,
    hasActiveGroup: student.enrollments.length > 0,
    hasParentLink: student.parents.length > 0,
    hasCoachAssignment: Boolean(currentCoach),
    now,
  });
  const risk = summarizeStudent360Risk(riskItems);

  const lastActivityAt = student.user.lastLoginAt;

  const summary: Student360Summary = {
    fullName: student.user.fullName || student.user.email,
    email: student.user.email,
    classLevel: student.classLevel,
    targetGoal: student.targetGoal,
    products,
    productLabels: products.map((code) => productLabel(code)),
    groups: student.enrollments.map((enrollment) => ({
      id: enrollment.group.id,
      name: enrollment.group.name,
      subject: enrollment.group.subject,
      teacherName: enrollment.group.teacher.fullName || enrollment.group.teacher.email,
    })),
    coachName: currentCoach
      ? currentCoach.coach.user.fullName || currentCoach.coach.user.email
      : (coaching?.coachName ?? null),
    packageStatus,
    lastActivityAt,
    risk,
  };

  const actions = visibleStudent360Actions({
    role: access.role,
    studentProfileId: access.studentProfileId,
    studentUserId: access.studentUserId,
    canViewCommerce: access.canViewCommerce,
    hasCoachAccess: access.hasCoachAccess,
    flags,
  });

  const subjectMap = new Map<string, number[]>();
  for (const exam of examNets) {
    for (const section of exam.sections) {
      const list = subjectMap.get(section.subject) ?? [];
      list.push(section.net);
      subjectMap.set(section.subject, list);
    }
  }

  const liveOdk =
    odkExams.find((exam) => exam.status === "LIVE") ??
    odkExams
      .filter((exam) => exam.status === "SCHEDULED" && exam.startsAt && exam.startsAt >= now)
      .sort((a, b) => (a.startsAt?.getTime() ?? 0) - (b.startsAt?.getTime() ?? 0))[0] ??
    null;

  const overview: Student360OverviewTab | null = needsOverview
    ? {
        weekAttendancePresent: weekPresent,
        weekAttendanceTotal: weekAttendances.length,
        completedAssignments: assignmentProgress.filter((row) => row.status === "DONE").length,
        assignmentTotal: assignmentProgress.length,
        planCompletionPercent: planPct,
        recentExams: examNets.slice(0, 3).map((exam) => ({
          id: exam.id,
          title: exam.exam,
          takenAt: exam.takenAt,
          totalNet: exam.totalNet,
        })),
        activeRiskReasons: risk.whyRisky,
        upcomingLessons: upcomingLessons.slice(0, 3).map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          startsAt: lesson.startsAt,
        })),
        openInterventions: interventionCases.slice(0, 4).map((item) => ({
          id: item.id,
          reason: item.explanation,
          status: item.status,
          dueAt: item.dueAt,
        })),
        openHelpRequests: helpOpenCount,
        nearestOdkExamTitle: liveOdk?.title ?? null,
      }
    : null;

  const academic: Student360AcademicTab | null = needsAcademic
    ? {
        subjectPerformance: [...subjectMap.entries()].map(([subject, nets]) => ({
          subject,
          avgNet:
            nets.length > 0
              ? Math.round((nets.reduce((a, b) => a + b, 0) / nets.length) * 100) / 100
              : null,
          sampleSize: nets.length,
        })),
        outcomeHints: outcomeHints.map((row) => ({
          title: row.outcome.title,
          subject: row.outcome.unit.subject.name,
          type: row.evidenceType,
        })),
        assignmentHistory: assignmentProgress.map((row) => ({
          id: row.assignment.id,
          title: row.assignment.title,
          status: row.status,
          dueAt: row.assignment.dueAt,
          groupName: row.assignment.group.name,
        })),
        reviewDueCount,
        evidenceCount: outcomeHints.length,
        unifiedOutcomes: await (async () => {
          const { getStudentOutcomeProfile } = await import("@/lib/student-success/server/progress-server");
          const rows = await getStudentOutcomeProfile(student.id);
          return rows.slice(0, 20).map((row) => ({
            outcomeId: row.outcomeId,
            code: row.code,
            title: row.title,
            subjectName: row.subjectName,
            unitName: row.unitName,
            status: row.status,
            statusLabel: row.statusLabel,
            evidence: row.evidence,
            explanation: row.explanation,
          }));
        })(),
      }
    : null;

  const lessons: Student360LessonsTab | null = needsLessons
    ? {
        past: pastLessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          startsAt: lesson.startsAt,
          attendance: lesson.attendances[0]?.status ?? null,
          note: lesson.notes[0]?.note ?? lesson.notes[0]?.topic ?? null,
        })),
        upcoming: upcomingLessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          startsAt: lesson.startsAt,
          groupName: lesson.group.name,
        })),
        recoveryOpenCount,
      }
    : null;

  const timelineEvents = needsCoaching
    ? await prisma.studentTimelineEvent.findMany({
        where: {
          studentId: student.id,
          visibility: { in: ["STAFF", "STUDENT", "PARENT"] },
        },
        orderBy: { occurredAt: "desc" },
        take: 12,
        select: {
          id: true,
          occurredAt: true,
          title: true,
          summary: true,
          kind: true,
        },
      })
    : [];

  const coachingTab: Student360CoachingTab | null = needsCoaching
    ? {
        coachName: coaching?.coachName ?? summary.coachName,
        cadenceDays: coaching?.cadenceDays ?? currentCoach?.cadenceDays ?? null,
        overdue: coaching?.overdue ?? false,
        sharedNote: coaching?.sharedNote ?? null,
        focus: coaching?.focus ?? null,
        goals: goalViews.map((goal) => ({
          id: goal.id,
          label: goal.label,
          target: goal.target,
          current: goal.current,
        })),
        checkIns: checkIns.map((row) => ({
          id: row.id,
          createdAt: row.createdAt,
          energy: row.energy,
          barrier: row.barrier,
          shared: row.shareWithTeacher,
        })),
        plan: plan
          ? {
              weekStart: plan.weekStart,
              status: plan.status,
              completionPercent: planPct,
              tasks: plan.tasks.map((task) => ({
                id: task.id,
                title: task.title,
                status: task.status,
                scheduledFor: task.scheduledFor,
              })),
            }
          : null,
        feedbackCategory: plan?.changeRequestCategory ?? null,
        timeline: timelineEvents.map((row) => ({
          id: row.id,
          occurredAt: row.occurredAt,
          title: row.title,
          summary: row.summary,
          kind: row.kind,
        })),
      }
    : null;

  const subjectDeltas =
    examNets.length >= 2
      ? [...new Set(examNets.flatMap((exam) => exam.sections.map((section) => section.subject)))].map(
          (subject) => {
            const latest =
              examNets[0]?.sections.find((section) => section.subject === subject)?.net ?? null;
            const previous =
              examNets[1]?.sections.find((section) => section.subject === subject)?.net ?? null;
            return { subject, delta: examNetDelta(previous, latest) };
          },
        )
      : [];

  const examsTab: Student360ExamsTab | null = needsExams
    ? {
        recent: examNets,
        netDelta,
        subjectDeltas,
        recurringGaps: subjectDeltas
          .filter((row) => row.delta != null && row.delta > 0)
          .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
          .slice(0, 3)
          .map((row) => `${row.subject}: ${row.delta?.toFixed(1).replace(".", ",")} net düşüş`),
      }
    : null;

  const riskTab: Student360RiskTab | null = needsRisk
    ? {
        summary: risk,
        cases: interventionCases.map((item) => ({
          id: item.id,
          reasonCode: item.reasonCode,
          explanation: item.explanation,
          suggestedAction: item.suggestedAction,
          status: item.status,
          dueAt: item.dueAt,
          ownerName: item.owner ? item.owner.fullName || item.owner.email : null,
          createdAt: item.createdAt,
        })),
      }
    : null;

  const parentTab: Student360ParentTab | null = needsParent
    ? {
        parents: student.parents.map((link) => ({
          linkId: link.id,
          id: link.parent.id,
          fullName: link.parent.fullName || link.parent.email,
          email: link.parent.email,
          relationship: link.relationship,
        })),
        digests: digests.map((digest) => ({
          id: digest.id,
          weekStart: digest.weekStart,
          status: digest.status,
          publishedAt: digest.publishedAt,
          trendBand: digest.trendBand,
          supportArea: digest.supportArea,
        })),
      }
    : null;

  const teachersTab: Student360TeachersTab | null = needsTeachersTab
    ? {
        links: teacherLinksRaw.map((link) => ({
          id: link.id,
          subject: link.subject,
          teacherId: link.teacher.id,
          teacherName: link.teacher.fullName || link.teacher.email,
          startedAt: link.startedAt,
        })),
      }
    : null;

  const assignmentsTab: Student360AssignmentsTab | null = needsAssignmentsTab
    ? {
        items: assignmentProgress.map((row) => ({
          id: row.assignment.id,
          title: row.assignment.title,
          status: row.status,
          dueAt: row.assignment.dueAt,
          groupName: row.assignment.group.name,
        })),
      }
    : null;

  const commerceTab: Student360CommerceTab | null = needsCommerce
    ? {
        memberships: student.user.productMemberships.map((row) => ({
          product: row.product,
          label: productLabel(row.product),
          expiresAt: row.expiresAt,
        })),
        orders: orders.map((order) => ({
          id: order.id,
          packageName: order.packageName,
          status: order.status,
          provisioningStatus: order.provisioningStatus,
          provisioningError: order.provisioningError,
          createdAt: order.createdAt,
          totalCents: order.totalCents,
        })),
        packageStatus,
      }
    : null;

  return {
    access,
    flags,
    basePath,
    tab,
    tabs,
    actions,
    summary,
    overview,
    academic,
    lessons,
    assignmentsTab,
    teachersTab,
    coaching: coachingTab,
    exams: examsTab,
    riskTab,
    parent: parentTab,
    commerce: commerceTab,
    coachOptions: coachOptions.map((coach) => ({
      id: coach.id,
      label: coach.user.fullName || coach.user.email,
    })),
    parentOptions: parentOptions.map((parent) => ({
      id: parent.id,
      label: parent.fullName || parent.email,
    })),
    teacherOptions: teacherOptionsRaw.map((teacher) => ({
      id: teacher.id,
      label: teacher.fullName || teacher.email,
    })),
    currentCoachId: currentCoach?.coach.id ?? null,
    currentCadenceDays: currentCoach?.cadenceDays ?? null,
  };
}
