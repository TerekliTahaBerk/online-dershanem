import "server-only";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { digestWeekWindow } from "@/lib/calm-weekly-digest";
import { generateCalmDigest } from "@/lib/calm-weekly-digest-server";
import { filterNotificationRows, queuePanelNotificationEmails } from "@/lib/panel-notifications";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { afterEducationCommit } from "./education-write";
import { GroupMutationError, operationDigest } from "./group-mutation-core";

export function teacherDigestStudentScope(teacherId: string) {
  return { user: { status: "ACTIVE" as const }, enrollments: { some: { endedAt: null, group: { isActive: true, teacherId } } } };
}
export async function loadTeacherDigests(teacherId: string, db: PrismaClient = prisma) {
  const { weekStart, weekEnd } = digestWeekWindow();
  const students = await db.studentProfile.findMany({ where: teacherDigestStudentScope(teacherId), orderBy: [{ user: { fullName: "asc" } }, { id: "asc" }], select: {
    id: true, user: { select: { fullName: true, email: true } },
    enrollments: { where: { endedAt: null }, orderBy: { id: "asc" }, select: { id: true, groupId: true, startedAt: true } },
    parents: { where: { parent: { status: "ACTIVE" } }, orderBy: { parentId: "asc" }, select: { parentId: true } },
    weeklyDigests: { where: { weekStart: { gte: weekStart, lt: weekEnd } }, orderBy: [{ weekStart: "asc" }, { id: "asc" }], take: 1 },
  } });
  return students.map((student) => {
    const digest = student.weeklyDigests[0];
    return { studentId: student.id, name: student.user.fullName || student.user.email, revision: operationDigest(student), digest: digest ? {
      id: digest.id, status: digest.status, version: digest.version, goodThingOne: digest.goodThingOne, goodThingTwo: digest.goodThingTwo, supportArea: digest.supportArea, homeQuestion: digest.homeQuestion, dataThrough: digest.dataThrough.toISOString(),
    } : null };
  });
}
export async function generateTeacherDigest(studentId: string, teacherId: string, db: PrismaClient = prisma) {
  if (!await db.studentProfile.findFirst({ where: { id: studentId, ...teacherDigestStudentScope(teacherId) }, select: { id: true } })) throw new GroupMutationError("NOT_FOUND", "Öğrenci bulunamadı.", 404);
  const result = await generateCalmDigest(studentId, teacherId, db);
  await afterEducationCommit(db, () => recordPanelProductEvent({ name: "weekly_digest_generated", properties: { ruleVersion: "calm-digest-v2", trendBand: result.digest.trendBand as "IMPROVING" | "STEADY" | "BUILDING" | "LIMITED_DATA", reused: result.reused } }, "TEACHER"));
  return result;
}
export async function publishTeacherDigest(id: string, expectedVersion: number, teacherId: string, db: PrismaClient = prisma) {
  const result = await db.$transaction(async (tx) => {
    const digest = await tx.weeklyDigest.findFirst({ where: { id, status: "DRAFT", student: teacherDigestStudentScope(teacherId) }, include: { student: { select: { userId: true, parents: { where: { parent: { status: "ACTIVE" } }, select: { parentId: true } } } } } });
    if (!digest) throw new GroupMutationError("NOT_FOUND", "Özet bulunamadı.", 404);
    const changed = await tx.weeklyDigest.updateMany({ where: { id, status: "DRAFT", version: expectedVersion, student: teacherDigestStudentScope(teacherId) }, data: { status: "PUBLISHED", publishedById: teacherId, publishedAt: new Date(), version: { increment: 1 } } });
    if (changed.count !== 1) throw new GroupMutationError("DIGEST_CONFLICT", "Özet başka bir sekmede değişti.");
    const recipients = [...new Set([digest.student.userId, ...digest.student.parents.map((link) => link.parentId)])];
    const rawRows = recipients.map((userId) => ({ userId, type: "LESSON_SUMMARY" as const, title: "Haftalık özet hazır 🌟", body: "Bu hafta iyi giden iki nokta ve küçük bir destek önerisi sizi bekliyor.", href: userId === digest.student.userId ? "/panel/ogrenci/haftalik" : `/panel/veli/haftalik?studentId=${digest.studentId}` }));
    const rows = await filterNotificationRows(rawRows, "weeklyDigest", tx);
    if (rows.length) await tx.notification.createMany({ data: rows });
    await queuePanelNotificationEmails(rawRows, "weeklyDigest", tx);
    return { studentId: digest.studentId, trendBand: digest.trendBand, recipientCount: recipients.length };
  });
  await afterEducationCommit(db, async () => {
    const band = result.recipientCount === 1 ? "1" : result.recipientCount <= 3 ? "2-3" : "4+";
    await recordPanelProductEvent({ name: "weekly_digest_published", properties: { trendBand: result.trendBand as "IMPROVING" | "STEADY" | "BUILDING" | "LIMITED_DATA", recipientBand: band } }, "TEACHER");
    const { emitEducationAutomation } = await import("@/lib/automation/emit-helpers");
    const { afterResponse } = await import("@/lib/after-response");
    afterResponse("panel.weekly_digest.automation_emit_failed", () => emitEducationAutomation("weekly_digest_ready", { entityType: "digest", entityId: id, studentId: result.studentId, severity: "low", href: "/panel/veli/haftalik" }), { digestId: id });
  });
  return { published: true as const };
}
