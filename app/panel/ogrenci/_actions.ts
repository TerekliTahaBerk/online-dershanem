"use server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { revalidatePath } from "next/cache";
import { notifyUser } from "@/lib/realtime";
import { enforceMutation } from "@/lib/security/mutation-guard";

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Phase 2 / Session 12 — ownership guard.
 * A student can only submit to an assignment if it is directed to them
 * (`assignment.studentId === student.id`) OR addresses a classroom they
 * actively belong to. Without this check a student could submit to any
 * assignment by guessing the id.
 */
async function assertStudentCanSubmit(assignmentId: string, studentId: string) {
  const a = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      status: { not: "CLOSED" },
      OR: [
        { studentId },
        { classroom: { students: { some: { studentId, leftAt: null } } } },
      ],
    },
    include: { teacher: { select: { userId: true } } },
  });
  if (!a) throw new Error("Bu ödeve gönderim yetkiniz yok");
  return a;
}

export async function submitAssignmentAction(assignmentId: string, fd: FormData) {
  const ctx = await requirePanelRole("ogrenci");
  // Phase 2 / Session 17 — abuse hardening: same-origin + per-user rate-limit.
  // 30 submissions / 60s comfortably covers UI re-tries; blocks scripted floods.
  await enforceMutation({
    action: "homework.submit",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 30, windowMs: 60_000 },
  });
  const student = await prisma.student.findFirst({ where: { userId: ctx.userId } });
  if (!student) throw new Error("Öğrenci profili yok");
  const assignment = await assertStudentCanSubmit(assignmentId, student.id);
  const content = readStr(fd, "content");
  await prisma.assignmentSubmission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId: student.id } },
    update: { content, submittedAt: new Date(), status: "SUBMITTED" },
    create: { assignmentId, studentId: student.id, content, submittedAt: new Date(), status: "SUBMITTED" },
  });
  // Notify teacher
  if (assignment?.teacher.userId) {
    await notifyUser({
      userId: assignment.teacher.userId,
      title: "Yeni ödev gönderimi",
      body: `${student.fullName} bir ödev gönderdi.`,
      href: "/panel/ogretmen/odevler",
      type: "ANNOUNCEMENT",
    });
  }
  revalidatePath("/panel/ogrenci/odevler");
}

export async function markNotificationReadAction(messageId: string) {
  const ctx = await requirePanelRole("ogrenci");
  await prisma.inboxMessage.updateMany({
    where: { id: messageId, recipientUserId: ctx.userId },
    data: { readAt: new Date() },
  });
  revalidatePath("/panel/ogrenci/bildirimler");
}

// ─── Profile ────────────────────────────────────────────────────────────────
export async function updateStudentProfileAction(fd: FormData) {
  const ctx = await requirePanelRole("ogrenci");
  const student = await prisma.student.findFirst({ where: { userId: ctx.userId } });
  if (!student) throw new Error("Öğrenci profili yok");
  await prisma.student.update({
    where: { id: student.id },
    data: {
      email: readStr(fd, "email") || null,
      city: readStr(fd, "city") || null,
      district: readStr(fd, "district") || null,
      schoolName: readStr(fd, "schoolName") || null,
      classLevel: readStr(fd, "classLevel") || null,
      examType: readStr(fd, "examType") || null,
      targetGoal: readStr(fd, "targetGoal") || null,
      targetSchool: readStr(fd, "targetSchool") || null,
    },
  });
  revalidatePath("/panel/ogrenci/profilim");
}

// ─── Submission with attachment ─────────────────────────────────────────────
export async function submitAssignmentExtendedAction(assignmentId: string, fd: FormData) {
  const ctx = await requirePanelRole("ogrenci");
  await enforceMutation({
    action: "homework.submit",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 30, windowMs: 60_000 },
  });
  const student = await prisma.student.findFirst({ where: { userId: ctx.userId } });
  if (!student) throw new Error("Öğrenci profili yok");
  const assignment = await assertStudentCanSubmit(assignmentId, student.id);
  const content = readStr(fd, "content");
  const attachmentUrl = readStr(fd, "attachmentUrl") || null;
  if (!content && !attachmentUrl) throw new Error("İçerik veya dosya URL'si gerekli");
  await prisma.assignmentSubmission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId: student.id } },
    update: { content, attachmentUrl, submittedAt: new Date(), status: "SUBMITTED" },
    create: { assignmentId, studentId: student.id, content, attachmentUrl, submittedAt: new Date(), status: "SUBMITTED" },
  });
  if (assignment?.teacher.userId) {
    try {
      await notifyUser({
        userId: assignment.teacher.userId,
        title: "Yeni ödev gönderimi",
        body: `${student.fullName} bir ödev gönderdi.`,
        href: `/panel/ogretmen/odevler/${assignmentId}`,
        type: "ANNOUNCEMENT",
      });
    } catch {}
  }
  revalidatePath("/panel/ogrenci/odevler");
  revalidatePath(`/panel/ogrenci/odevler/${assignmentId}`);
}
