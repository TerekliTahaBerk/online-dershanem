import "server-only";
import type { PrismaClient } from "@prisma/client";
import { GroupMutationError } from "@/lib/panel/group-mutation-core";
import { prisma } from "@/lib/prisma";
import { buildCalmWeeklyDigest, CALM_DIGEST_RULE_VERSION, digestWeekWindow } from "@/lib/calm-weekly-digest";
import { enqueueDigestJob, runDigestBatchJob } from "@/lib/digest-job";

export async function generateCalmDigest(studentId: string, generatedById: string, db: PrismaClient = prisma) {
  const now = new Date();
  const { weekStart, previousWeekStart: previousStart, weekEnd } = digestWeekWindow(now);
  const existing = await db.weeklyDigest.findFirst({ where: { studentId, weekStart: { gte: weekStart, lt: weekEnd } }, orderBy: { weekStart: "asc" } });
  if (existing?.status === "PUBLISHED") return { digest: existing, reused: true };
  const [attendance, completedTasks, evidence, review, existingPublished, overdueAssignmentCount] = await Promise.all([
    db.attendance.findMany({ where: { studentId, lesson: { startsAt: { gte: previousStart, lt: weekEnd }, status: "COMPLETED" } }, select: { status: true, lesson: { select: { startsAt: true } } } }),
    db.weeklyPlanTask.count({ where: { status: "DONE", completedAt: { gte: weekStart }, plan: { studentId } } }),
    db.lessonOutcome.findMany({ where: { lesson: { status: "COMPLETED", startsAt: { gte: weekStart }, attendances: { some: { studentId, status: { in: ["PRESENT", "LATE"] } } } } }, orderBy: { createdAt: "desc" }, take: 8, select: { outcome: { select: { title: true } } } }),
    db.reviewItem.findFirst({ where: { studentId, status: "ACTIVE" }, orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }], select: { title: true } }),
   db.weeklyDigest.findMany({ where: { studentId, weekStart: { gte: weekStart, lt: weekEnd }, status: "PUBLISHED" }, select: { id: true } }),
    db.assignmentProgress.count({ where: { studentId, status: { not: "DONE" }, assignment: { isActive: true, dueAt: { lt: now } } } }),
  ]);
  const summarize = (from: Date, to: Date) => {
   const rows = attendance.filter((item) => item.lesson.startsAt >= from && item.lesson.startsAt < to);
   return { total: rows.length, attended: rows.filter((item) => item.status === "PRESENT" || item.status === "LATE").length };
  };
  const content = buildCalmWeeklyDigest({ currentAttendance: summarize(weekStart, weekEnd), previousAttendance: summarize(previousStart, weekStart), completedTaskCount: completedTasks, overdueAssignmentCount, evidenceTitles: evidence.map((item) => item.outcome.title), reviewTitle: review?.title, dataThrough: now });
  if (existing) {
    const changed = await db.weeklyDigest.updateMany({ where: { id: existing.id, status: "DRAFT", version: existing.version }, data: { ruleVersion: CALM_DIGEST_RULE_VERSION, generatedById, ...content, version: { increment: 1 } } });
    if (changed.count !== 1) throw new GroupMutationError("DIGEST_CONFLICT", "Özet değişti. Güncel görünümü kontrol edin.");
  }
  const digest = existing
    ? await db.weeklyDigest.findUniqueOrThrow({ where: { id: existing.id } })
    : await db.weeklyDigest.create({ data: { studentId, weekStart, ruleVersion: CALM_DIGEST_RULE_VERSION, generatedById, ...content } });
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
