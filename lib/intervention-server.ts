import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  buildInterventionEpisodeKey,
  buildInterventionSignals,
  INTERVENTION_RULE_VERSION,
  interventionEvaluationWindow,
  type InterventionReasonCode,
} from "@/lib/intervention-rules";

const DAY = 86_400_000;

function fingerprint(studentId: string, episodeKey: string) {
  return createHash("sha256").update(`${INTERVENTION_RULE_VERSION}:${studentId}:${episodeKey}`).digest("hex");
}

export async function generateInterventionEpisodes(scope: { teacherId?: string }) {
  const now = new Date();
  const { windowStart, attendanceSince, evidenceSince } = interventionEvaluationWindow(now);

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

  const candidateEpisodes = students.flatMap((student) => {
    const signals = buildInterventionSignals({
      attendanceAbsentCount: student.attendances.filter((row) => row.status === "ABSENT").length,
      attendanceTotalCount: student.attendances.length,
      overdueWorkCount: student.assignmentProgress.length,
      repeatedDifficultyCount: student.reviewItems.filter((item) => item.attempts.length >= 3).length,
      stalledPlanTaskCount: student.weeklyPlans.reduce((sum, plan) => sum + plan.tasks.length, 0),
    });
    if (!signals.length) return [];
    const episodeKey = buildInterventionEpisodeKey(student.id, now);
    return [{
      studentId: student.id,
      episodeKey,
      signals,
      windowStart,
      fingerprint: fingerprint(student.id, episodeKey),
    }];
  });

  return prisma.$transaction(async (tx) => {
    const expired = await tx.interventionCase.findMany({
      where: {
        status: "SNOOZED",
        snoozedUntil: { lte: now },
        ...(scope.teacherId ? { student: { enrollments: { some: { endedAt: null, group: { isActive: true, teacherId: scope.teacherId } } } } } : {}),
      },
      select: { id: true },
    });
    for (const row of expired) {
      await tx.interventionCase.update({ where: { id: row.id }, data: { status: "OPEN", snoozedUntil: null, dueAt: new Date(now.getTime() + DAY), version: { increment: 1 }, activities: { create: { type: "REOPENED" } } } });
    }

    const created: Array<{ id: string; reasonCode: InterventionReasonCode }> = [];
    for (const episode of candidateEpisodes) {
      const existing = await tx.interventionCase.findFirst({
        where: { fingerprint: episode.fingerprint },
        select: { id: true, status: true, version: true },
      });
      if (existing) {
        const activeSignal = episode.signals[0];
        await tx.interventionCase.update({
          where: { id: existing.id },
          data: {
            status: existing.status === "FALSE_POSITIVE" ? "OPEN" : existing.status,
            dueAt: new Date(now.getTime() + DAY),
            evidenceCount: episode.signals.reduce((sum, signal) => sum + signal.evidenceCount, 0),
            explanation: episode.signals.map((signal) => signal.explanation).join(" · "),
            suggestedAction: episode.signals[0].suggestedAction,
            version: { increment: 1 },
            activities: { create: episode.signals.map((signal) => ({ type: "GENERATED", note: `${signal.type}: ${signal.explanation}` })) },
          },
        });
        created.push({ id: existing.id, reasonCode: activeSignal.reasonCode });
        continue;
      }

      const primarySignal = episode.signals[0];
      const caseRow = await tx.interventionCase.create({
        data: {
          studentId: episode.studentId,
          ruleVersion: INTERVENTION_RULE_VERSION,
          reasonCode: "ATTENDANCE_PATTERN",
          fingerprint: episode.fingerprint,
          explanation: episode.signals.map((signal) => signal.explanation).join(" · "),
          suggestedAction: episode.signals.map((signal) => signal.suggestedAction).join(" · "),
          evidenceCount: episode.signals.reduce((sum, signal) => sum + signal.evidenceCount, 0),
          windowStart: episode.windowStart,
          windowEnd: now,
          dueAt: new Date(now.getTime() + DAY),
          activities: { create: episode.signals.map((signal) => ({ type: "GENERATED", note: `${signal.type}: ${signal.explanation}` })) },
        },
        select: { id: true },
      });
      created.push({ id: caseRow.id, reasonCode: primarySignal.reasonCode });
    }

    return { created, reactivatedCount: expired.length, evaluatedStudentCount: students.length, episodesCreated: candidateEpisodes.length };
  });
}
