import "server-only";

import type { ProductCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { netScore } from "@/lib/goals";
import { istanbulWeekStart } from "@/lib/istanbul-time";
import type { GroupLearningGap, OutcomeProfileRow, StudentProgressSummary, TeacherLearningSignal, UnifiedTimelineEntry } from "@/lib/student-success/types";
import { OUTCOME_MASTERY_LABELS } from "@/lib/student-success/types";
import { getStudentProducts } from "@/lib/student-success/server/event-processor";

export async function getStudentProgressSummary(input: {
  studentId: string;
  studentUserId: string;
  now?: Date;
}): Promise<StudentProgressSummary> {
  const now = input.now ?? new Date();
  const products = await getStudentProducts(input.studentUserId);
  const weekStart = istanbulWeekStart(now);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);

  const [attendanceRows, assignmentRows, planTasks, masteryRows, mockExams, odkAttempts] = await Promise.all([
    prisma.attendance.findMany({
      where: { studentId: input.studentId, lesson: { startsAt: { gte: twoWeeksAgo } } },
      select: { status: true },
    }),
    prisma.assignmentProgress.findMany({
      where: { studentId: input.studentId, assignment: { isActive: true, dueAt: { gte: twoWeeksAgo } } },
      select: { status: true },
    }),
    products.includes("OK")
      ? prisma.weeklyPlanTask.findMany({
          where: { plan: { studentId: input.studentId, weekStart, status: "APPROVED" }, status: { not: "SKIPPED" } },
          select: { status: true },
        })
      : Promise.resolve([]),
    prisma.studentOutcomeMastery.findMany({
      where: { studentId: input.studentId },
      select: { status: true },
    }),
    prisma.mockExam.findMany({
      where: { studentId: input.studentId },
      orderBy: { takenAt: "desc" },
      take: 6,
      select: { title: true, takenAt: true, sections: { select: { correctCount: true, incorrectCount: true } } },
    }),
    products.includes("ODK")
      ? prisma.odkExamAttempt.findMany({
          where: { studentUserId: input.studentUserId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, score: { isNot: null } },
          orderBy: { submittedAt: "desc" },
          take: 3,
          select: { exam: { select: { title: true } }, score: { select: { totalNet: true } } },
        })
      : Promise.resolve([]),
  ]);

  const attendanceTotal = attendanceRows.length;
  const attendancePresent = attendanceRows.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
  const assignmentTotal = assignmentRows.length;
  const assignmentDone = assignmentRows.filter((r) => r.status === "DONE").length;
  const planTotal = planTasks.length;
  const planDone = planTasks.filter((t) => t.status === "DONE" || t.status === "PARTIAL").length;

  const needsReview = masteryRows.filter((m) => m.status === "NEEDS_REVIEW").length;
  const mastered = masteryRows.filter((m) => m.status === "MASTERED").length;

  let latestExamTrend: StudentProgressSummary["latestExamTrend"] = null;
  if (mockExams.length >= 2) {
    const nets = mockExams.map((exam) =>
      exam.sections.reduce((sum, s) => sum + netScore(s.correctCount, s.incorrectCount), 0),
    );
    latestExamTrend = {
      netDelta: nets[0] - nets[1],
      examTitle: mockExams[0].title ?? mockExams[0].takenAt.toISOString().slice(0, 10),
    };
  } else if (odkAttempts.length >= 2 && odkAttempts[0].score && odkAttempts[1].score) {
    latestExamTrend = {
      netDelta: Number(odkAttempts[0].score.totalNet) - Number(odkAttempts[1].score.totalNet),
      examTitle: odkAttempts[0].exam.title,
    };
  }

  const risks: string[] = [];
  if (attendanceTotal > 0 && attendancePresent / attendanceTotal < 0.7) {
    risks.push("Son 2 haftada ders katılımı düşük.");
  }
  if (assignmentTotal > 0 && assignmentDone / assignmentTotal < 0.6) {
    risks.push("Ödev tamamlama oranı düşük.");
  }
  if (planTotal > 0 && planDone / planTotal < 0.5) {
    risks.push("Plan uyumu düşük.");
  }
  if (needsReview >= 3) {
    risks.push(`${needsReview} kazanımda tekrar gerekiyor.`);
  }

  const nextActions: string[] = [];
  if (needsReview > 0) nextActions.push("Tekrar gereken kazanımlara odaklan.");
  if (assignmentTotal > assignmentDone) nextActions.push("Bekleyen ödevleri tamamla.");
  if (planTotal > planDone && products.includes("OK")) nextActions.push("Haftalık plan görevlerini tamamla.");

  return {
    studentId: input.studentId,
    computedAt: now,
    products,
    attendance: {
      percent: attendanceTotal ? (attendancePresent / attendanceTotal) * 100 : null,
      numerator: attendancePresent,
      denominator: attendanceTotal,
    },
    assignmentCompletion: {
      percent: assignmentTotal ? (assignmentDone / assignmentTotal) * 100 : null,
      numerator: assignmentDone,
      denominator: assignmentTotal,
    },
    coachingPlanCompletion: {
      percent: planTotal ? (planDone / planTotal) * 100 : null,
      numerator: planDone,
      denominator: planTotal,
    },
    latestExamTrend,
    outcomeSummary: { needsReview, mastered, total: masteryRows.length },
    risks,
    nextActions,
  };
}

export async function getStudentOutcomeProfile(studentId: string): Promise<OutcomeProfileRow[]> {
  const masteryRows = await prisma.studentOutcomeMastery.findMany({
    where: { studentId },
    include: {
      outcome: {
        select: {
          id: true,
          code: true,
          title: true,
          unit: { select: { name: true, subject: { select: { name: true } } } },
        },
      },
    },
    orderBy: { computedAt: "desc" },
    take: 100,
  });

  const evidence = await prisma.studentProgressEvidence.findMany({
    where: { studentId },
    orderBy: { occurredAt: "desc" },
    take: 500,
  });

  return masteryRows.map((row) => {
    const outcomeEvidence = evidence.filter((e) => e.outcomeId === row.outcomeId);
    const lesson = outcomeEvidence.find((e) => e.sourceType === "LESSON");
    const assignment = outcomeEvidence.find((e) => e.sourceType === "ASSIGNMENT");
    const mockExam = outcomeEvidence.find((e) => e.sourceType === "MOCK_EXAM");
    const coaching = outcomeEvidence.find((e) => e.sourceType === "COACHING_TASK");

    const explanation = Array.isArray(row.explanation)
      ? (row.explanation as Array<{ source: string; detail: string }>)
      : [];

    return {
      outcomeId: row.outcomeId,
      code: row.outcome.code,
      title: row.outcome.title,
      subjectName: row.outcome.unit.subject.name,
      unitName: row.outcome.unit.name,
      status: row.status,
      statusLabel: OUTCOME_MASTERY_LABELS[row.status],
      lastWorkedAt: outcomeEvidence[0]?.occurredAt ?? null,
      explanation,
      evidence: {
        lesson: lesson?.summary ?? null,
        assignment: assignment?.summary ?? null,
        mockExam: mockExam?.summary ?? null,
        coaching: coaching?.summary ?? null,
      },
    };
  });
}

export async function getUnifiedActivityTimeline(
  studentId: string,
  limit = 50,
): Promise<UnifiedTimelineEntry[]> {
  const [timelineEvents, crossEvents] = await Promise.all([
    prisma.studentTimelineEvent.findMany({
      where: { studentId },
      orderBy: { occurredAt: "desc" },
      take: limit,
      select: { id: true, occurredAt: true, title: true, summary: true, kind: true, metadata: true },
    }),
    prisma.crossProductEventOutbox.findMany({
      where: { studentId, status: "PROCESSED" },
      orderBy: { occurredAt: "desc" },
      take: limit,
      select: { id: true, eventType: true, occurredAt: true, entityType: true },
    }),
  ]);

  const productMap: Partial<Record<string, ProductCode>> = {
    LESSON_COMPLETED: "OD",
    LESSON_MISSED: "OD",
    ASSIGNMENT_CREATED: "OD",
    ASSIGNMENT_COMPLETED: "OD",
    COACHING_PLAN_PUBLISHED: "OK",
    COACHING_TASK_COMPLETED: "OK",
    MOCK_EXAM_RESULT_PUBLISHED: "ODK",
  };

  const fromCross: UnifiedTimelineEntry[] = crossEvents.map((e) => ({
    id: e.id,
    occurredAt: e.occurredAt,
    title: e.eventType.replace(/_/g, " ").toLowerCase(),
    summary: e.entityType,
    product: productMap[e.eventType] ?? null,
    productLabel: productMap[e.eventType]
      ? { OD: "Dershanem", OK: "Koçum", ODK: "Deneme Kulübü" }[productMap[e.eventType]!]
      : null,
    kind: e.eventType,
  }));

  const fromTimeline: UnifiedTimelineEntry[] = timelineEvents.map((e) => ({
    id: e.id,
    occurredAt: e.occurredAt,
    title: e.title,
    summary: e.summary,
    product: null,
    productLabel: null,
    kind: e.kind,
  }));

  return [...fromCross, ...fromTimeline]
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, limit);
}

export async function getTeacherLearningSignals(input: {
  studentId: string;
  now?: Date;
}): Promise<TeacherLearningSignal[]> {
  const twoWeeksAgo = new Date((input.now ?? new Date()).getTime() - 14 * 86400000);

  const masteryRows = await prisma.studentOutcomeMastery.findMany({
    where: { studentId: input.studentId, status: "NEEDS_REVIEW" },
    include: {
      outcome: {
        select: { id: true, title: true, unit: { select: { name: true, subject: { select: { name: true } } } } },
      },
    },
    take: 10,
  });

  const signals: TeacherLearningSignal[] = [];
  for (const row of masteryRows) {
    const [coachingMissed, mockWrong] = await Promise.all([
      prisma.weeklyPlanTask.count({
        where: {
          plan: { studentId: input.studentId },
          status: { in: ["PLANNED", "COULD_NOT"] },
          scheduledFor: { gte: twoWeeksAgo },
          OR: [
            { topic: { contains: row.outcome.title, mode: "insensitive" } },
            { title: { contains: row.outcome.title, mode: "insensitive" } },
          ],
        },
      }),
      prisma.studentProgressEvidence.findFirst({
        where: { studentId: input.studentId, outcomeId: row.outcomeId, sourceType: "MOCK_EXAM" },
        orderBy: { occurredAt: "desc" },
        select: { metrics: true },
      }),
    ]);

    const signalLines: string[] = [];
    if (coachingMissed >= 2) signalLines.push(`${coachingMissed} plan görevi eksik`);
    if (mockWrong?.metrics && typeof mockWrong.metrics === "object") {
      const m = mockWrong.metrics as Record<string, number>;
      if (m.questionCount && m.correctCount !== undefined) {
        const wrong = m.questionCount - m.correctCount;
        if (wrong > 0) signalLines.push(`${wrong} deneme sorusu yanlış`);
      }
    }

    signals.push({
      outcomeId: row.outcomeId,
      outcomeTitle: row.outcome.title,
      subjectName: row.outcome.unit.subject.name,
      unitName: row.outcome.unit.name,
      studentCount: 1,
      needsReviewCount: 1,
      signals: signalLines,
      suggestion: "Bir sonraki derste bu kazanımı tekrar ele al.",
    });
  }
  return signals;
}

export async function getGroupLearningGaps(groupId: string): Promise<GroupLearningGap[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { groupId, endedAt: null },
    select: { studentId: true },
  });
  const studentIds = enrollments.map((e) => e.studentId);
  if (!studentIds.length) return [];

  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } });
  if (!group) return [];

  const masteryRows = await prisma.studentOutcomeMastery.findMany({
    where: { studentId: { in: studentIds }, status: "NEEDS_REVIEW" },
    include: { outcome: { select: { id: true, title: true } } },
  });

  const byOutcome = new Map<string, { title: string; count: number }>();
  for (const row of masteryRows) {
    const current = byOutcome.get(row.outcomeId) ?? { title: row.outcome.title, count: 0 };
    current.count += 1;
    byOutcome.set(row.outcomeId, current);
  }

  return [...byOutcome.entries()]
    .filter(([, v]) => v.count >= 3)
    .map(([outcomeId, v]) => ({
      groupId,
      groupName: group.name,
      outcomeId,
      outcomeTitle: v.title,
      studentCount: studentIds.length,
      needsReviewCount: v.count,
      suggestion: "Grup tekrar dersi değerlendir.",
    }));
}
