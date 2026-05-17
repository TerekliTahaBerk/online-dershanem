"use server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { revalidatePath } from "next/cache";
import { AssignmentStatus } from "@prisma/client";
import { notifyUsers, resolveStudentAudience, resolveTeacherUserId } from "@/lib/notifications";

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

async function fanoutAssignmentNotifications(opts: {
  assignmentId: string;
  title: string;
  teacherId: string;
  classroomId: string | null;
  studentId: string | null;
  dueAt: Date | null;
}) {
  try {
    // Hedef öğrencileri belirle
    let studentIds: string[] = [];
    if (opts.classroomId) {
      const rows = await prisma.classroomStudent.findMany({
        where: { classroomId: opts.classroomId, leftAt: null },
        select: { studentId: true },
      });
      studentIds = rows.map((r) => r.studentId);
    } else if (opts.studentId) {
      studentIds = [opts.studentId];
    }

    const audience = await resolveStudentAudience(studentIds, { includeParents: true });
    const teacherUserId = await resolveTeacherUserId(opts.teacherId);

    const dueText = opts.dueAt
      ? ` (Son tarih: ${new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(opts.dueAt)})`
      : "";

    const baseBody = `Yeni ödev: ${opts.title}${dueText}`;
    await Promise.all([
      notifyUsers(audience.studentUserIds, {
        title: "Yeni ödev yayınlandı",
        body: baseBody,
        href: "/panel/ogrenci/odevler",
        category: "ASSIGNMENT",
        relatedEntityType: "Assignment",
        relatedEntityId: opts.assignmentId,
      }),
      notifyUsers(audience.parentUserIds, {
        title: "Çocuğunuz için yeni ödev",
        body: baseBody,
        href: "/panel/veli/odevler",
        category: "ASSIGNMENT",
        relatedEntityType: "Assignment",
        relatedEntityId: opts.assignmentId,
      }),
      teacherUserId
        ? notifyUsers([teacherUserId], {
            title: "Ödev yayınlandı",
            body: opts.title,
            href: "/panel/ogretmen/odevler",
            category: "ASSIGNMENT",
            relatedEntityType: "Assignment",
            relatedEntityId: opts.assignmentId,
          })
        : Promise.resolve(),
    ]);
  } catch (err) {
    console.warn("[odev] notify fanout failed", err);
  }
}

export async function createAssignmentAction(fd: FormData) {
  await requirePanelRole("admin");
  const teacherId = readStr(fd, "teacherId");
  const title = readStr(fd, "title");
  if (!teacherId || !title) throw new Error("Öğretmen ve başlık zorunlu");
  const due = readStr(fd, "dueAt");
  const classroomId = readStr(fd, "classroomId") || null;
  const studentId = readStr(fd, "studentId") || null;
  const dueAt = due ? new Date(due) : null;
  const status = ((readStr(fd, "status") as AssignmentStatus) || "PUBLISHED") as AssignmentStatus;

  const created = await prisma.assignment.create({
    data: {
      teacherId, title,
      classroomId,
      studentId,
      subject: readStr(fd, "subject") || null,
      description: readStr(fd, "description") || null,
      dueAt,
      status,
    },
  });

  if (status === "PUBLISHED") {
    await fanoutAssignmentNotifications({
      assignmentId: created.id,
      title,
      teacherId,
      classroomId,
      studentId,
      dueAt,
    });
  }

  revalidatePath("/panel/admin/odevler");
  revalidatePath("/panel/ogrenci/odevler");
  revalidatePath("/panel/ogretmen/odevler");
  revalidatePath("/panel/veli/odevler");
}

export async function updateAssignmentAction(id: string, fd: FormData) {
  await requirePanelRole("admin");
  const title = readStr(fd, "title");
  if (!title) throw new Error("Başlık zorunlu");
  const due = readStr(fd, "dueAt");
  await prisma.assignment.update({
    where: { id },
    data: {
      title,
      classroomId: readStr(fd, "classroomId") || null,
      studentId: readStr(fd, "studentId") || null,
      subject: readStr(fd, "subject") || null,
      description: readStr(fd, "description") || null,
      dueAt: due ? new Date(due) : null,
      status: (readStr(fd, "status") as AssignmentStatus) || "PUBLISHED",
    },
  });
  revalidatePath("/panel/admin/odevler");
}

export async function deleteAssignmentAction(id: string) {
  await requirePanelRole("admin");
  await prisma.assignment.delete({ where: { id } });
  revalidatePath("/panel/admin/odevler");
}

export async function gradeSubmissionAction(submissionId: string, fd: FormData) {
  await requirePanelRole("admin");
  const score = parseInt(readStr(fd, "score") || "0", 10);
  await prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: {
      score: Number.isFinite(score) ? score : null,
      feedback: readStr(fd, "feedback") || null,
      gradedAt: new Date(),
      status: "GRADED",
    },
  });
  revalidatePath("/panel/admin/odevler");
}
