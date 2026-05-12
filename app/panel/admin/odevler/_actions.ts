"use server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { revalidatePath } from "next/cache";
import { AssignmentStatus } from "@prisma/client";

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function createAssignmentAction(fd: FormData) {
  await requirePanelRole("admin");
  const teacherId = readStr(fd, "teacherId");
  const title = readStr(fd, "title");
  if (!teacherId || !title) throw new Error("Öğretmen ve başlık zorunlu");
  const due = readStr(fd, "dueAt");
  await prisma.assignment.create({
    data: {
      teacherId, title,
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
