"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/rbac/define-action";
import { broadcastNotification, createNotification, parentUserIdsForStudents } from "@/lib/notifications";
import {
  assignmentCreateSchema,
  assignmentUpdateSchema,
  assignmentDeleteSchema,
} from "./schemas";

export const createAssignmentAction = defineAction({
  input: assignmentCreateSchema,
  permission: "assignments.write",
  audit: { entityType: "Assignment", action: "create", entityId: ({ output }) => (output as any)?.id ?? "—" },
  async handler({ input }) {
    const a = await prisma.assignment.create({
      data: {
        teacherId: input.teacherId,
        classroomId: input.classroomId ?? null,
        studentId: input.studentId ?? null,
        title: input.title,
        description: input.description ?? null,
        subject: input.subject ?? null,
        dueAt: input.dueAt ?? null,
        maxScore: input.maxScore ?? null,
        attachmentUrl: input.attachmentUrl ?? null,
        status: input.status,
      },
      select: { id: true },
    });

    // 🔔 Notify students (only if PUBLISHED)
    if (input.status === "PUBLISHED") {
      const userIds: string[] = [];
      const studentIds: string[] = [];
      if (input.studentId) {
        studentIds.push(input.studentId);
        const s = await prisma.student.findUnique({
          where: { id: input.studentId },
          select: { userId: true },
        });
        if (s?.userId) userIds.push(s.userId);
      } else if (input.classroomId) {
        const rows = await prisma.classroomStudent.findMany({
          where: { classroomId: input.classroomId },
          select: { studentId: true, student: { select: { userId: true } } },
        });
        rows.forEach((r) => {
          studentIds.push(r.studentId);
          if (r.student.userId) userIds.push(r.student.userId);
        });
      }
      if (userIds.length > 0) {
        const dueText = input.dueAt
          ? ` · Son teslim: ${new Date(input.dueAt).toLocaleString("tr-TR", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "";
        await broadcastNotification(userIds, {
          type: "CONTENT",
          priority: "NORMAL",
          title: `Yeni ödev: ${input.title}`,
          body: `${input.subject ? input.subject + " · " : ""}${input.title}${dueText}`,
          href: `/v2/panel/odevler/${a.id}`,
        });

        // 🔔 Parents
        const parentIds = await parentUserIdsForStudents(studentIds);
        if (parentIds.length > 0) {
          await broadcastNotification(parentIds, {
            type: "CONTENT",
            priority: "LOW",
            title: `Çocuğunuza yeni ödev verildi`,
            body: `${input.title}${input.subject ? ` · ${input.subject}` : ""}`,
            href: `/v2/veli/odevler`,
          });
        }
      }
    }

    revalidatePath("/v2/admin/odevler");
    return a;
  },
});

export const updateAssignmentAction = defineAction({
  input: assignmentUpdateSchema,
  permission: "assignments.write",
  audit: { entityType: "Assignment", action: "update", entityId: ({ input }) => input.id },
  async handler({ input }) {
    const { id, ...rest } = input;
    const a = await prisma.assignment.update({
      where: { id },
      data: {
        ...(rest.teacherId !== undefined && { teacherId: rest.teacherId }),
        ...(rest.classroomId !== undefined && { classroomId: rest.classroomId ?? null }),
        ...(rest.studentId !== undefined && { studentId: rest.studentId ?? null }),
        ...(rest.title !== undefined && { title: rest.title }),
        ...(rest.description !== undefined && { description: rest.description ?? null }),
        ...(rest.subject !== undefined && { subject: rest.subject ?? null }),
        ...(rest.dueAt !== undefined && { dueAt: rest.dueAt ?? null }),
        ...(rest.maxScore !== undefined && { maxScore: rest.maxScore ?? null }),
        ...(rest.attachmentUrl !== undefined && { attachmentUrl: rest.attachmentUrl ?? null }),
        ...(rest.status !== undefined && { status: rest.status }),
      },
      select: { id: true },
    });
    revalidatePath("/v2/admin/odevler");
    return a;
  },
});

export const deleteAssignmentAction = defineAction({
  input: assignmentDeleteSchema,
  permission: "assignments.write",
  audit: { entityType: "Assignment", action: "delete", entityId: ({ input }) => input.id },
  async handler({ input }) {
    await prisma.assignment.delete({ where: { id: input.id } });
    revalidatePath("/v2/admin/odevler");
    return { id: input.id };
  },
});
