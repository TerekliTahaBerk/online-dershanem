"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/rbac/define-action";
import {
  classroomCreateSchema,
  classroomUpdateSchema,
  classroomDeleteSchema,
} from "./schemas";

export const createClassroomAction = defineAction({
  input: classroomCreateSchema,
  permission: "classrooms.write",
  audit: { entityType: "Classroom", action: "create", entityId: async ({ output }) => (output as any)?.id ?? "—" },
  async handler({ input }) {
    const c = await prisma.classroom.create({
      data: {
        name: input.name,
        branch: input.branch ?? null,
        level: input.level,
        capacity: input.capacity,
        description: input.description ?? null,
        isActive: input.isActive,
      },
      select: { id: true, name: true },
    });
    revalidatePath("/v2/admin/siniflar");
    return c;
  },
});

export const updateClassroomAction = defineAction({
  input: classroomUpdateSchema,
  permission: "classrooms.write",
  audit: { entityType: "Classroom", action: "update", entityId: async ({ input }) => input.id },
  async handler({ input }) {
    const { id, ...rest } = input;
    const c = await prisma.classroom.update({
      where: { id },
      data: {
        ...(rest.name !== undefined && { name: rest.name }),
        ...(rest.branch !== undefined && { branch: rest.branch ?? null }),
        ...(rest.level !== undefined && { level: rest.level }),
        ...(rest.capacity !== undefined && { capacity: rest.capacity }),
        ...(rest.description !== undefined && { description: rest.description ?? null }),
        ...(rest.isActive !== undefined && { isActive: rest.isActive }),
      },
      select: { id: true, name: true },
    });
    revalidatePath("/v2/admin/siniflar");
    return c;
  },
});

export const deleteClassroomAction = defineAction({
  input: classroomDeleteSchema,
  permission: "classrooms.delete",
  audit: { entityType: "Classroom", action: "delete", entityId: async ({ input }) => input.id },
  async handler({ input }) {
    await prisma.classroom.delete({ where: { id: input.id } });
    revalidatePath("/v2/admin/siniflar");
    return { id: input.id };
  },
});
