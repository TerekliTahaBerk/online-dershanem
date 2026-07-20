import "server-only";

import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateOdkPilotReadiness } from "@/lib/odk/pilot-rollout";

export async function getOdkPilotReadiness(roles: UserRole[]) {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 2 * 60 * 1000);
  const [readyExamCount, staleAttemptCount, unscoredEndedExamCount] = await Promise.all([
    prisma.odkExam.count({ where: { status: { in: ["READY", "SCHEDULED", "LIVE"] }, currentVersion: { is: { status: "LOCKED" } } } }),
    prisma.odkExamAttempt.count({ where: { status: "IN_PROGRESS", lastActivityAt: { lt: staleBefore }, deadlineAt: { gt: now } } }),
    prisma.odkExam.count({ where: { status: "ENDED", attempts: { some: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, score: null } } } }),
  ]);
  return calculateOdkPilotReadiness({ roles, snapshot: { readyExamCount, staleAttemptCount, unscoredEndedExamCount, lifecycleCronConfigured: Boolean(process.env.CRON_SECRET), privateStorageConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN) } });
}
