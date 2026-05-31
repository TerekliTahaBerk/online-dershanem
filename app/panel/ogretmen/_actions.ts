"use server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AttendanceStatus, AssignmentStatus } from "@prisma/client";
import { notifyUser } from "@/lib/realtime";
import { getNextPendingSubmissionId } from "@/lib/teacher-utils";
import { logAudit } from "@/lib/audit";
import { canStart, canEnd, canCancel } from "@/lib/lessons/lifecycle";
import { resolveMeetingLink, isValidMeetingUrl } from "@/lib/lessons/meeting-provider";
import { computeAutoAttendanceForLesson } from "@/lib/lessons/auto-attendance";
import { enforceMutation } from "@/lib/security/mutation-guard";

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function recordAttendanceAction(fd: FormData) {
  const ctx = await requirePanelRole("ogretmen");
  // Phase 2 / Session 17 — abuse hardening (per-teacher).
  await enforceMutation({
    action: "attendance.record",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 120, windowMs: 60_000 },
  });
  const studentId = readStr(fd, "studentId");
  const lessonId = readStr(fd, "lessonId");
  const status = (readStr(fd, "status") as AttendanceStatus) || "PRESENT";
  if (!studentId || !lessonId) throw new Error("Öğrenci ve ders zorunlu");
  // Phase 2 / Session 12 — ownership guards.
  // The teacher must own the lesson, and the studentId must actually
  // belong to the lesson (direct studentId or active classroom membership).
  const teacher = await prisma.teacher.findFirst({ where: { userId: ctx.userId } });
  if (!teacher) throw new Error("Öğretmen profili yok");
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, teacherId: true, scheduledAt: true, studentId: true, classroomId: true },
  });
  if (!lesson) throw new Error("Ders bulunamadı");
  if (lesson.teacherId !== teacher.id) throw new Error("Bu derse yetkiniz yok");
  if (lesson.studentId && lesson.studentId !== studentId) {
    // Solo lesson — student must match exactly.
    if (!lesson.classroomId) throw new Error("Bu öğrenci bu derse ait değil");
  }
  if (lesson.classroomId) {
    const enrolled = await prisma.classroomStudent.findFirst({
      where: { classroomId: lesson.classroomId, studentId, leftAt: null },
      select: { studentId: true },
    });
    if (!enrolled && lesson.studentId !== studentId) {
      throw new Error("Bu öğrenci bu sınıfta değil");
    }
  }
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

  // ── Phase 2 / Session 9 — Attach selected library materials ──────────
  // Permission-checked per id via canTeacherAttachMaterialToAssignment.
  const rawIds = fd.getAll("materialIds").filter((v): v is string => typeof v === "string");
  const materialIds = Array.from(new Set(rawIds.map((s) => s.trim()).filter(Boolean)));
  if (materialIds.length > 0) {
    const { attachMaterialToAssignment } = await import("@/lib/panel/material-attachments");
    const attached: string[] = [];
    for (const mid of materialIds) {
      const r = await attachMaterialToAssignment(teacher.id, created.id, mid);
      if (r.ok) attached.push(mid);
    }
    if (attached.length > 0) {
      await logAudit({
        entityType: "Assignment",
        entityId: created.id,
        actorUserId: ctx.userId,
        action: "MATERIAL_ATTACH_TO_ASSIGNMENT",
        payload: { materialIds: attached, source: "create" },
      });
    }
  }

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
  await enforceMutation({
    action: "attendance.record.bulk",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 30, windowMs: 60_000 },
  });
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

// ─── Sprint 6 — Lesson lifecycle (start/end/cancel) ─────────────────────────
//
// Aynı sessionGroupId'ye sahip fan-out satırlarının HEPSİ tek bir öğretmen
// işlemiyle aynı duruma geçer (öğretmen UI'da seansı tek satır olarak görür).
// Solo derslerde sadece o satır etkilenir.
async function _loadTeacherAndLesson(lessonId: string) {
  const ctx = await requirePanelRole("ogretmen");
  const teacher = await prisma.teacher.findFirst({ where: { userId: ctx.userId } });
  if (!teacher) throw new Error("Öğretmen profili yok");
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true, teacherId: true, status: true, scheduledAt: true, duration: true,
      sessionGroupId: true, classroomId: true,
      meetingProvider: true, meetingRoomId: true,
      meetingJoinUrl: true, meetingHostUrl: true, googleMeetLink: true,
    },
  });
  if (!lesson) throw new Error("Ders bulunamadı");
  if (lesson.teacherId !== teacher.id) throw new Error("Bu derse yetkiniz yok");
  return { ctx, teacher, lesson };
}

function _targetWhere(lesson: { id: string; sessionGroupId: string | null }) {
  return lesson.sessionGroupId
    ? { sessionGroupId: lesson.sessionGroupId }
    : { id: lesson.id };
}

async function _notifyStudentsOfSession(args: {
  lessonId: string;
  sessionGroupId: string | null;
  title: string;
  body: string;
  type: "LESSON";
  href: string;
  priority?: "NORMAL" | "HIGH";
}) {
  const where = args.sessionGroupId ? { sessionGroupId: args.sessionGroupId } : { id: args.lessonId };
  const rows = await prisma.lesson.findMany({
    where,
    select: { student: { select: { userId: true } } },
  });
  const userIds = Array.from(new Set(rows.map((r) => r.student.userId).filter((x): x is string => !!x)));
  await Promise.all(
    userIds.map((uid) =>
      notifyUser({
        userId: uid,
        title: args.title,
        body: args.body,
        href: args.href,
        type: args.type,
        priority: args.priority ?? "NORMAL",
      }).catch(() => null),
    ),
  );
}

export async function startLessonAction(lessonId: string) {
  const { ctx, lesson } = await _loadTeacherAndLesson(lessonId);
  const meeting = resolveMeetingLink(lesson);
  const guard = canStart({
    status: lesson.status,
    scheduledAt: lesson.scheduledAt,
    duration: lesson.duration,
    meetingJoinUrl: meeting.joinUrl,
  });
  if (!guard.ok) throw new Error(guard.message);

  const now = new Date();
  await prisma.lesson.updateMany({
    where: { ..._targetWhere(lesson), status: "SCHEDULED" },
    data: { status: "LIVE", startedAt: now },
  });

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Lesson",
    entityId: lesson.id,
    action: "LESSON_START",
    summary: `Ders başlatıldı (${lesson.sessionGroupId ? "seans" : "solo"})`,
    payload: { sessionGroupId: lesson.sessionGroupId, scheduledAt: lesson.scheduledAt.toISOString() },
  });

  await _notifyStudentsOfSession({
    lessonId: lesson.id,
    sessionGroupId: lesson.sessionGroupId,
    title: "Dersin başladı",
    body: "Öğretmenin canlı bağlandı. 'Katıl' butonuna tıklayabilirsin.",
    type: "LESSON",
    href: "/panel/ogrenci/ders-programi",
    priority: "HIGH",
  });

  revalidatePath("/panel/ogretmen/ders-programi");
  revalidatePath("/panel/ogrenci/ders-programi");
  revalidatePath("/panel/veli/ders-programi");
  revalidatePath(`/panel/ogretmen/canli-ders/${lesson.id}`);
}

export async function endLessonAction(lessonId: string) {
  const { ctx, lesson } = await _loadTeacherAndLesson(lessonId);
  const guard = canEnd({ status: lesson.status });
  if (!guard.ok) throw new Error(guard.message);

  const now = new Date();
  await prisma.lesson.updateMany({
    where: { ..._targetWhere(lesson), status: "LIVE" },
    data: { status: "ENDED", endedAt: now },
  });

  // Auto-attendance hesapla (her etkilenen Lesson satırı için).
  const affected = await prisma.lesson.findMany({
    where: _targetWhere(lesson),
    select: { id: true },
  });
  await Promise.all(
    affected.map((l) =>
      computeAutoAttendanceForLesson(prisma, { lessonId: l.id }).catch((e) => {
        console.error("[auto-attendance] failed", l.id, e);
        return null;
      }),
    ),
  );

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Lesson",
    entityId: lesson.id,
    action: "LESSON_END",
    summary: `Ders bitirildi (${lesson.sessionGroupId ? "seans" : "solo"})`,
    payload: { sessionGroupId: lesson.sessionGroupId, affectedCount: affected.length },
  });

  revalidatePath("/panel/ogretmen/ders-programi");
  revalidatePath("/panel/ogrenci/ders-programi");
  revalidatePath("/panel/veli/ders-programi");
  revalidatePath("/panel/ogretmen/yoklama");
  revalidatePath(`/panel/ogretmen/canli-ders/${lesson.id}`);
}

export async function cancelLessonByTeacherAction(lessonId: string, fd: FormData) {
  const { ctx, lesson } = await _loadTeacherAndLesson(lessonId);
  const guard = canCancel({ status: lesson.status });
  if (!guard.ok) throw new Error(guard.message);
  const reason = readStr(fd, "reason") || "Öğretmen iptali";

  await prisma.lesson.updateMany({
    where: { ..._targetWhere(lesson), status: { in: ["SCHEDULED", "LIVE"] } },
    data: { status: "CANCELLED" },
  });

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Lesson",
    entityId: lesson.id,
    action: "LESSON_CANCEL_BY_TEACHER",
    summary: `Ders iptal: ${reason}`,
    payload: { sessionGroupId: lesson.sessionGroupId, reason },
  });

  await _notifyStudentsOfSession({
    lessonId: lesson.id,
    sessionGroupId: lesson.sessionGroupId,
    title: "Ders iptal edildi",
    body: reason,
    type: "LESSON",
    href: "/panel/ogrenci/ders-programi",
    priority: "HIGH",
  });

  revalidatePath("/panel/ogretmen/ders-programi");
  revalidatePath("/panel/ogrenci/ders-programi");
  revalidatePath("/panel/veli/ders-programi");
}

/** Öğretmen meet link'ini Live'a geçmeden önce set/güncelleyebilir. */
export async function setLessonMeetingLinkAction(lessonId: string, fd: FormData) {
  const { ctx, lesson } = await _loadTeacherAndLesson(lessonId);
  const url = readStr(fd, "joinUrl");
  if (!url) throw new Error("Bağlantı zorunlu");
  if (!isValidMeetingUrl(url)) throw new Error("Geçersiz URL (https://… formatında olmalı).");
  if (lesson.status !== "SCHEDULED" && lesson.status !== "LIVE") {
    throw new Error("Bitmiş/iptal edilmiş derste link değişmez.");
  }
  const hostUrl = readStr(fd, "hostUrl") || null;
  await prisma.lesson.updateMany({
    where: _targetWhere(lesson),
    data: {
      meetingProvider: "MANUAL",
      meetingJoinUrl: url,
      meetingHostUrl: hostUrl,
    },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Lesson",
    entityId: lesson.id,
    action: "LESSON_SET_MEETING_LINK",
    summary: "Ders bağlantısı güncellendi",
    payload: { sessionGroupId: lesson.sessionGroupId },
  });
  revalidatePath("/panel/ogretmen/ders-programi");
  revalidatePath(`/panel/ogretmen/canli-ders/${lesson.id}`);
}
// ─── Phase 2 / Session 9 — Material attachments ────────────────────────────
// Attach / detach existing Material records to/from Assignment + Lesson.
// All four actions are permission-checked inside lib/panel/material-attachments.

export async function attachAssignmentMaterialsAction(assignmentId: string, fd: FormData) {
  const ctx = await requirePanelRole("ogretmen");
  const teacher = await prisma.teacher.findFirst({ where: { userId: ctx.userId } });
  if (!teacher) throw new Error("Öğretmen profili yok");
  const rawIds = fd.getAll("materialIds").filter((v): v is string => typeof v === "string");
  const ids = Array.from(new Set(rawIds.map((s) => s.trim()).filter(Boolean)));
  if (ids.length === 0) return;
  const { attachMaterialToAssignment } = await import("@/lib/panel/material-attachments");
  const ok: string[] = [];
  for (const mid of ids) {
    const r = await attachMaterialToAssignment(teacher.id, assignmentId, mid);
    if (r.ok) ok.push(mid);
  }
  if (ok.length > 0) {
    await logAudit({
      actorUserId: ctx.userId,
      entityType: "Assignment",
      entityId: assignmentId,
      action: "MATERIAL_ATTACH_TO_ASSIGNMENT",
      payload: { materialIds: ok },
    });
  }
  revalidatePath(`/panel/ogretmen/odevler/${assignmentId}`);
  revalidatePath("/panel/ogretmen/odevler");
}

export async function detachAssignmentMaterialAction(assignmentId: string, materialId: string) {
  const ctx = await requirePanelRole("ogretmen");
  const teacher = await prisma.teacher.findFirst({ where: { userId: ctx.userId } });
  if (!teacher) throw new Error("Öğretmen profili yok");
  const { detachMaterialFromAssignment } = await import("@/lib/panel/material-attachments");
  const r = await detachMaterialFromAssignment(teacher.id, assignmentId, materialId);
  if (!r.ok) throw new Error("Yetki yok");
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Assignment",
    entityId: assignmentId,
    action: "MATERIAL_DETACH_FROM_ASSIGNMENT",
    payload: { materialId },
  });
  revalidatePath(`/panel/ogretmen/odevler/${assignmentId}`);
  revalidatePath("/panel/ogretmen/odevler");
}

export async function attachLessonMaterialsAction(lessonId: string, fd: FormData) {
  const ctx = await requirePanelRole("ogretmen");
  const teacher = await prisma.teacher.findFirst({ where: { userId: ctx.userId } });
  if (!teacher) throw new Error("Öğretmen profili yok");
  const rawIds = fd.getAll("materialIds").filter((v): v is string => typeof v === "string");
  const ids = Array.from(new Set(rawIds.map((s) => s.trim()).filter(Boolean)));
  if (ids.length === 0) return;
  const { attachMaterialToLesson } = await import("@/lib/panel/material-attachments");
  const ok: string[] = [];
  for (const mid of ids) {
    const r = await attachMaterialToLesson(teacher.id, lessonId, mid);
    if (r.ok) ok.push(mid);
  }
  if (ok.length > 0) {
    await logAudit({
      actorUserId: ctx.userId,
      entityType: "Lesson",
      entityId: lessonId,
      action: "MATERIAL_ATTACH_TO_LESSON",
      payload: { materialIds: ok },
    });
  }
  revalidatePath("/panel/ogretmen/ders-programi");
  revalidatePath(`/panel/ogretmen/canli-ders/${lessonId}`);
}

export async function detachLessonMaterialAction(lessonId: string, materialId: string) {
  const ctx = await requirePanelRole("ogretmen");
  const teacher = await prisma.teacher.findFirst({ where: { userId: ctx.userId } });
  if (!teacher) throw new Error("Öğretmen profili yok");
  const { detachMaterialFromLesson } = await import("@/lib/panel/material-attachments");
  const r = await detachMaterialFromLesson(teacher.id, lessonId, materialId);
  if (!r.ok) throw new Error("Yetki yok");
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Lesson",
    entityId: lessonId,
    action: "MATERIAL_DETACH_FROM_LESSON",
    payload: { materialId },
  });
  revalidatePath("/panel/ogretmen/ders-programi");
  revalidatePath(`/panel/ogretmen/canli-ders/${lessonId}`);
}
