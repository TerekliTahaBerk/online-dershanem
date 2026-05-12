"use server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { revalidatePath } from "next/cache";
import { notifyUser } from "@/lib/realtime";

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

async function getParent() {
  const ctx = await requirePanelRole("veli");
  const parent = await prisma.parent.findFirst({ where: { userId: ctx.userId } });
  if (!parent) throw new Error("Veli profili yok");
  return { ctx, parent };
}

// ─── Profile ────────────────────────────────────────────────────────────────
export async function updateParentProfileAction(fd: FormData) {
  const { parent } = await getParent();
  await prisma.parent.update({
    where: { id: parent.id },
    data: {
      fullName: readStr(fd, "fullName") || parent.fullName,
      email: readStr(fd, "email") || null,
      phone: readStr(fd, "phone") || null,
    },
  });
  revalidatePath("/panel/veli/profilim");
}

// ─── Send message to teacher ────────────────────────────────────────────────
export async function sendMessageToTeacherAction(fd: FormData) {
  const { ctx, parent } = await getParent();
  const teacherId = readStr(fd, "teacherId");
  const title = readStr(fd, "title");
  const body = readStr(fd, "body");
  if (!teacherId || !title || !body) throw new Error("Öğretmen, başlık ve içerik zorunlu");

  // Verify teacher has at least one of parent's children
  const childIds = (await prisma.parentStudent.findMany({ where: { parentId: parent.id }, select: { studentId: true } })).map((x) => x.studentId);
  const teacher = await prisma.teacher.findFirst({
    where: {
      id: teacherId,
      OR: [
        { lessons: { some: { studentId: { in: childIds } } } },
        { classrooms: { some: { classroom: { students: { some: { studentId: { in: childIds }, leftAt: null } } } } } },
      ],
    },
    select: { id: true, userId: true, fullName: true },
  });
  if (!teacher) throw new Error("Bu öğretmenle iletişiminiz yok");

  if (teacher.userId) {
    await prisma.inboxMessage.create({
      data: {
        recipientUserId: teacher.userId,
        title: `Veli mesajı: ${title}`,
        body: `${parent.fullName}: ${body}`,
        category: "TEACHER_MESSAGE",
        createdById: ctx.userId,
      },
    });
    try {
      await notifyUser({
        userId: teacher.userId,
        title: "Veli mesajı",
        body: `${parent.fullName}: ${title}`,
        href: "/panel/ogretmen/mesajlar",
        type: "ANNOUNCEMENT",
      });
    } catch {}
  }
  revalidatePath("/panel/veli/ogretmenlerle");
}

// ─── Mark notification read ─────────────────────────────────────────────────
export async function markParentNotificationReadAction(messageId: string) {
  const { ctx } = await getParent();
  await prisma.inboxMessage.updateMany({
    where: { id: messageId, recipientUserId: ctx.userId },
    data: { readAt: new Date() },
  });
  revalidatePath("/panel/veli");
}
