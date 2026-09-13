import "server-only";

import { prisma } from "@/lib/prisma";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import {
  addIstanbulCalendarDays,
  istanbulDayStart,
  istanbulNextDayStart,
} from "@/lib/istanbul-time";
import { planningWeekStart } from "@/lib/adaptive-plan";
import { checkInLabels } from "@/lib/student-check-in";
import { netScore } from "@/lib/goals";
import {
  ATTENTION_ABSENT_THRESHOLD,
  ATTENTION_EXAM_NET_DROP,
  ATTENTION_EXAM_WINDOW_DAYS,
  ATTENTION_OVERDUE_ASSIGNMENT_THRESHOLD,
  ATTENTION_WINDOW_DAYS,
  formatAttentionAge,
} from "@/lib/panel/teacher-attention";
import {
  buildTeacherWorkspace,
  type TeacherWorkspace,
  type TeacherWorkspaceFlags,
  type TeacherWorkspacePendingSource,
  type TeacherWorkspaceRiskSource,
  type TeacherWorkspaceUpcomingSource,
} from "@/lib/panel/teacher-workspace";

const DAY_MS = 24 * 60 * 60 * 1000;

function workspaceFlags(): TeacherWorkspaceFlags {
  const flags = getPanelFeatureFlags();
  return {
    quickLessonClose: flags.quickLessonClose,
    interventionInbox: flags.interventionInbox,
    adaptivePlan: flags.adaptivePlan,
    reviewQueue: flags.reviewQueue,
    studentCheckIn: flags.studentCheckIn,
    mockExamAnalysis: flags.mockExamAnalysis,
    assignmentEvidence: flags.assignmentEvidence,
  };
}

function examTotalNet(sections: Array<{ correctCount: number; incorrectCount: number }>): number {
  return sections.reduce((sum, section) => sum + netScore(section.correctCount, section.incorrectCount), 0);
}

export async function getTeacherWorkspace(teacherId: string, now = new Date()): Promise<TeacherWorkspace> {
  const flags = workspaceFlags();
  const dayStart = istanbulDayStart(now);
  const dayEnd = istanbulNextDayStart(now);
  const tomorrowStart = dayEnd;
  const tomorrowEnd = addIstanbulCalendarDays(dayStart, 2);
  const twoWeeksAgo = new Date(now.getTime() - ATTENTION_WINDOW_DAYS * DAY_MS);
  const examSince = new Date(now.getTime() - ATTENTION_EXAM_WINDOW_DAYS * DAY_MS);
  const weekStart = planningWeekStart(now);
  const weekEnd = addIstanbulCalendarDays(weekStart, 7);
  const upcomingHorizon = addIstanbulCalendarDays(dayStart, 7);

  const [todayLessonsRaw, awaitingNotes, rosterGroups] = await Promise.all([
    prisma.lesson.findMany({
      where: {
        teacherId,
        startsAt: { gte: dayStart, lt: dayEnd },
        status: { not: "CANCELLED" },
      },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        title: true,
        status: true,
        meetingUrl: true,
        groupId: true,
        group: {
          select: {
            name: true,
            subject: true,
            enrollments: {
              where: { endedAt: null },
              select: { studentId: true },
            },
          },
        },
        notes: { where: { studentId: null }, select: { id: true }, take: 1 },
        _count: { select: { materials: true } },
      },
    }),
    prisma.lesson.findMany({
      where: {
        teacherId,
        startsAt: { lt: now, gte: twoWeeksAgo },
        status: { not: "CANCELLED" },
        notes: { none: { studentId: null } },
      },
      orderBy: { startsAt: "desc" },
      take: 8,
      select: {
        id: true,
        startsAt: true,
        title: true,
        group: { select: { name: true } },
      },
    }),
    prisma.group.findMany({
      where: { teacherId, isActive: true },
      select: {
        name: true,
        enrollments: {
          where: { endedAt: null },
          select: {
            studentId: true,
            student: {
              select: {
                id: true,
                user: { select: { fullName: true, email: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const roster = rosterGroups.flatMap((group) =>
    group.enrollments.map((enrollment) => ({
      id: enrollment.student.id,
      name: enrollment.student.user.fullName || enrollment.student.user.email,
      groupName: group.name,
    })),
  );
  const studentIds = [...new Set(roster.map((row) => row.id))];
  const rosterById = new Map(roster.map((row) => [row.id, row]));

  const pending: TeacherWorkspacePendingSource[] = awaitingNotes.map((lesson) => ({
    kind: "LESSON_CLOSE",
    id: lesson.id,
    title: `${lesson.group.name} · ${lesson.title}`,
    detail: `Ders başlangıcı ${formatAttentionAge(lesson.startsAt, now)}`,
    href: `/panel/ogretmen/ders/${lesson.id}`,
    ctaLabel: flags.quickLessonClose ? "Hızlı kapat" : "Notu tamamla",
    dueAt: lesson.startsAt,
    createdAt: lesson.startsAt,
  }));

  const upcoming: TeacherWorkspaceUpcomingSource[] = [];
  const riskyCandidates: TeacherWorkspaceRiskSource[] = [];

  const [
    helpRequests,
    interventions,
    ungraded,
    pendingPlans,
    reviewDue,
    absences,
    overdueAssignments,
    exams,
    tomorrowLessons,
    upcomingExams,
  ] = await Promise.all([
    flags.studentCheckIn
      ? prisma.studentHelpRequest.findMany({
          where: {
            status: "OPEN",
            group: { teacherId, isActive: true },
            checkIn: { shareWithTeacher: true },
            student: {
              enrollments: { some: { endedAt: null, group: { teacherId, isActive: true } } },
            },
          },
          orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
          take: 12,
          select: {
            id: true,
            studentId: true,
            createdAt: true,
            dueAt: true,
            group: { select: { name: true } },
            checkIn: { select: { barrier: true } },
            student: { select: { user: { select: { fullName: true, email: true } } } },
          },
        })
      : Promise.resolve([]),
    flags.interventionInbox
      ? prisma.interventionCase.findMany({
          where: {
            status: { in: ["OPEN", "IN_PROGRESS"] },
            student: {
              enrollments: { some: { endedAt: null, group: { isActive: true, teacherId } } },
            },
          },
          orderBy: [{ dueAt: "asc" }, { id: "asc" }],
          take: 12,
          select: {
            id: true,
            studentId: true,
            explanation: true,
            dueAt: true,
            createdAt: true,
            student: { select: { user: { select: { fullName: true, email: true } } } },
          },
        })
      : Promise.resolve([]),
    flags.assignmentEvidence
      ? prisma.assignmentSubmission.findMany({
          where: {
            status: "SUBMITTED",
            assignment: { isActive: true, group: { teacherId, isActive: true } },
          },
          orderBy: { submittedAt: "asc" },
          take: 12,
          select: {
            id: true,
            submittedAt: true,
            student: { select: { user: { select: { fullName: true, email: true } } } },
            assignment: { select: { title: true, id: true } },
          },
        })
      : Promise.resolve([]),
    flags.adaptivePlan
      ? prisma.weeklyPlan.findMany({
          where: {
            weekStart: { gte: weekStart, lt: weekEnd },
            status: { in: ["DRAFT", "CHANGE_REQUESTED"] },
            student: {
              enrollments: { some: { endedAt: null, group: { isActive: true, teacherId } } },
            },
          },
          orderBy: { updatedAt: "asc" },
          take: 12,
          select: {
            id: true,
            status: true,
            updatedAt: true,
            weekStart: true,
            student: { select: { user: { select: { fullName: true, email: true } } } },
          },
        })
      : Promise.resolve([]),
    flags.reviewQueue && studentIds.length
      ? prisma.reviewItem.groupBy({
          by: ["studentId"],
          where: {
            studentId: { in: studentIds },
            status: "ACTIVE",
            dueAt: { lte: now },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    studentIds.length
      ? prisma.attendance.groupBy({
          by: ["studentId"],
          where: {
            status: "ABSENT",
            createdAt: { gte: twoWeeksAgo },
            studentId: { in: studentIds },
            lesson: { teacherId },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    studentIds.length
      ? prisma.assignmentProgress.groupBy({
          by: ["studentId"],
          where: {
            studentId: { in: studentIds },
            status: { not: "DONE" },
            assignment: {
              isActive: true,
              dueAt: { lt: now },
              group: { teacherId, isActive: true },
            },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    flags.mockExamAnalysis && studentIds.length
      ? prisma.mockExam.findMany({
          where: {
            studentId: { in: studentIds },
            takenAt: { gte: examSince },
            student: {
              enrollments: { some: { endedAt: null, group: { isActive: true, teacherId } } },
            },
          },
          select: {
            studentId: true,
            takenAt: true,
            sections: { select: { correctCount: true, incorrectCount: true } },
          },
          orderBy: { takenAt: "desc" },
        })
      : Promise.resolve([]),
    prisma.lesson.findMany({
      where: {
        teacherId,
        startsAt: { gte: tomorrowStart, lt: tomorrowEnd },
        status: { not: "CANCELLED" },
      },
      orderBy: { startsAt: "asc" },
      take: 8,
      select: {
        id: true,
        startsAt: true,
        title: true,
        group: { select: { name: true } },
      },
    }),
    flags.mockExamAnalysis
      ? prisma.odkExam.findMany({
          where: {
            status: "SCHEDULED",
            startsAt: { gte: now, lte: upcomingHorizon },
          },
          orderBy: { startsAt: "asc" },
          take: 6,
          select: {
            id: true,
            title: true,
            startsAt: true,
            family: true,
          },
        })
      : Promise.resolve([]),
  ]);

  for (const request of helpRequests) {
    const name = request.student.user.fullName || request.student.user.email;
    pending.push({
      kind: "HELP_REQUEST",
      id: request.id,
      title: name,
      detail: `${request.group.name} · ${checkInLabels.barrier[request.checkIn.barrier]}`,
      href: `/panel/ogretmen/yardim#yardim-${request.id}`,
      ctaLabel: "Yanıtla",
      dueAt: request.dueAt,
      createdAt: request.createdAt,
    });
    riskyCandidates.push({
      studentId: request.studentId,
      studentName: name,
      groupName: request.group.name,
      whyRisky: `Yardım istedi: ${checkInLabels.barrier[request.checkIn.barrier]}`,
      lastSignalAt: request.createdAt,
      lastSignalLabel: formatAttentionAge(request.createdAt, now),
      score: 40,
    });
  }

  for (const item of interventions) {
    const name = item.student.user.fullName || item.student.user.email;
    const student = rosterById.get(item.studentId);
    pending.push({
      kind: "INTERVENTION",
      id: item.id,
      title: name,
      detail: item.explanation,
      href: "/panel/ogretmen/mudahale",
      ctaLabel: "Müdahaleyi aç",
      dueAt: item.dueAt,
      createdAt: item.createdAt,
    });
    riskyCandidates.push({
      studentId: item.studentId,
      studentName: name,
      groupName: student?.groupName ?? "Grup",
      whyRisky: item.explanation,
      lastSignalAt: item.dueAt,
      lastSignalLabel: item.dueAt < now ? "Takip tarihi geçti" : formatAttentionAge(item.createdAt, now),
      score: 35,
    });
  }

  for (const submission of ungraded) {
    pending.push({
      kind: "UNGRADED_ASSIGNMENT",
      id: submission.id,
      title: submission.student.user.fullName || submission.student.user.email,
      detail: submission.assignment.title,
      href: "/panel/ogretmen/odevler",
      ctaLabel: "Değerlendir",
      dueAt: submission.submittedAt,
      createdAt: submission.submittedAt,
    });
  }

  for (const plan of pendingPlans) {
    pending.push({
      kind: "PLAN_APPROVAL",
      id: plan.id,
      title: plan.student.user.fullName || plan.student.user.email,
      detail: plan.status === "CHANGE_REQUESTED" ? "Değişiklik talebi bekliyor" : "Haftalık plan onayı bekliyor",
      href: "/panel/ogretmen/plan",
      ctaLabel: "Planı incele",
      dueAt: weekEnd,
      createdAt: plan.updatedAt,
    });
    upcoming.push({
      kind: "PLAN_DEADLINE",
      id: plan.id,
      title: plan.student.user.fullName || plan.student.user.email,
      detail: "Haftalık plan onayı",
      at: weekEnd,
      href: "/panel/ogretmen/plan",
    });
  }

  for (const row of reviewDue) {
    if (row._count._all < 1) continue;
    const student = rosterById.get(row.studentId);
    if (!student) continue;
    pending.push({
      kind: "REVIEW_QUEUE",
      id: row.studentId,
      title: student.name,
      detail: `${row._count._all} vadesi gelmiş tekrar öğesi`,
      href: "/panel/ogretmen/tekrar",
      ctaLabel: "Kuyruğu gör",
      dueAt: now,
      createdAt: now,
    });
    if (row._count._all >= 8) {
      riskyCandidates.push({
        studentId: student.id,
        studentName: student.name,
        groupName: student.groupName,
        whyRisky: `Tekrar kuyruğunda ${row._count._all} vadesi gelmiş öğe birikti.`,
        lastSignalAt: now,
        lastSignalLabel: "Bugün",
        score: 20 + Math.min(15, row._count._all),
      });
    }
  }

  for (const row of absences) {
    if (row._count._all < ATTENTION_ABSENT_THRESHOLD) continue;
    const student = rosterById.get(row.studentId);
    if (!student) continue;
    riskyCandidates.push({
      studentId: student.id,
      studentName: student.name,
      groupName: student.groupName,
      whyRisky: `Son ${ATTENTION_WINDOW_DAYS} günde ${row._count._all} ders kaçırdı.`,
      lastSignalAt: now,
      lastSignalLabel: "Son 14 gün",
      score: 20 + row._count._all * 5,
    });
  }

  for (const row of overdueAssignments) {
    if (row._count._all < ATTENTION_OVERDUE_ASSIGNMENT_THRESHOLD) continue;
    const student = rosterById.get(row.studentId);
    if (!student) continue;
    riskyCandidates.push({
      studentId: student.id,
      studentName: student.name,
      groupName: student.groupName,
      whyRisky: `${row._count._all} çalışma teslim tarihi geçti.`,
      lastSignalAt: now,
      lastSignalLabel: "Gecikmiş çalışma",
      score: 15 + row._count._all * 5,
    });
  }

  const examsByStudent = new Map<string, typeof exams>();
  for (const exam of exams) {
    const list = examsByStudent.get(exam.studentId) ?? [];
    list.push(exam);
    examsByStudent.set(exam.studentId, list);
  }
  for (const [studentId, list] of examsByStudent) {
    const ordered = [...list].sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
    if (ordered.length < 2) continue;
    const latest = examTotalNet(ordered[0].sections);
    const previous = examTotalNet(ordered[1].sections);
    const drop = previous - latest;
    if (drop < ATTENTION_EXAM_NET_DROP) continue;
    const student = rosterById.get(studentId);
    if (!student) continue;
    riskyCandidates.push({
      studentId,
      studentName: student.name,
      groupName: student.groupName,
      whyRisky: `Son iki denemede net ${previous.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} → ${latest.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}.`,
      lastSignalAt: ordered[0].takenAt,
      lastSignalLabel: formatAttentionAge(ordered[0].takenAt, now),
      score: 25 + Math.min(20, Math.round(drop)),
    });
  }

  for (const lesson of tomorrowLessons) {
    upcoming.push({
      kind: "TOMORROW_LESSON",
      id: lesson.id,
      title: lesson.title,
      detail: lesson.group.name,
      at: lesson.startsAt,
      href: `/panel/ogretmen/ders/${lesson.id}`,
    });
  }

  for (const exam of upcomingExams) {
    if (!exam.startsAt) continue;
    upcoming.push({
      kind: "EXAM",
      id: exam.id,
      title: exam.title,
      detail: exam.family,
      at: exam.startsAt,
      href: "/panel/ogretmen/denemeler",
    });
  }

  const riskByStudent = new Map<string, TeacherWorkspaceRiskSource>();
  for (const row of riskyCandidates) {
    const current = riskByStudent.get(row.studentId);
    if (!current || row.score > current.score) riskByStudent.set(row.studentId, row);
  }

  return buildTeacherWorkspace({
    now,
    todayLessons: todayLessonsRaw.map((lesson) => ({
      id: lesson.id,
      startsAt: lesson.startsAt,
      endsAt: lesson.endsAt,
      title: lesson.title,
      status: lesson.status,
      meetingUrl: lesson.meetingUrl,
      groupId: lesson.groupId,
      groupName: lesson.group.name,
      subject: lesson.group.subject,
      studentIds: lesson.group.enrollments.map((enrollment) => enrollment.studentId),
      hasGroupNote: lesson.notes.length > 0,
      materialCount: lesson._count.materials,
    })),
    pending,
    riskyStudents: [...riskByStudent.values()],
    upcoming,
  });
}
