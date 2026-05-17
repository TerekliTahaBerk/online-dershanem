"use server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AttendanceStatus, AssignmentStatus } from "@prisma/client";
import { notifyUser } from "@/lib/realtime";
import { getNextPendingSubmissionId } from "@/lib/teacher-utils";

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

  // Round 4: auto-advance to next pending submission in the same assignment
  if (fd.get("autoAdvance") === "1") {
    const next = await getNextPendingSubmissionId(teacher.id, submissionId);
    if (next?.nextSubmissionId) {
      redirect(`/panel/ogretmen/odevler/${next.assignmentId}?focus=${next.nextSubmissionId}`);
    } else if (next) {
      redirect(`/panel/ogretmen/odevler/${next.assignmentId}?done=1`);
    }
  }
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

// ─── Profile ────────────────────────────────────────────────────────────────
export async function updateTeacherProfileAction(fd: FormData) {
  const ctx = await requirePanelRole("ogretmen");
  const teacher = await prisma.teacher.findFirst({ where: { userId: ctx.userId } });
  if (!teacher) throw new Error("Öğretmen profili yok");
  await prisma.teacher.update({
    where: { id: teacher.id },
    data: {
      fullName: readStr(fd, "fullName") || teacher.fullName,
      email: readStr(fd, "email") || null,
      phone: readStr(fd, "phone") || null,
      bio: readStr(fd, "bio") || null,
    },
  });
  revalidatePath("/panel/ogretmen/profilim");
}

// ─── Assignment toggle/delete ───────────────────────────────────────────────
export async function toggleAssignmentStatusAction(id: string, next: AssignmentStatus) {
  const ctx = await requirePanelRole("ogretmen");
  const teacher = await prisma.teacher.findFirst({ where: { userId: ctx.userId } });
  if (!teacher) throw new Error("Öğretmen profili yok");
  const a = await prisma.assignment.findFirst({ where: { id, teacherId: teacher.id } });
  if (!a) throw new Error("Yetki yok");
  await prisma.assignment.update({ where: { id }, data: { status: next } });
  revalidatePath("/panel/ogretmen/odevler");
  revalidatePath(`/panel/ogretmen/odevler/${id}`);
}

export async function deleteTeacherAssignmentAction(id: string) {
  const ctx = await requirePanelRole("ogretmen");
  const teacher = await prisma.teacher.findFirst({ where: { userId: ctx.userId } });
  if (!teacher) throw new Error("Öğretmen profili yok");
  const a = await prisma.assignment.findFirst({ where: { id, teacherId: teacher.id } });
  if (!a) throw new Error("Yetki yok");
  await prisma.assignment.delete({ where: { id } });
  revalidatePath("/panel/ogretmen/odevler");
}

// ─── Classroom session attendance (bulk) ────────────────────────────────────
export async function recordClassroomAttendanceAction(fd: FormData) {
  const ctx = await requirePanelRole("ogretmen");
  const teacher = await prisma.teacher.findFirst({ where: { userId: ctx.userId } });
  if (!teacher) throw new Error("Öğretmen profili yok");
  const classroomId = readStr(fd, "classroomId");
  const sessionDate = readStr(fd, "sessionDate");
  if (!classroomId || !sessionDate) throw new Error("Sınıf ve tarih zorunlu");
  const link = await prisma.classroomTeacher.findFirst({ where: { classroomId, teacherId: teacher.id } });
  if (!link) throw new Error("Bu sınıfa atanmamışsınız");
  const date = new Date(sessionDate);
  const students = await prisma.classroomStudent.findMany({ where: { classroomId, leftAt: null }, select: { studentId: true } });
  await Promise.all(students.map(async ({ studentId }) => {
    const status = readStr(fd, `status_${studentId}`) as AttendanceStatus;
    if (!status || !["PRESENT", "ABSENT", "LATE", "EXCUSED"].includes(status)) return;
    const existing = await prisma.attendance.findFirst({
      where: { studentId, classroomId, sessionDate: date, context: "CLASSROOM_SESSION" },
    });
    if (existing) {
      await prisma.attendance.update({ where: { id: existing.id }, data: { status, recordedById: ctx.userId } });
    } else {
      await prisma.attendance.create({
        data: { studentId, classroomId, sessionDate: date, status, context: "CLASSROOM_SESSION", recordedById: ctx.userId },
      });
    }
  }));
  revalidatePath("/panel/ogretmen/yoklama");
}

// ─── Comments ───────────────────────────────────────────────────────────────
export async function deleteTeacherCommentAction(commentId: string) {
  const ctx = await requirePanelRole("ogretmen");
  const teacher = await prisma.teacher.findFirst({ where: { userId: ctx.userId } });
  if (!teacher) throw new Error("Öğretmen profili yok");
  const c = await prisma.teacherComment.findUnique({ where: { id: commentId } });
  if (!c || c.teacherId !== teacher.id) throw new Error("Yetki yok");
  await prisma.teacherComment.delete({ where: { id: commentId } });
  revalidatePath(`/panel/ogretmen/ogrencilerim/${c.studentId}`);
  revalidatePath("/panel/ogretmen/karne");
}

// ─── Announcement (Inbox to classroom or all students) ──────────────────────
export async function sendAnnouncementAction(fd: FormData) {
  const ctx = await requirePanelRole("ogretmen");
  const teacher = await prisma.teacher.findFirst({ where: { userId: ctx.userId } });
  if (!teacher) throw new Error("Öğretmen profili yok");
  const title = readStr(fd, "title");
  const body = readStr(fd, "body");
  const classroomId = readStr(fd, "classroomId") || null;
  if (!title || !body) throw new Error("Başlık ve içerik zorunlu");
  let recipientIds: string[] = [];
  if (classroomId) {
    const link = await prisma.classroomTeacher.findFirst({ where: { classroomId, teacherId: teacher.id } });
    if (!link) throw new Error("Bu sınıfa atanmamışsınız");
    const studs = await prisma.classroomStudent.findMany({
      where: { classroomId, leftAt: null },
      select: { student: { select: { userId: true } } },
    });
    recipientIds = studs.map((x) => x.student.userId).filter((x): x is string => !!x);
  } else {
    const classes = await prisma.classroomTeacher.findMany({ where: { teacherId: teacher.id }, select: { classroomId: true } });
    const studs = await prisma.classroomStudent.findMany({
      where: { classroomId: { in: classes.map((c) => c.classroomId) }, leftAt: null },
      select: { student: { select: { userId: true } } },
    });
    recipientIds = Array.from(new Set(studs.map((x) => x.student.userId).filter((x): x is string => !!x)));
  }
  if (recipientIds.length > 0) {
    await prisma.inboxMessage.createMany({
      data: recipientIds.map((uid) => ({
        recipientUserId: uid,
        title,
        body,
        category: "ANNOUNCEMENT" as const,
        createdById: ctx.userId,
      })),
    });
    await Promise.all(recipientIds.map((uid) => notifyUser({
      userId: uid,
      title: `Duyuru: ${title}`,
      body: body.slice(0, 140),
      type: "ANNOUNCEMENT",
      href: "/panel/ogrenci/bildirimler",
    }).catch(() => null)));
  }
  revalidatePath("/panel/ogretmen/duyurular");
}