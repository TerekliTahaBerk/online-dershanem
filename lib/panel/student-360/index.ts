/** Student 360 orkestrasyonu; sorgu, politika ve DTO katmanlarını birleştirir. */
import "server-only";

import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { productLabel } from "@/lib/auth/roles";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { netScore } from "@/lib/goals";
import { istanbulWeekStart } from "@/lib/istanbul-time";
import {
  daysBetween,
  derivePackageStatus,
  deriveStudent360RiskSignals,
  examNetDelta,
  parseStudent360Tab,
  planCompletionPercent,
  summarizeStudent360Risk,
  visibleStudent360Actions,
  visibleStudent360Tabs,
} from "@/lib/panel/student-360";
import { loadStudent360QueryData, resolveStudent360Access } from "./queries";
import type {
  Student360AcademicTab,
  Student360AssignmentsTab,
  Student360Bundle,
  Student360CoachingTab,
  Student360CommerceTab,
  Student360ExamsTab,
  Student360LessonsTab,
  Student360OverviewTab,
  Student360ParentTab,
  Student360RiskTab,
  Student360Summary,
  Student360TeachersTab,
} from "./dto";

export * from "./dto";
export { resolveStudent360Access } from "./queries";

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

  const {
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
  } = await loadStudent360QueryData({ access, flags, tab, now, weekStart, since14d });

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
