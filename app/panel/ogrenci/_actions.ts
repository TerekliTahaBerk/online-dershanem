"use server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { revalidatePath } from "next/cache";
import { notifyUser } from "@/lib/realtime";

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function submitAssignmentAction(assignmentId: string, fd: FormData) {
  const ctx = await requirePanelRole("ogrenci");
  const student = await prisma.student.findFirst({ where: { userId: ctx.userId } });
  if (!student) throw new Error("Öğrenci profili yok");
  const content = readStr(fd, "content");
  await prisma.assignmentSubmission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId: student.id } },
    update: { content, submittedAt: new Date(), status: "SUBMITTED" },
    create: { assignmentId, studentId: student.id, content, submittedAt: new Date(), status: "SUBMITTED" },
  });
  // Notify teacher
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId }, include: { teacher: { select: { userId: true } } },
  });
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
