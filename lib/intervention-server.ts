import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { buildHumanConcernSignal, buildInterventionSignals, buildStudentSupportEpisode, INTERVENTION_RULE_VERSION, interventionWindowStart } from "@/lib/intervention-rules";
import { mockExamTemplates, sectionNet } from "@/lib/mock-exams";

const DAY = 86_400_000;

function fingerprint(studentId: string, windowStart: Date) {
  return createHash("sha256").update(`${INTERVENTION_RULE_VERSION}:${studentId}:${windowStart.toISOString()}`).digest("hex");
}

function recentExamDrop(exams: { exam: keyof typeof mockExamTemplates; takenAt: Date; sections: { correctCount: number; incorrectCount: number }[] }[], now: Date) {
  const current = exams[0];
  if (!current || current.takenAt < new Date(now.getTime() - 14 * DAY)) return null;
  const previous = exams.slice(1).find((exam) => exam.exam === current.exam);
  if (!previous) return null;
  const totalNet = (exam: typeof current) => exam.sections.reduce((sum, section) => sum + sectionNet(exam.exam, section.correctCount, section.incorrectCount), 0);
  return { previousNet: totalNet(previous), currentNet: totalNet(current) };
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
      user: { select: { createdAt: true, lastLoginAt: true, sessions: { orderBy: { lastSeenAt: "desc" }, take: 1, select: { lastSeenAt: true } } } },
      attendances: { where: { lesson: { status: "COMPLETED", startsAt: { gte: attendanceSince, lte: now } } }, select: { status: true } },
      assignmentProgress: { where: { status: { not: "DONE" }, assignment: { isActive: true, dueAt: { gte: evidenceSince, lt: now } } }, select: { id: true } },
      reviewItems: { where: { status: "ACTIVE" }, select: { attempts: { where: { reviewedAt: { gte: evidenceSince }, response: { in: ["WRONG", "UNSURE"] } }, select: { id: true } } } },
      weeklyPlans: { where: { status: "APPROVED", weekStart: { gte: windowStart } }, select: { tasks: { where: { status: "PLANNED", scheduledFor: { lt: now } }, select: { id: true } } } },
      mockExams: { where: { takenAt: { gte: evidenceSince, lte: now } }, orderBy: { takenAt: "desc" }, take: 6, select: { exam: true, takenAt: true, sections: { select: { correctCount: true, incorrectCount: true } } } },
    },
  });

  const candidates = students.flatMap((student) => {
    const lastActivityAt = student.user.sessions[0]?.lastSeenAt || student.user.lastLoginAt || student.user.createdAt;
    const episode = buildStudentSupportEpisode(buildInterventionSignals({
      attendanceAbsentCount: student.attendances.filter((row) => row.status === "ABSENT").length,
      attendanceTotalCount: student.attendances.length,
      overdueWorkCount: student.assignmentProgress.length,
      repeatedDifficultyCount: student.reviewItems.filter((item) => item.attempts.length >= 3).length,
      stalledPlanTaskCount: student.weeklyPlans.reduce((sum, plan) => sum + plan.tasks.length, 0),
      recentExamDrop: recentExamDrop(student.mockExams, now),
      engagementGapDays: Math.max(0, Math.floor((now.getTime() - lastActivityAt.getTime()) / DAY)),
    }));
    return episode ? [{ studentId: student.id, episode, fingerprint: fingerprint(student.id, windowStart) }] : [];
  });

  return prisma.$transaction(async (tx) => {
    const expired = await tx.interventionCase.findMany({ where: { status: "SNOOZED", snoozedUntil: { lte: now }, ...(scope.teacherId ? { student: { enrollments: { some: { endedAt: null, group: { isActive: true, teacherId: scope.teacherId } } } } } : {}) }, select: { id: true } });
    for (const row of expired) {
      await tx.interventionCase.update({ where: { id: row.id }, data: { status: "OPEN", snoozedUntil: null, dueAt: new Date(now.getTime() + DAY), version: { increment: 1 }, activities: { create: { type: "REOPENED" } } } });
    }

    if (!candidates.length) return { created: [], triggered: [], reactivatedCount: expired.length, evaluatedStudentCount: students.length };
    const fingerprints = candidates.map((row) => row.fingerprint);
    const existing = await tx.interventionCase.findMany({ where: { fingerprint: { in: fingerprints } }, select: { fingerprint: true } });
    const existingFingerprints = new Set(existing.map((row) => row.fingerprint));
    const newCandidates = candidates.filter((candidate) => !existingFingerprints.has(candidate.fingerprint));
    if (newCandidates.length) await tx.interventionCase.createMany({
      data: newCandidates.map(({ studentId, episode, fingerprint: caseFingerprint }) => ({
        studentId,
        ruleVersion: INTERVENTION_RULE_VERSION,
        reasonCode: episode.primaryReasonCode,
        fingerprint: caseFingerprint,
        explanation: episode.explanation,
        suggestedAction: episode.suggestedAction,
        evidenceCount: episode.evidenceCount,
        windowStart,
        windowEnd: now,
        dueAt: new Date(now.getTime() + DAY),
      })),
      skipDuplicates: true,
    });
    const episodes = await tx.interventionCase.findMany({ where: { fingerprint: { in: fingerprints } }, include: { signals: true } });
    const candidatesByFingerprint = new Map(candidates.map((candidate) => [candidate.fingerprint, candidate]));
    const createdFingerprints = new Set(newCandidates.map((candidate) => candidate.fingerprint));
    const created = episodes.filter((row) => createdFingerprints.has(row.fingerprint));
    const triggered: { caseId: string; reasonCode: (typeof candidates)[number]["episode"]["signals"][number]["reasonCode"] }[] = [];
    for (const row of episodes) {
      const candidate = candidatesByFingerprint.get(row.fingerprint);
      if (!candidate) continue;
      const existingReasons = new Set(row.signals.map((signal) => signal.reasonCode));
      const newSignals = candidate.episode.signals.filter((signal) => !existingReasons.has(signal.reasonCode));
      if (!newSignals.length) continue;
      await tx.interventionCaseSignal.createMany({
        data: newSignals.map((signal) => ({ caseId: row.id, reasonCode: signal.reasonCode, explanation: signal.explanation, suggestedAction: signal.suggestedAction, evidenceCount: signal.evidenceCount })),
        skipDuplicates: true,
      });
      const combinedEpisode = buildStudentSupportEpisode([...row.signals, ...newSignals]);
      if (combinedEpisode) await tx.interventionCase.update({ where: { id: row.id }, data: { explanation: combinedEpisode.explanation, suggestedAction: combinedEpisode.suggestedAction, evidenceCount: combinedEpisode.evidenceCount, windowEnd: now } });
      triggered.push(...newSignals.map((signal) => ({ caseId: row.id, reasonCode: signal.reasonCode })));
    }
    if (created.length) {
      await tx.interventionCaseActivity.createMany({ data: created.map((row) => ({ caseId: row.id, type: "GENERATED" })) });
    }
    return {
      created: created.map((row) => ({ id: row.id })),
      triggered,
      reactivatedCount: expired.length,
      evaluatedStudentCount: students.length,
    };
  });
}

export async function raiseHumanConcern(input: { studentId: string; actorId: string; teacherId?: string }) {
  const student = await prisma.studentProfile.findFirst({
    where: {
      id: input.studentId,
      user: { status: "ACTIVE" },
      enrollments: { some: { endedAt: null, group: { isActive: true, ...(input.teacherId ? { teacherId: input.teacherId } : {}) } } },
    },
    select: { id: true },
  });
  if (!student) return { kind: "NOT_FOUND" as const };

  const now = new Date();
  const windowStart = interventionWindowStart(now);
  const caseFingerprint = fingerprint(student.id, windowStart);
  const signal = buildHumanConcernSignal();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.interventionCase.findUnique({ where: { fingerprint: caseFingerprint }, include: { signals: true } });
    if (!existing) {
      const episode = buildStudentSupportEpisode([signal])!;
      const created = await tx.interventionCase.create({
        data: {
          studentId: student.id,
          ruleVersion: INTERVENTION_RULE_VERSION,
          reasonCode: signal.reasonCode,
          fingerprint: caseFingerprint,
          explanation: episode.explanation,
          suggestedAction: episode.suggestedAction,
          evidenceCount: episode.evidenceCount,
          windowStart,
          windowEnd: now,
          dueAt: new Date(now.getTime() + DAY),
          signals: { create: signal },
          activities: { create: [{ type: "GENERATED" }, { type: "HUMAN_CONCERN_RAISED", actorId: input.actorId }] },
        },
        select: { id: true },
      });
      return { kind: "CREATED" as const, caseId: created.id, reasonCode: signal.reasonCode };
    }

    if (existing.signals.some((row) => row.reasonCode === signal.reasonCode)) return { kind: "EXISTS" as const, caseId: existing.id };
    const episode = buildStudentSupportEpisode([...existing.signals, signal])!;
    const wasClosed = existing.status === "RESOLVED" || existing.status === "FALSE_POSITIVE";
    await tx.interventionCase.update({
      where: { id: existing.id },
      data: {
        explanation: episode.explanation,
        suggestedAction: episode.suggestedAction,
        evidenceCount: episode.evidenceCount,
        windowEnd: now,
        version: { increment: 1 },
        ...(wasClosed ? { status: "OPEN", resolvedAt: null, outcomeCode: null, dueAt: new Date(now.getTime() + DAY) } : {}),
        signals: { create: signal },
        activities: { create: [...(wasClosed ? [{ type: "REOPENED" as const, actorId: input.actorId }] : []), { type: "HUMAN_CONCERN_RAISED", actorId: input.actorId }] },
      },
    });
    return { kind: "ADDED" as const, caseId: existing.id, reasonCode: signal.reasonCode };
  });
}
