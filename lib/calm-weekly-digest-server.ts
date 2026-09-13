import "server-only";
import { prisma } from "@/lib/prisma";
import { buildCalmWeeklyDigest, CALM_DIGEST_RULE_VERSION, digestWeekWindow } from "@/lib/calm-weekly-digest";
import { enqueueDigestJob, runDigestBatchJob } from "@/lib/digest-job";

export async function generateCalmDigest(studentId: string, generatedById: string) {
  const now = new Date();
  const { weekStart, previousWeekStart: previousStart, weekEnd } = digestWeekWindow(now);
  const existing = await prisma.weeklyDigest.findFirst({ where: { studentId, weekStart: { gte: weekStart, lt: weekEnd } }, orderBy: { weekStart: "asc" } });
  if (existing?.status === "PUBLISHED") return { digest: existing, reused: true };
  const [attendance, completedTasks, evidence, review, existingPublished] = await Promise.all([
    prisma.attendance.findMany({ where: { studentId, lesson: { startsAt: { gte: previousStart, lt: weekEnd }, status: "COMPLETED" } }, select: { status: true, lesson: { select: { startsAt: true } } } }),
    prisma.weeklyPlanTask.count({ where: { status: "DONE", completedAt: { gte: weekStart }, plan: { studentId } } }),
    prisma.lessonOutcome.findMany({ where: { lesson: { status: "COMPLETED", startsAt: { gte: weekStart }, attendances: { some: { studentId, status: { in: ["PRESENT", "LATE"] } } } } }, orderBy: { createdAt: "desc" }, take: 8, select: { outcome: { select: { title: true } } } }),
    prisma.reviewItem.findFirst({ where: { studentId, status: "ACTIVE" }, orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }], select: { title: true } }),
   prisma.weeklyDigest.findMany({ where: { studentId, weekStart: { gte: weekStart, lt: weekEnd }, status: "PUBLISHED" }, select: { id: true } }),
  ]);
  const summarize = (from: Date, to: Date) => {
   const rows = attendance.filter((item) => item.lesson.startsAt >= from && item.lesson.startsAt < to);
   return { total: rows.length, attended: rows.filter((item) => item.status === "PRESENT" || item.status === "LATE").length };
  };
  const content = buildCalmWeeklyDigest({ currentAttendance: summarize(weekStart, weekEnd), previousAttendance: summarize(previousStart, weekStart), completedTaskCount: completedTasks, evidenceTitles: evidence.map((item) => item.outcome.title), reviewTitle: review?.title, dataThrough: now });
  const digest = existing
   ? await prisma.weeklyDigest.update({ where: { id: existing.id }, data: { ruleVersion: CALM_DIGEST_RULE_VERSION, generatedById, ...content, version: { increment: 1 } } })
   : await prisma.weeklyDigest.create({ data: { studentId, weekStart, ruleVersion: CALM_DIGEST_RULE_VERSION, generatedById, ...content } });
  return { digest, reused: existingPublished.length > 0 };
}

export async function queueCalmDigestBatch(teacherId: string) {
  const students = await prisma.studentProfile.findMany({
    where: { enrollments: { some: { endedAt: null, group: { isActive: true, teacherId } } } },
    select: { id: true },
  });
  return enqueueDigestJob({ teacherId, studentIds: students.map((student) => student.id) });
}

export async function refreshQueuedCalmDigestBatch(jobId: string) {
  return runDigestBatchJob(jobId);
}
