// lib/assignments.ts — Assignment & submission helpers + auto inbox notifications
import "server-only";
import { prisma } from "./prisma";
import { publishInboxMessage } from "./inbox";

export interface CreateAssignmentInput {
  teacherId: string;
  title: string;
  description?: string | null;
  subject?: string | null;
  dueAt?: Date | null;
  maxScore?: number | null;
  attachmentUrl?: string | null;
  classroomId?: string | null;
  studentId?: string | null;
}

export async function createAssignment(input: CreateAssignmentInput) {
  if (!input.classroomId && !input.studentId) {
    throw new Error("Sınıf veya öğrenci seçilmelidir.");
  }

  const assignment = await prisma.assignment.create({
    data: {
      teacherId: input.teacherId,
      title: input.title,
      description: input.description ?? null,
      subject: input.subject ?? null,
      dueAt: input.dueAt ?? null,
      maxScore: input.maxScore ?? null,
      attachmentUrl: input.attachmentUrl ?? null,
      classroomId: input.classroomId ?? null,
      studentId: input.studentId ?? null,
      status: "PUBLISHED",
    },
  });

  // Hedef öğrencileri belirle ve PENDING submission oluştur, bildirim at
  let targetStudents: { id: string; userId: string | null; parents: { parent: { userId: string | null } }[] }[] = [];
  if (input.studentId) {
    const s = await prisma.student.findUnique({
      where: { id: input.studentId },
      select: { id: true, userId: true, parents: { select: { parent: { select: { userId: true } } } } },
    });
    if (s) targetStudents = [s];
  } else if (input.classroomId) {
    const cs = await prisma.classroomStudent.findMany({
      where: { classroomId: input.classroomId, leftAt: null },
      select: {
        student: {
          select: { id: true, userId: true, parents: { select: { parent: { select: { userId: true } } } } },
        },
      },
    });
    targetStudents = cs.map((x: any) => x.student);
  }

  if (targetStudents.length > 0) {
    await prisma.assignmentSubmission.createMany({
      data: targetStudents.map((s) => ({
        assignmentId: assignment.id,
        studentId: s.id,
        status: "PENDING" as const,
      })),
      skipDuplicates: true,
    });

    for (const s of targetStudents) {
      const recipients = new Set<string>();
      if (s.userId) recipients.add(s.userId);
      for (const p of s.parents) {
        if (p.parent.userId) recipients.add(p.parent.userId);
      }
      const dueStr = input.dueAt
        ? `Son tarih: ${input.dueAt.toLocaleDateString("tr-TR")}`
        : "";
      for (const recipientId of recipients) {
        await publishInboxMessage({
          recipientUserId: recipientId,
          category: "ASSIGNMENT",
          priority: "NORMAL",
          title: `Yeni ödev: ${input.title}`,
          body: dueStr || "Yeni bir ödev verildi.",
          relatedEntityType: "Assignment",
          relatedEntityId: assignment.id,
        });
      }
    }
  }

  return assignment;
}

export async function submitAssignment(input: {
  assignmentId: string;
  studentId: string;
  content?: string | null;
  attachmentUrl?: string | null;
}) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: input.assignmentId },
    select: { id: true, dueAt: true, teacher: { select: { userId: true } }, title: true },
  });
  if (!assignment) throw new Error("Ödev bulunamadı");

  const isLate = assignment.dueAt ? new Date() > assignment.dueAt : false;
  const status = isLate ? "LATE" : "SUBMITTED";

  const sub = await prisma.assignmentSubmission.upsert({
    where: { assignmentId_studentId: { assignmentId: input.assignmentId, studentId: input.studentId } },
    create: {
      assignmentId: input.assignmentId,
      studentId: input.studentId,
      content: input.content ?? null,
      attachmentUrl: input.attachmentUrl ?? null,
      status: status as any,
      submittedAt: new Date(),
    },
    update: {
      content: input.content ?? null,
      attachmentUrl: input.attachmentUrl ?? null,
      status: status as any,
      submittedAt: new Date(),
    },
  });

  // Notify teacher
  if (assignment.teacher?.userId) {
    const student = await prisma.student.findUnique({
      where: { id: input.studentId },
      select: { fullName: true },
    });
    await publishInboxMessage({
      recipientUserId: assignment.teacher.userId,
      category: "ASSIGNMENT",
      priority: isLate ? "HIGH" : "NORMAL",
      title: `Teslim: ${assignment.title}`,
      body: `${student?.fullName ?? "Öğrenci"} ödevini ${isLate ? "geç teslim etti" : "teslim etti"}.`,
      relatedEntityType: "AssignmentSubmission",
      relatedEntityId: sub.id,
    });
  }

  return sub;
}

export async function gradeSubmission(input: {
  submissionId: string;
  score: number;
  feedback?: string | null;
}) {
  const sub = await prisma.assignmentSubmission.update({
    where: { id: input.submissionId },
    data: {
      score: input.score,
      feedback: input.feedback ?? null,
      status: "GRADED",
      gradedAt: new Date(),
    },
    include: {
      student: { select: { userId: true, fullName: true, parents: { select: { parent: { select: { userId: true } } } } } },
      assignment: { select: { title: true } },
    },
  });

  const recipients = new Set<string>();
  if (sub.student.userId) recipients.add(sub.student.userId);
  for (const p of sub.student.parents) {
    if (p.parent.userId) recipients.add(p.parent.userId);
  }
  for (const recipientId of recipients) {
    await publishInboxMessage({
      recipientUserId: recipientId,
      category: "ASSIGNMENT",
      priority: "NORMAL",
      title: `Ödev notlandırıldı: ${sub.assignment.title}`,
      body: `Notunuz: ${input.score}${input.feedback ? ` · ${input.feedback}` : ""}`,
      relatedEntityType: "AssignmentSubmission",
      relatedEntityId: sub.id,
    });
  }

  return sub;
}
