"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/rbac/define-action";
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
