import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { buildInterventionSignals, INTERVENTION_RULE_VERSION, interventionWindowStart, type InterventionReasonCode } from "@/lib/intervention-rules";

const DAY = 86_400_000;

function fingerprint(studentId: string, reasonCode: InterventionReasonCode, windowStart: Date) {
  return createHash("sha256").update(`${INTERVENTION_RULE_VERSION}:${studentId}:${reasonCode}:${windowStart.toISOString()}`).digest("hex");
}

export async function generateInterventionCases(scope: { teacherId?: string }) {
  const now = new Date();
  const windowStart = interventionWindowStart(now);
  const attendanceSince = new Date(now.getTime() - 14 * DAY);
  const evidenceSince = new Date(now.getTime() - 30 * DAY);

  const students = await prisma.studentProfile.findMany({
    where: {
      user: { status: "ACTIVE" },
      enrollments: { some: { endedAt: null, group: { isActive: true, ...(scope.teacherId ? { teacherId: scope.teacherId } : {}) } } },
    },
    select: {
      id: true,
      attendances: { where: { lesson: { status: "COMPLETED", startsAt: { gte: attendanceSince, lte: now } } }, select: { status: true } },
      assignmentProgress: { where: { status: { not: "DONE" }, assignment: { isActive: true, dueAt: { gte: evidenceSince, lt: now } } }, select: { id: true } },
      reviewItems: { where: { status: "ACTIVE" }, select: { attempts: { where: { reviewedAt: { gte: evidenceSince }, response: { in: ["WRONG", "UNSURE"] } }, select: { id: true } } } },
      weeklyPlans: { where: { status: "APPROVED", weekStart: { gte: windowStart } }, select: { tasks: { where: { status: "PLANNED", scheduledFor: { lt: now } }, select: { id: true } } } },
    },
  });

  const candidates = students.flatMap((student) => buildInterventionSignals({
    attendanceAbsentCount: student.attendances.filter((row) => row.status === "ABSENT").length,
    attendanceTotalCount: student.attendances.length,
    overdueWorkCount: student.assignmentProgress.length,
    repeatedDifficultyCount: student.reviewItems.filter((item) => item.attempts.length >= 3).length,
    stalledPlanTaskCount: student.weeklyPlans.reduce((sum, plan) => sum + plan.tasks.length, 0),
  }).map((signal) => ({ studentId: student.id, signal, fingerprint: fingerprint(student.id, signal.reasonCode, windowStart) })));

  return prisma.$transaction(async (tx) => {
    const expired = await tx.interventionCase.findMany({ where: { status: "SNOOZED", snoozedUntil: { lte: now }, ...(scope.teacherId ? { student: { enrollments: { some: { endedAt: null, group: { isActive: true, teacherId: scope.teacherId } } } } } : {}) }, select: { id: true } });
    for (const row of expired) {
      await tx.interventionCase.update({ where: { id: row.id }, data: { status: "OPEN", snoozedUntil: null, dueAt: new Date(now.getTime() + DAY), version: { increment: 1 }, activities: { create: { type: "REOPENED" } } } });
    }

    if (!candidates.length) return { created: [], reactivatedCount: expired.length, evaluatedStudentCount: students.length };
    const runStartedAt = new Date();
    await tx.interventionCase.createMany({
      data: candidates.map(({ studentId, signal, fingerprint: caseFingerprint }) => ({
        studentId,
        ruleVersion: INTERVENTION_RULE_VERSION,
        reasonCode: signal.reasonCode,
        fingerprint: caseFingerprint,
        explanation: signal.explanation,
        suggestedAction: signal.suggestedAction,
        evidenceCount: signal.evidenceCount,
        windowStart,
        windowEnd: now,
        dueAt: new Date(now.getTime() + DAY),
      })),
      skipDuplicates: true,
    });
    const created = await tx.interventionCase.findMany({ where: { fingerprint: { in: candidates.map((row) => row.fingerprint) }, createdAt: { gte: runStartedAt } }, select: { id: true, reasonCode: true } });
    if (created.length) await tx.interventionCaseActivity.createMany({ data: created.map((row) => ({ caseId: row.id, type: "GENERATED" })) });
    return { created, reactivatedCount: expired.length, evaluatedStudentCount: students.length };
  });
}
