"use server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { revalidatePath } from "next/cache";
import { AttendanceStatus, AssignmentStatus } from "@prisma/client";
import { notifyUser } from "@/lib/realtime";

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function recordAttendanceAction(fd: FormData) {
  const ctx = await requirePanelRole("ogretmen");
  const studentId = readStr(fd, "studentId");
  const lessonId = readStr(fd, "lessonId");
  const status = (readStr(fd, "status") as AttendanceStatus) || "PRESENT";
  if (!studentId || !lessonId) throw new Error("Öğrenci ve ders zorunlu");
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) throw new Error("Ders bulunamadı");
  await prisma.attendance.create({
    data: {
      studentId, lessonId,
      sessionDate: lesson.scheduledAt,
      status,
      minutesLate: status === "LATE" ? parseInt(readStr(fd, "minutesLate") || "0", 10) : null,
      notes: readStr(fd, "notes") || null,
      recordedById: ctx.userId,
    },
  });
  revalidatePath("/panel/ogretmen/yoklama");
}

export async function createTeacherAssignmentAction(fd: FormData) {
  const ctx = await requirePanelRole("ogretmen");
  const teacher = await prisma.teacher.findFirst({ where: { userId: ctx.userId } });
  if (!teacher) throw new Error("Öğretmen profili yok");
  const title = readStr(fd, "title");
  if (!title) throw new Error("Başlık zorunlu");
  const due = readStr(fd, "dueAt");
  const classroomId = readStr(fd, "classroomId") || null;
  const studentId = readStr(fd, "studentId") || null;
  const created = await prisma.assignment.create({
    data: {
      teacherId: teacher.id,
      title,
      classroomId,
      studentId,
      subject: readStr(fd, "subject") || null,
      description: readStr(fd, "description") || null,
      dueAt: due ? new Date(due) : null,
      status: (readStr(fd, "status") as AssignmentStatus) || "PUBLISHED",
    },
  });

  // Notify affected students (only if PUBLISHED)
  if (created.status === "PUBLISHED") {
    const recipients = studentId
      ? await prisma.student.findMany({ where: { id: studentId }, select: { userId: true, fullName: true } })
      : classroomId
        ? await prisma.student.findMany({
            where: { classrooms: { some: { classroomId } } },
            select: { userId: true, fullName: true },
          })
        : [];
    await Promise.all(
      recipients
        .filter((s) => s.userId)
        .map((s) =>
          notifyUser({
            userId: s.userId!,
            title: "Yeni ödev",
            body: title,
            href: "/panel/ogrenci/odevler",
            type: "CONTENT",
          }),
        ),
    );
  }

  revalidatePath("/panel/ogretmen/odevler");
}

export async function gradeMySubmissionAction(submissionId: string, fd: FormData) {
  const ctx = await requirePanelRole("ogretmen");
  const teacher = await prisma.teacher.findFirst({ where: { userId: ctx.userId } });
  if (!teacher) throw new Error("Öğretmen profili yok");
  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId }, include: { assignment: true },
  });
  if (!submission || submission.assignment.teacherId !== teacher.id) throw new Error("Yetki yok");
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
  // Notify student
  const student = await prisma.student.findUnique({
    where: { id: submission.studentId }, select: { userId: true },
  });
  if (student?.userId) {
    await notifyUser({
      userId: student.userId,
      title: "Ödevin değerlendirildi",
      body: `"${submission.assignment.title}" için puanın hazır.`,
      href: "/panel/ogrenci/odevler",
      type: "PERFORMANCE",
    });
  }
  revalidatePath("/panel/ogretmen/odevler");
}

export async function addCommentAction(fd: FormData) {
  const ctx = await requirePanelRole("ogretmen");
  const teacher = await prisma.teacher.findFirst({ where: { userId: ctx.userId } });
  if (!teacher) throw new Error("Öğretmen profili yok");
  const studentId = readStr(fd, "studentId");
  const content = readStr(fd, "content");
  if (!studentId || !content) throw new Error("Öğrenci ve içerik zorunlu");
  const ratingStr = readStr(fd, "rating");
  await prisma.teacherComment.create({
    data: {
      teacherId: teacher.id,
      studentId, content,
      rating: ratingStr ? parseInt(ratingStr, 10) : null,
      visibleToParent: fd.get("visibleToParent") === "on",
    },
  });
  revalidatePath("/panel/ogretmen/karne");
}
