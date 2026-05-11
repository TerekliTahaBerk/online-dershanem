"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/rbac/define-action";
import { submitAssignment, gradeSubmission } from "@/lib/assignments";
import { createNotification, parentUserIdsForStudents, broadcastNotification } from "@/lib/notifications";

const submitSchema = z.object({
  assignmentId: z.string().min(1),
  content: z.string().max(10_000).optional().nullable(),
  attachmentUrl: z.string().url().optional().nullable().or(z.literal("")),
});

/**
 * Öğrenci kendi ödevini gönderir. studentId session'dan alınır.
 */
export const submitAssignmentAction = defineAction({
  input: submitSchema,
  permission: "assignments.submit",
  audit: { entityType: "AssignmentSubmission", action: "submit", entityId: async ({ input }) => input.assignmentId },
  async handler({ input, ctx }) {
    const student = await prisma.student.findUnique({
      where: { userId: ctx.user.id },
      select: { id: true },
    });
    if (!student) throw new Error("Öğrenci profili bulunamadı.");

    // Öğrenci sadece kendisine atanmış ya da sınıfında olduğu ödevi gönderebilir.
    const eligible = await prisma.assignment.findFirst({
      where: {
        id: input.assignmentId,
        OR: [
          { studentId: student.id },
          { classroom: { students: { some: { studentId: student.id } } } },
        ],
      },
      select: { id: true },
    });
    if (!eligible) throw new Error("Bu ödevi gönderme yetkiniz yok.");

    const sub = await submitAssignment({
      assignmentId: input.assignmentId,
      studentId: student.id,
      content: input.content ?? null,
      attachmentUrl: input.attachmentUrl || null,
    });

    // 🔔 Notify the teacher
    const meta = await prisma.assignment.findUnique({
      where: { id: input.assignmentId },
      select: {
        title: true,
        teacher: { select: { userId: true } },
        // student name for body
      },
    });
    const me = await prisma.student.findUnique({
      where: { id: student.id },
      select: { fullName: true },
    });
    if (meta?.teacher.userId) {
      await createNotification({
        userId: meta.teacher.userId,
        type: "CONTENT",
        priority: "NORMAL",
        title: `Yeni teslim: ${meta.title}`,
        body: `${me?.fullName ?? "Bir öğrenci"} ödevini gönderdi.`,
        href: `/v2/ogretmen/odevler/${input.assignmentId}`,
      });
    }

    revalidatePath("/v2/panel/odevler");
    revalidatePath(`/v2/panel/odevler/${input.assignmentId}`);
    return { id: sub.id, status: sub.status };
  },
});

const gradeSchema = z.object({
  submissionId: z.string().min(1),
  score: z.coerce.number().int().min(0).max(1000),
  feedback: z.string().max(2000).optional().nullable(),
});

/**
 * Öğretmen ödev gönderimini notlandırır. Yetki kontrolü: ödevi yaratan öğretmen
 * ya da admin.
 */
export const gradeSubmissionAction = defineAction({
  input: gradeSchema,
  permission: "assignments.grade",
  audit: { entityType: "AssignmentSubmission", action: "grade", entityId: async ({ input }) => input.submissionId },
  async handler({ input, ctx }) {
    if (ctx.user.role === "TEACHER") {
      const own = await prisma.assignmentSubmission.findFirst({
        where: {
          id: input.submissionId,
          assignment: { teacher: { userId: ctx.user.id } },
        },
        select: { id: true },
      });
      if (!own) throw new Error("Bu ödevi notlandırma yetkiniz yok.");
    }
    const sub = await gradeSubmission({
      submissionId: input.submissionId,
      score: input.score,
      feedback: input.feedback ?? null,
    });

    // 🔔 Notify the student
    const subInfo = await prisma.assignmentSubmission.findUnique({
      where: { id: input.submissionId },
      select: {
        studentId: true,
        student: { select: { userId: true } },
        assignment: { select: { id: true, title: true, maxScore: true } },
      },
    });
    if (subInfo?.student.userId) {
      const max = subInfo.assignment.maxScore;
      const scoreText = max ? `${input.score}/${max}` : `${input.score}`;
      await createNotification({
        userId: subInfo.student.userId,
        type: "PERFORMANCE",
        priority: "NORMAL",
        title: `Ödevin notlandırıldı: ${subInfo.assignment.title}`,
        body: `Puan: ${scoreText}${
          input.feedback ? ` · ${input.feedback.slice(0, 100)}` : ""
        }`,
        href: `/v2/panel/odevler/${subInfo.assignment.id}`,
      });

      // 🔔 Parents
      const parentIds = await parentUserIdsForStudents([subInfo.studentId]);
      if (parentIds.length > 0) {
        const max2 = subInfo.assignment.maxScore;
        const txt = max2 ? `${input.score}/${max2}` : `${input.score}`;
        await broadcastNotification(parentIds, {
          type: "PERFORMANCE",
          priority: "LOW",
          title: `Çocuğunuzun ödevi notlandırıldı`,
          body: `${subInfo.assignment.title} · Puan: ${txt}`,
          href: `/v2/veli/odevler`,
        });
      }
    }

    revalidatePath("/v2/ogretmen/odevler");
    revalidatePath(`/v2/admin/odevler/${sub.assignmentId}`);
    return { id: sub.id };
  },
});
