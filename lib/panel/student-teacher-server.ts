import "server-only";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import {
  assertValidSubject,
  StudentTeacherLinkError,
  toParentVisibleTeacher,
  type ParentVisibleTeacher,
} from "@/lib/panel/student-teacher";

export async function listActiveTeacherLinksForStudent(studentId: string) {
  return prisma.studentTeacherAssignment.findMany({
    where: { studentId, active: true, endedAt: null },
    orderBy: [{ subject: "asc" }, { startedAt: "asc" }],
    include: {
      teacher: {
        select: {
          id: true,
          fullName: true,
          email: true,
          status: true,
          teacherProfile: { select: { subjects: true, bio: true } },
        },
      },
    },
  });
}

export async function listParentVisibleTeachers(studentId: string): Promise<ParentVisibleTeacher[]> {
  const rows = await prisma.studentTeacherAssignment.findMany({
    where: {
      studentId,
      active: true,
      endedAt: null,
      teacher: { status: "ACTIVE", role: "TEACHER" },
    },
    orderBy: [{ subject: "asc" }],
    include: {
      teacher: {
        select: {
          id: true,
          fullName: true,
          email: true,
          teacherProfile: { select: { bio: true } },
        },
      },
    },
  });

  return rows.map((row) =>
    toParentVisibleTeacher({
      assignmentId: row.id,
      teacherUserId: row.teacher.id,
      teacherName: row.teacher.fullName,
      teacherEmail: row.teacher.email,
      subject: row.subject,
      bio: row.teacher.teacherProfile?.bio ?? null,
    }),
  );
}

export async function linkStudentTeacher(input: {
  studentId: string;
  teacherId: string;
  subject: string;
  actorUserId: string;
  notes?: string | null;
}) {
  const subject = assertValidSubject(input.subject);
  const [student, teacher] = await Promise.all([
    prisma.studentProfile.findFirst({
      where: { id: input.studentId, user: { status: { in: ["ACTIVE", "SUSPENDED"] } } },
      select: { id: true },
    }),
    prisma.user.findFirst({
      where: { id: input.teacherId, role: "TEACHER", status: "ACTIVE" },
      select: { id: true },
    }),
  ]);
  if (!student) throw new StudentTeacherLinkError("STUDENT_INACTIVE", "Öğrenci bulunamadı.");
  if (!teacher) throw new StudentTeacherLinkError("TEACHER_INACTIVE", "Aktif öğretmen bulunamadı.");

  const existing = await prisma.studentTeacherAssignment.findUnique({
    where: {
      studentId_teacherId_subject: {
        studentId: student.id,
        teacherId: teacher.id,
        subject,
      },
    },
  });

  if (existing?.active && !existing.endedAt) {
    throw new StudentTeacherLinkError(
      "DUPLICATE_ACTIVE",
      "Bu branş için öğretmen zaten bağlı.",
    );
  }

  const link = existing
    ? await prisma.studentTeacherAssignment.update({
        where: { id: existing.id },
        data: {
          active: true,
          endedAt: null,
          startedAt: new Date(),
          assignedById: input.actorUserId,
          notes: input.notes ?? existing.notes,
        },
      })
    : await prisma.studentTeacherAssignment.create({
        data: {
          studentId: student.id,
          teacherId: teacher.id,
          subject,
          assignedById: input.actorUserId,
          notes: input.notes ?? null,
        },
      });

  await logAudit({
    actorUserId: input.actorUserId,
    entityType: "StudentTeacherAssignment",
    entityId: link.id,
    action: existing ? "student_teacher.reactivated" : "student_teacher.linked",
    summary: `Öğrenci–öğretmen bağlantısı: ${subject}`,
    payload: { studentId: student.id, teacherId: teacher.id, subject },
  });

  return link;
}

export async function unlinkStudentTeacher(input: {
  linkId: string;
  actorUserId: string;
}) {
  const link = await prisma.studentTeacherAssignment.findUnique({
    where: { id: input.linkId },
  });
  if (!link || !link.active) {
    throw new StudentTeacherLinkError("NOT_FOUND", "Bağlantı bulunamadı.");
  }

  const updated = await prisma.studentTeacherAssignment.update({
    where: { id: link.id },
    data: { active: false, endedAt: new Date() },
  });

  await logAudit({
    actorUserId: input.actorUserId,
    entityType: "StudentTeacherAssignment",
    entityId: link.id,
    action: "student_teacher.unlinked",
    summary: `Öğrenci–öğretmen bağlantısı kaldırıldı: ${link.subject}`,
    payload: { studentId: link.studentId, teacherId: link.teacherId, subject: link.subject },
  });

  return updated;
}

/** Öğretmen yatay yetki: grup veya branş ilişkisi. */
export async function teacherCanAccessStudent(
  teacherUserId: string,
  studentProfileId: string,
): Promise<boolean> {
  const [enrollment, direct] = await Promise.all([
    prisma.enrollment.findFirst({
      where: {
        studentId: studentProfileId,
        endedAt: null,
        group: { teacherId: teacherUserId, isActive: true },
      },
      select: { id: true },
    }),
    prisma.studentTeacherAssignment.findFirst({
      where: {
        studentId: studentProfileId,
        teacherId: teacherUserId,
        active: true,
        endedAt: null,
      },
      select: { id: true },
    }),
  ]);
  return Boolean(enrollment || direct);
}
