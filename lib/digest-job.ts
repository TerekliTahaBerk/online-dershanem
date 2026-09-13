import "server-only";
import { prisma } from "@/lib/prisma";
import { generateCalmDigest } from "@/lib/calm-weekly-digest-server";
import { reportOperationalAlert } from "@/lib/error-capture";

export const DIGEST_JOB_TYPE = "weekly_digest_batch";
const DEFAULT_BATCH_SIZE = 25;

export type DigestJobPayload = {
  teacherId: string;
  studentIds: string[];
};

export async function enqueueDigestJob(payload: DigestJobPayload) {
  return prisma.backgroundJob.create({
    data: {
      type: DIGEST_JOB_TYPE,
      idempotencyKey: `${DIGEST_JOB_TYPE}:${payload.teacherId}:${payload.studentIds.slice().sort().join(",")}`,
      payload,
      priority: 50,
      maxAttempts: 3,
    },
  });
}

export async function runDigestBatchJob(jobId: string) {
  const job = await prisma.backgroundJob.findUnique({ where: { id: jobId } });
  if (!job || job.type !== DIGEST_JOB_TYPE || job.status !== "PENDING") return null;

  const payload = job.payload as DigestJobPayload;
  await prisma.backgroundJob.update({ where: { id: jobId }, data: { status: "PROCESSING" } });

  const results: Array<{ studentId: string; reused: boolean }> = [];
  let failedCount = 0;

  for (const studentId of payload.studentIds.slice(0, DEFAULT_BATCH_SIZE)) {
    try {
      const result = await generateCalmDigest(studentId, payload.teacherId);
      results.push({ studentId, reused: result.reused });
    } catch (error) {
      failedCount += 1;
      await prisma.backgroundJob.update({
        where: { id: jobId },
        data: { lastErrorCode: error instanceof Error ? error.name : "DIGEST_JOB_ERROR" },
      });
      await reportOperationalAlert({
        event: "weekly_digest.batch_item_failed",
        severity: "warning",
        summary: "Haftalık özet batch öğesi başarısız oldu",
        context: { jobId, studentId, teacherId: payload.teacherId, errorCode: error instanceof Error ? error.name : "DIGEST_JOB_ERROR" },
      });
    }
  }

  await prisma.backgroundJob.update({
    where: { id: jobId },
    data: {
      status: failedCount === 0 ? "SUCCEEDED" : "FAILED",
      completedAt: new Date(),
      payload: { ...payload, results },
    },
  });

  if (failedCount > 0) {
    await reportOperationalAlert({
      event: "weekly_digest.batch_failed",
      severity: failedCount >= Math.ceil(results.length / 2) ? "critical" : "warning",
      summary: "Haftalık özet batch tamamlanırken hatalar oluştu",
      context: { jobId, processedCount: results.length, failedCount, teacherId: payload.teacherId },
    });
  }

  return { results, failedCount, processedCount: results.length };
}

export async function runDigestJobsForTeacher(teacherId: string) {
  const students = await prisma.studentProfile.findMany({
    where: { enrollments: { some: { endedAt: null, group: { isActive: true, teacherId } } } },
    select: { id: true },
  });

  const job = await enqueueDigestJob({ teacherId, studentIds: students.map((student) => student.id) });
  return runDigestBatchJob(job.id);
}
