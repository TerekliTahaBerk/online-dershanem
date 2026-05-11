"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTeacher, requireStudent } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { createAssignment, submitAssignment, gradeSubmission } from "@/lib/assignments";

const CreateSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  subject: z.string().max(100).optional().nullable(),
  dueAt: z.string().optional().nullable(),
  maxScore: z.coerce.number().int().min(1).max(1000).optional().nullable(),
  attachmentUrl: z.string().url().optional().nullable().or(z.literal("")),
  classroomId: z.string().optional().nullable(),
  studentId: z.string().optional().nullable(),
});

export async function createAssignmentAction(input: z.infer<typeof CreateSchema>) {
  const { teacherId, isAdmin } = await requireTeacher();
  if (!teacherId && !isAdmin) throw new Error("Yetkisiz");
  if (!teacherId) throw new Error("Öğretmen profili bulunamadı");

  const data = CreateSchema.parse(input);

  // Yetki: öğretmen sadece kendi sınıfı/öğrencisi için ödev oluşturabilir
  if (!isAdmin && data.classroomId) {
    const owns = await prisma.classroomTeacher.findUnique({
      where: { classroomId_teacherId: { classroomId: data.classroomId, teacherId } },
      select: { teacherId: true },
    });
    if (!owns) throw new Error("Bu sınıfa erişiminiz yok");
  }

  const a = await createAssignment({
    teacherId,
    title: data.title,
    description: data.description ?? null,
    subject: data.subject ?? null,
    dueAt: data.dueAt ? new Date(data.dueAt) : null,
    maxScore: data.maxScore ?? null,
    attachmentUrl: data.attachmentUrl || null,
    classroomId: data.classroomId || null,
    studentId: data.studentId || null,
  });

  revalidatePath("/ogretmen/odevler");
  return { ok: true as const, id: a.id };
}

const SubmitSchema = z.object({
  assignmentId: z.string().min(1),
  content: z.string().max(5000).optional().nullable(),
  attachmentUrl: z.string().url().optional().nullable().or(z.literal("")),
});

export async function submitAssignmentAction(input: z.infer<typeof SubmitSchema>) {
  const { studentId } = await requireStudent();
  if (!studentId) throw new Error("Öğrenci profili bulunamadı");
  const data = SubmitSchema.parse(input);

  await submitAssignment({
    assignmentId: data.assignmentId,
    studentId,
    content: data.content ?? null,
    attachmentUrl: data.attachmentUrl || null,
  });

  revalidatePath("/panel/odevler");
  return { ok: true as const };
}

const GradeSchema = z.object({
  submissionId: z.string().min(1),
  score: z.coerce.number().int().min(0).max(1000),
  feedback: z.string().max(2000).optional().nullable(),
});

export async function gradeSubmissionAction(input: z.infer<typeof GradeSchema>) {
  const { teacherId, isAdmin } = await requireTeacher();
  if (!teacherId && !isAdmin) throw new Error("Yetkisiz");
  const data = GradeSchema.parse(input);

  if (!isAdmin && teacherId) {
    const sub = await prisma.assignmentSubmission.findUnique({
      where: { id: data.submissionId },
      select: { assignment: { select: { teacherId: true } } },
    });
    if (!sub || sub.assignment.teacherId !== teacherId) throw new Error("Erişim yok");
  }

  await gradeSubmission({
    submissionId: data.submissionId,
    score: data.score,
    feedback: data.feedback ?? null,
  });

  revalidatePath("/ogretmen/odevler");
  return { ok: true as const };
}
