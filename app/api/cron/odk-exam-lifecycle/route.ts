import { prisma } from "@/lib/prisma";
import { logAuditMany } from "@/lib/audit";
import { runJob } from "@/lib/jobs/runner";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  return runJob("odk-exam-lifecycle", request, async () => {
    const now = new Date();
    const [liveExams, endedExams, expiredAttempts] = await Promise.all([
      prisma.odkExam.findMany({ where: { status: "SCHEDULED", startsAt: { lte: now }, endsAt: { gt: now } }, select: { id: true }, take: 500 }),
      prisma.odkExam.findMany({ where: { status: { in: ["SCHEDULED", "LIVE"] }, endsAt: { lte: now } }, select: { id: true }, take: 500 }),
      prisma.odkExamAttempt.findMany({ where: { status: "IN_PROGRESS", deadlineAt: { lte: now } }, select: { id: true }, take: 1000 }),
    ]);
    await prisma.$transaction([
      prisma.odkExam.updateMany({ where: { id: { in: liveExams.map((item) => item.id) }, status: "SCHEDULED" }, data: { status: "LIVE" } }),
      prisma.odkExam.updateMany({ where: { id: { in: endedExams.map((item) => item.id) }, status: { in: ["SCHEDULED", "LIVE"] } }, data: { status: "ENDED" } }),
      prisma.odkExamAttempt.updateMany({ where: { id: { in: expiredAttempts.map((item) => item.id) }, status: "IN_PROGRESS" }, data: { status: "AUTO_SUBMITTED", submittedAt: now, lastActivityAt: now } }),
    ]);
    await logAuditMany([
      ...liveExams.map((item) => ({ actorType: "SYSTEM" as const, entityType: "OdkExam", entityId: item.id, action: "odk.exam_live", summary: "Deneme başlangıç saatinde canlı duruma alındı" })),
      ...endedExams.map((item) => ({ actorType: "SYSTEM" as const, entityType: "OdkExam", entityId: item.id, action: "odk.exam_ended", summary: "Deneme bitiş saatinde sona erdirildi" })),
      ...expiredAttempts.map((item) => ({ actorType: "SYSTEM" as const, entityType: "OdkExamAttempt", entityId: item.id, action: "odk.attempt_auto_submitted", summary: "Süresi dolan öğrenci oturumu otomatik teslim edildi" })),
    ]);
    const result = { live: liveExams.length, ended: endedExams.length, autoSubmitted: expiredAttempts.length };
    log.info("odk.lifecycle.completed", result);
    return result;
  }, { metrics: (result) => ({ processedCount: result.live + result.ended + result.autoSubmitted }) });
}
