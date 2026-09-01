import "server-only";

import type { CurriculumExam, Prisma } from "@prisma/client";
import {
  MANAGEMENT_ANALYTICS_RULE_VERSION,
  MANAGEMENT_ANALYTICS_TIMEZONE,
  PACKAGE_RENEWAL_WINDOW_DAYS,
} from "@/lib/analytics/definitions";
import {
  calculateCommercialMetrics,
  type CommercialCounts,
} from "@/lib/analytics/commercial";
import {
  calculateEducationMetrics,
  type EducationCounts,
} from "@/lib/analytics/education";
import {
  calculateSuccessMetrics,
  type SuccessCounts,
} from "@/lib/analytics/success";
import {
  calculateTeacherOpsMetrics,
  type TeacherOpsCounts,
} from "@/lib/analytics/teacher-ops";
import {
  buildDashboardKpis,
  type ManagementAnalyticsSnapshot,
} from "@/lib/analytics/dashboard";
import {
  analyticsFilterCacheKey,
  type AnalyticsCohortFilters,
} from "@/lib/analytics/filters";
import { addIstanbulCalendarDays } from "@/lib/istanbul-time";
import { prisma } from "@/lib/prisma";
import type { CohortExamObservation } from "@/lib/cohort-quality";

function activeMembershipWhere(now: Date): Prisma.ProductMembershipWhereInput {
  return {
    revokedAt: null,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

function studentScopeWhere(
  filters: AnalyticsCohortFilters,
  now: Date,
): Prisma.StudentProfileWhereInput {
  const where: Prisma.StudentProfileWhereInput = {
    user: {
      role: "STUDENT",
      status: "ACTIVE",
      productMemberships: {
        some: {
          ...activeMembershipWhere(now),
          ...(filters.product !== "ALL" ? { product: filters.product } : {}),
        },
      },
    },
  };
  if (filters.classLevel) where.classLevel = filters.classLevel;
  if (filters.groupId) {
    where.enrollments = { some: { groupId: filters.groupId, endedAt: null } };
  } else if (filters.teacherId) {
    where.enrollments = {
      some: { endedAt: null, group: { teacherId: filters.teacherId, isActive: true } },
    };
  }
  return where;
}

function lessonFilterWhere(filters: AnalyticsCohortFilters): Prisma.LessonWhereInput {
  const where: Prisma.LessonWhereInput = {
    startsAt: { gte: filters.from, lte: filters.to },
  };
  if (filters.groupId) where.groupId = filters.groupId;
  if (filters.teacherId) where.teacherId = filters.teacherId;
  return where;
}

async function loadCommercialCounts(
  filters: AnalyticsCohortFilters,
  now: Date,
): Promise<CommercialCounts> {
  const leadWhere: Prisma.BusinessLeadWhereInput = {
    createdAt: { gte: filters.from, lte: filters.to },
    anonymizedAt: null,
  };

  const renewalEnd = addIstanbulCalendarDays(now, PACKAGE_RENEWAL_WINDOW_DAYS);

  const [
    leadCount,
    wonLeadCount,
    wonCycles,
    odPaid,
    odkPaid,
    odProvisioned,
    odkProvisioned,
    odRefunded,
    odkRefunded,
    refundLines,
    collections,
    renewals,
    odSales,
    odkSales,
  ] = await Promise.all([
    prisma.businessLead.count({ where: leadWhere }),
    prisma.businessLead.count({ where: { ...leadWhere, stage: "WON" } }),
    prisma.businessLead.findMany({
      where: { ...leadWhere, stage: "WON", wonAt: { not: null } },
      select: { createdAt: true, wonAt: true },
      take: 2_000,
    }),
    prisma.odOrder.count({
      where: { status: "PAID", createdAt: { gte: filters.from, lte: filters.to } },
    }),
    prisma.odkOrder.count({
      where: { status: "PAID", createdAt: { gte: filters.from, lte: filters.to } },
    }),
    prisma.odOrder.count({
      where: {
        status: "PAID",
        provisioningStatus: "SUCCEEDED",
        createdAt: { gte: filters.from, lte: filters.to },
      },
    }),
    prisma.odkOrder.count({
      where: {
        status: "PAID",
        provisioningStatus: "SUCCEEDED",
        createdAt: { gte: filters.from, lte: filters.to },
      },
    }),
    prisma.odOrder.count({
      where: { status: "REFUNDED", createdAt: { gte: filters.from, lte: filters.to } },
    }),
    prisma.odkOrder.count({
      where: { status: "REFUNDED", createdAt: { gte: filters.from, lte: filters.to } },
    }),
    prisma.commerceOrderLine.aggregate({
      where: {
        refundedCents: { gt: 0 },
        updatedAt: { gte: filters.from, lte: filters.to },
      },
      _sum: { refundedCents: true },
    }),
    prisma.financialTransaction.aggregate({
      where: {
        status: "PAID",
        kind: { not: "EXPENSE" },
        transactionAt: { gte: filters.from, lte: filters.to },
      },
      _sum: { netCents: true },
    }),
    prisma.productMembership.count({
      where: {
        revokedAt: null,
        expiresAt: { gt: now, lte: renewalEnd },
        ...(filters.product !== "ALL" ? { product: filters.product } : {}),
      },
    }),
    filters.product === "ODK"
      ? Promise.resolve([] as Array<{ packageName: string; _count: { _all: number }; _sum: { totalCents: number | null } }>)
      : prisma.odOrder.groupBy({
          by: ["packageName"],
          where: { status: "PAID", createdAt: { gte: filters.from, lte: filters.to } },
          _count: { _all: true },
          _sum: { totalCents: true },
        }),
    filters.product === "OD" || filters.product === "OK"
      ? Promise.resolve(
          [] as Array<{
            packageId: string;
            _count: { _all: number };
            _sum: { totalCents: number | null };
          }>,
        )
      : prisma.odkOrder.groupBy({
          by: ["packageId"],
          where: { status: "PAID", createdAt: { gte: filters.from, lte: filters.to } },
          _count: { _all: true },
          _sum: { totalCents: true },
        }),
  ]);

  const odkPackageIds = [...new Set(odkSales.map((row) => row.packageId))];
  const odkPackages = odkPackageIds.length
    ? await prisma.odkPackage.findMany({
        where: { id: { in: odkPackageIds } },
        select: { id: true, title: true },
      })
    : [];
  const odkTitle = new Map(odkPackages.map((row) => [row.id, row.title]));

  const salesByProduct: CommercialCounts["salesByProduct"] = [
    ...odSales.map((row) => ({
      product: "OD" as const,
      packageName: row.packageName || "Paketsiz",
      orderCount: row._count._all,
      totalCents: row._sum.totalCents ?? 0,
    })),
    ...odkSales.map((row) => ({
      product: "ODK" as const,
      packageName: odkTitle.get(row.packageId) || "ODK paket",
      orderCount: row._count._all,
      totalCents: row._sum.totalCents ?? 0,
    })),
  ];

  // Ürün filtresi OK/OD/ODK ile sipariş tarafını daralt
  const paidOrderCount =
    filters.product === "ODK"
      ? odkPaid
      : filters.product === "OD" || filters.product === "OK"
        ? odPaid
        : odPaid + odkPaid;
  const provisionedOrderCount =
    filters.product === "ODK"
      ? odkProvisioned
      : filters.product === "OD" || filters.product === "OK"
        ? odProvisioned
        : odProvisioned + odkProvisioned;
  const refundedOrderCount =
    filters.product === "ODK"
      ? odkRefunded
      : filters.product === "OD" || filters.product === "OK"
        ? odRefunded
        : odRefunded + odkRefunded;

  return {
    leadCount,
    wonLeadCount,
    paidOrderCount,
    provisionedOrderCount,
    refundedOrderCount,
    refundedCents: refundLines._sum.refundedCents ?? 0,
    collectionsCents: Math.max(0, collections._sum.netCents ?? 0),
    packageRenewalsUpcoming: renewals,
    salesCycleMs: wonCycles.map((row) => (row.wonAt!.getTime() - row.createdAt.getTime())),
    salesByProduct,
  };
}

async function loadEducationCounts(
  filters: AnalyticsCohortFilters,
  now: Date,
): Promise<EducationCounts> {
  const studentWhere = studentScopeWhere(filters, now);
  const lessonWhere = lessonFilterWhere(filters);

  const attendanceWhere: Prisma.AttendanceWhereInput = {
    createdAt: { gte: filters.from, lte: filters.to },
    ...(filters.groupId || filters.teacherId
      ? { lesson: lessonWhere }
      : {}),
    ...(filters.classLevel || filters.product !== "ALL"
      ? { student: studentWhere }
      : {}),
  };

  const assignmentWhere: Prisma.AssignmentWhereInput = {
    isActive: true,
    dueAt: { gte: filters.from, lte: filters.to },
    ...(filters.groupId ? { groupId: filters.groupId } : {}),
    ...(filters.teacherId ? { group: { teacherId: filters.teacherId } } : {}),
  };

  const [
    activeStudents,
    activeGroups,
    attendancePresentOrLate,
    attendanceTotal,
    assignmentDone,
    assignmentProgressTotal,
    planTasksDone,
    planTasksTotal,
    mockExamParticipants,
    riskBuckets,
    interventionsOpened,
  ] = await Promise.all([
    prisma.studentProfile.count({ where: studentWhere }),
    prisma.group.count({
      where: {
        isActive: true,
        ...(filters.groupId ? { id: filters.groupId } : {}),
        ...(filters.teacherId ? { teacherId: filters.teacherId } : {}),
      },
    }),
    prisma.attendance.count({
      where: { ...attendanceWhere, status: { in: ["PRESENT", "LATE"] } },
    }),
    prisma.attendance.count({ where: attendanceWhere }),
    prisma.assignmentProgress.count({
      where: { status: "DONE", assignment: assignmentWhere },
    }),
    prisma.assignmentProgress.count({ where: { assignment: assignmentWhere } }),
    prisma.weeklyPlanTask.count({
      where: {
        status: "DONE",
        plan: {
          weekStart: { gte: filters.from, lte: filters.to },
          ...(filters.classLevel || filters.product !== "ALL" || filters.groupId || filters.teacherId
            ? { student: studentWhere }
            : {}),
        },
      },
    }),
    prisma.weeklyPlanTask.count({
      where: {
        plan: {
          weekStart: { gte: filters.from, lte: filters.to },
          ...(filters.classLevel || filters.product !== "ALL" || filters.groupId || filters.teacherId
            ? { student: studentWhere }
            : {}),
        },
      },
    }),
    prisma.mockExam
      .groupBy({
        by: ["studentId"],
        where: {
          takenAt: { gte: filters.from, lte: filters.to },
          ...(filters.examType !== "ALL" ? { exam: filters.examType as CurriculumExam } : {}),
          student: studentWhere,
        },
      })
      .then((rows) => rows.length),
    prisma.interventionCase
      .findMany({
        where: {
          status: { in: ["OPEN", "IN_PROGRESS", "SNOOZED"] },
          student: studentWhere,
        },
        select: { studentId: true, status: true, dueAt: true },
        take: 5_000,
      })
      .then((rows) => {
        const critical = new Set<string>();
        const watch = new Set<string>();
        for (const row of rows) {
          if (row.status === "SNOOZED" || row.dueAt.getTime() >= now.getTime()) {
            if (!critical.has(row.studentId)) watch.add(row.studentId);
          } else {
            critical.add(row.studentId);
            watch.delete(row.studentId);
          }
        }
        return { critical: critical.size, watch: watch.size };
      }),
    prisma.interventionCase.count({
      where: {
        createdAt: { gte: filters.from, lte: filters.to },
        student: studentWhere,
      },
    }),
  ]);

  return {
    activeStudents,
    activeGroups,
    attendancePresentOrLate,
    attendanceTotal,
    assignmentDone,
    assignmentProgressTotal,
    planTasksDone,
    planTasksTotal,
    mockExamParticipants,
    riskCritical: riskBuckets.critical,
    riskWatch: riskBuckets.watch,
    interventionsOpened,
  };
}

async function loadSuccessCounts(
  filters: AnalyticsCohortFilters,
  now: Date,
  education: EducationCounts,
): Promise<SuccessCounts> {
  const studentWhere = studentScopeWhere(filters, now);
  const lessonWhere: Prisma.LessonWhereInput = {
    ...lessonFilterWhere(filters),
    status: "COMPLETED",
  };

  const exams = await prisma.mockExam.findMany({
    where: {
      takenAt: { gte: filters.from, lte: filters.to },
      ...(filters.examType !== "ALL" ? { exam: filters.examType as CurriculumExam } : {}),
      student: studentWhere,
    },
    select: {
      studentId: true,
      exam: true,
      takenAt: true,
      sections: {
        select: {
          subjectCode: true,
          subjectName: true,
          questionCount: true,
          correctCount: true,
          incorrectCount: true,
        },
      },
    },
    take: 5_000,
  });

  const observations: CohortExamObservation[] = exams.map((row) => ({
    studentKey: row.studentId,
    exam: row.exam as CohortExamObservation["exam"],
    takenAt: row.takenAt,
    sections: row.sections.map((section) => ({
      questionCount: section.questionCount,
      correctCount: section.correctCount,
      incorrectCount: section.incorrectCount,
    })),
  }));

  // Ders bazlı (subject) ilk→son net değişimi — saf hesap için ham changes
  const byStudentSubject = new Map<
    string,
    Array<{ takenAt: number; net: number; subjectName: string }>
  >();
  for (const exam of exams) {
    for (const section of exam.sections) {
      if (!section.questionCount) continue;
      const net =
        ((section.correctCount - section.incorrectCount / (exam.exam === "LGS" ? 3 : 4)) /
          section.questionCount) *
        100;
      const key = `${exam.studentId}::${section.subjectCode}`;
      const list = byStudentSubject.get(key) ?? [];
      list.push({
        takenAt: exam.takenAt.getTime(),
        net: Math.round(net * 10) / 10,
        subjectName: section.subjectName,
      });
      byStudentSubject.set(key, list);
    }
  }

  const subjectBuckets = new Map<
    string,
    { subjectCode: string; subjectName: string; changes: number[] }
  >();
  for (const [key, rows] of byStudentSubject) {
    const subjectCode = key.split("::")[1]!;
    const sorted = [...rows].sort((a, b) => a.takenAt - b.takenAt);
    if (sorted.length < 2) continue;
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    if (last.takenAt - first.takenAt < 14 * 86_400_000) continue;
    const mutable = subjectBuckets.get(subjectCode) ?? {
      subjectCode,
      subjectName: first.subjectName,
      changes: [] as number[],
    };
    mutable.changes.push(last.net - first.net);
    subjectBuckets.set(subjectCode, mutable);
  }

  const [lessonsCompleted, lessonsCompletedWithOutcome] = await Promise.all([
    prisma.lesson.count({ where: lessonWhere }),
    prisma.lesson.count({
      where: { ...lessonWhere, outcomeLinks: { some: {} } },
    }),
  ]);

  return {
    observations,
    subjectChanges: [...subjectBuckets.values()],
    lessonsCompleted,
    lessonsCompletedWithOutcome,
    planCompletionPercent:
      education.planTasksTotal > 0
        ? Math.round((education.planTasksDone / education.planTasksTotal) * 10_000) / 100
        : null,
    planSampleSize: education.planTasksTotal,
    mockParticipationPercent:
      education.activeStudents > 0
        ? Math.round((education.mockExamParticipants / education.activeStudents) * 10_000) / 100
        : null,
    mockSampleSize: education.mockExamParticipants,
  };
}

async function loadTeacherOpsCounts(
  filters: AnalyticsCohortFilters,
  now: Date,
): Promise<TeacherOpsCounts> {
  const lessonBase = lessonFilterWhere(filters);
  const groupScope: Prisma.GroupWhereInput = {
    isActive: true,
    ...(filters.groupId ? { id: filters.groupId } : {}),
    ...(filters.teacherId ? { teacherId: filters.teacherId } : {}),
  };

  const [
    lessonsEligible,
    lessonsCompleted,
    openInterventions,
    overdueAssignmentProgress,
    pastPlannedLessons,
    interventionsCreated,
    interventionsResolved,
    activeEnrollments,
    teacherGroups,
  ] = await Promise.all([
    prisma.lesson.count({
      where: { ...lessonBase, status: { not: "CANCELLED" } },
    }),
    prisma.lesson.count({
      where: { ...lessonBase, status: "COMPLETED" },
    }),
    prisma.interventionCase.count({
      where: {
        status: { in: ["OPEN", "IN_PROGRESS"] },
        ...(filters.teacherId
          ? { student: { enrollments: { some: { endedAt: null, group: { teacherId: filters.teacherId } } } } }
          : {}),
        ...(filters.groupId
          ? { student: { enrollments: { some: { endedAt: null, groupId: filters.groupId } } } }
          : {}),
      },
    }),
    prisma.assignmentProgress.count({
      where: {
        status: { not: "DONE" },
        assignment: {
          isActive: true,
          dueAt: { lt: now },
          ...(filters.groupId ? { groupId: filters.groupId } : {}),
          ...(filters.teacherId ? { group: { teacherId: filters.teacherId } } : {}),
        },
      },
    }),
    prisma.lesson.count({
      where: {
        status: "PLANNED",
        endsAt: { lt: now },
        ...(filters.groupId ? { groupId: filters.groupId } : {}),
        ...(filters.teacherId ? { teacherId: filters.teacherId } : {}),
      },
    }),
    prisma.interventionCase.count({
      where: {
        createdAt: { gte: filters.from, lte: filters.to },
        ...(filters.teacherId
          ? { student: { enrollments: { some: { endedAt: null, group: { teacherId: filters.teacherId } } } } }
          : {}),
        ...(filters.groupId
          ? { student: { enrollments: { some: { endedAt: null, groupId: filters.groupId } } } }
          : {}),
      },
    }),
    prisma.interventionCase.count({
      where: {
        status: { in: ["RESOLVED", "FALSE_POSITIVE"] },
        resolvedAt: { gte: filters.from, lte: filters.to },
        ...(filters.teacherId
          ? { student: { enrollments: { some: { endedAt: null, group: { teacherId: filters.teacherId } } } } }
          : {}),
        ...(filters.groupId
          ? { student: { enrollments: { some: { endedAt: null, groupId: filters.groupId } } } }
          : {}),
      },
    }),
    prisma.enrollment.count({
      where: { endedAt: null, group: groupScope },
    }),
    prisma.group.findMany({
      where: groupScope,
      select: { teacherId: true },
      distinct: ["teacherId"],
    }),
  ]);

  return {
    lessonsEligible,
    lessonsCompleted,
    openInterventions,
    overdueAssignmentProgress,
    pastPlannedLessons,
    interventionsCreated,
    interventionsResolved,
    activeEnrollments,
    distinctActiveTeachers: teacherGroups.length,
  };
}

async function loadSnapshotUncached(
  filters: AnalyticsCohortFilters,
  now: Date,
): Promise<ManagementAnalyticsSnapshot> {
  const [commercialCounts, educationCounts, teacherOpsCounts] = await Promise.all([
    loadCommercialCounts(filters, now),
    loadEducationCounts(filters, now),
    loadTeacherOpsCounts(filters, now),
  ]);

  const commercial = calculateCommercialMetrics(commercialCounts);
  const education = calculateEducationMetrics(educationCounts);
  const teacherOps = calculateTeacherOpsMetrics(teacherOpsCounts);
  const successCounts = await loadSuccessCounts(filters, now, educationCounts);
  const success = calculateSuccessMetrics(successCounts);

  return {
    ruleVersion: MANAGEMENT_ANALYTICS_RULE_VERSION,
    timezone: MANAGEMENT_ANALYTICS_TIMEZONE,
    commercial,
    education,
    success,
    teacherOps,
    kpis: buildDashboardKpis({ commercial, education, teacherOps }),
  };
}

/**
 * Management analytics snapshot.
 * Aggregate sorgular kullanır; sayfalanmış listeden KPI türetilmez.
 *
 * Performans: OLTP'yi yormamak için count/groupBy tercih edilir.
 * Kısa TTL cache / scheduled rollup ihtiyacı doğarsa
 * `MANAGEMENT_ANALYTICS_CACHE_TTL_SECONDS` + `cacheWrap` eklenebilir
 * (Date alanlarının JSON serileştirmesine dikkat).
 */
export async function loadManagementAnalyticsSnapshot(
  filters: AnalyticsCohortFilters,
  options?: { now?: Date },
): Promise<ManagementAnalyticsSnapshot> {
  const now = options?.now ?? new Date();
  return loadSnapshotUncached(filters, now);
}

export async function loadMetricDetail(
  metricKey: string,
  filters: AnalyticsCohortFilters,
): Promise<ManagementAnalyticsSnapshot> {
  return loadManagementAnalyticsSnapshot(filters);
}
