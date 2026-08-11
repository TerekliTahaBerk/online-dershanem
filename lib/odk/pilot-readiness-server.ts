import "server-only";

import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateOdkPilotReadiness } from "@/lib/odk/pilot-rollout";

type PilotMember = { role: UserRole; userId?: string };

export async function getOdkPilotReadiness(members: PilotMember[], pilotStartedAt?: Date | null) {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 2 * 60 * 1000);
  const pilotStudentIds = members.filter((member) => member.role === "STUDENT" && member.userId).map((member) => member.userId!);
  const [readyExamCount, staleAttemptCount, unscoredEndedExamCount, completedAttempts] = await Promise.all([
    prisma.odkExam.count({ where: { status: { in: ["READY", "SCHEDULED", "LIVE"] }, currentVersion: { is: { status: "LOCKED" } } } }),
    prisma.odkExamAttempt.count({ where: { status: "IN_PROGRESS", lastActivityAt: { lt: staleBefore }, deadlineAt: { gt: now } } }),
    prisma.odkExam.count({ where: { status: "ENDED", attempts: { some: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, score: null } } } }),
    pilotStudentIds.length && pilotStartedAt ? prisma.odkExamAttempt.findMany({
      where: { studentUserId: { in: pilotStudentIds }, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, score: { isNot: null }, exam: { status: "RELEASED", resultsReleasedAt: { gte: pilotStartedAt } } },
      select: { examId: true, studentUserId: true },
    }) : Promise.resolve([]),
  ]);
  const studentsByExam = new Map<string, Set<string>>();
  for (const attempt of completedAttempts) {
    const students = studentsByExam.get(attempt.examId) || new Set<string>();
    students.add(attempt.studentUserId);
    studentsByExam.set(attempt.examId, students);
  }
  const qualifyingExams = [...studentsByExam.values()].filter((students) => students.size >= 2);
  const completedPilotStudents = new Set(completedAttempts.map((attempt) => attempt.studentUserId));
  return calculateOdkPilotReadiness({
    roles: members.map((member) => member.role),
    snapshot: {
      readyExamCount,
      staleAttemptCount,
      unscoredEndedExamCount,
      completedPilotExamCount: qualifyingExams.length,
      completedPilotStudentCount: completedPilotStudents.size,
      lifecycleCronConfigured: Boolean(process.env.CRON_SECRET),
      privateStorageConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    },
  });
}
