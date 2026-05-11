"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/rbac/define-action";
import {
  teacherCreateSchema,
  teacherUpdateSchema,
  teacherDeleteSchema,
} from "./schemas";

export const createTeacherAction = defineAction({
  input: teacherCreateSchema,
  permission: "teachers.write",
  audit: { entityType: "Teacher", action: "create", entityId: ({ output }) => (output as any)?.id ?? "—" },
  async handler({ input }) {
    const t = await prisma.teacher.create({
      data: {
        fullName: input.fullName,
        email: input.email ?? null,
        phone: input.phone ?? null,
        subjects: input.subjects,
        bio: input.bio ?? null,
        status: input.status,
      },
      select: { id: true, fullName: true },
    });
    revalidatePath("/v2/admin/ogretmenler");
    return t;
  },
});

export const updateTeacherAction = defineAction({
  input: teacherUpdateSchema,
  permission: "teachers.write",
  audit: { entityType: "Teacher", action: "update", entityId: ({ input }) => input.id },
  async handler({ input }) {
    const { id, ...rest } = input;
    const t = await prisma.teacher.update({
      where: { id },
      data: {
        ...(rest.fullName !== undefined && { fullName: rest.fullName }),
        ...(rest.email !== undefined && { email: rest.email ?? null }),
        ...(rest.phone !== undefined && { phone: rest.phone ?? null }),
        ...(rest.subjects !== undefined && { subjects: rest.subjects }),
        ...(rest.bio !== undefined && { bio: rest.bio ?? null }),
        ...(rest.status !== undefined && { status: rest.status }),
      },
      select: { id: true, fullName: true },
    });
    revalidatePath("/v2/admin/ogretmenler");
    return t;
  },
});

export const deleteTeacherAction = defineAction({
  input: teacherDeleteSchema,
  permission: "teachers.delete",
  audit: { entityType: "Teacher", action: "delete", entityId: ({ input }) => input.id },
  async handler({ input }) {
    await prisma.teacher.delete({ where: { id: input.id } });
    revalidatePath("/v2/admin/ogretmenler");
    return { id: input.id };
  },
});
