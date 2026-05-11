"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/rbac/define-action";
import {
  parentCreateSchema,
  parentUpdateSchema,
  parentDeleteSchema,
  parentLinkStudentSchema,
  parentUnlinkStudentSchema,
} from "./schemas";

function normalizePhoneKey(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D+/g, "");
  if (!digits) return null;
  return digits.slice(-10); // last 10 digits as key
}

export const createParentAction = defineAction({
  input: parentCreateSchema,
  permission: "parents.write",
  audit: { entityType: "Parent", action: "create", entityId: ({ output }) => (output as any)?.id ?? "—" },
  async handler({ input }) {
    const p = await prisma.parent.create({
      data: {
        fullName: input.fullName,
        phone: input.phone ?? null,
        phoneKey: normalizePhoneKey(input.phone),
        email: input.email ?? null,
        notes: input.notes ?? null,
      },
      select: { id: true },
    });
    revalidatePath("/v2/admin/veliler");
    return p;
  },
});

export const updateParentAction = defineAction({
  input: parentUpdateSchema,
  permission: "parents.write",
  audit: { entityType: "Parent", action: "update", entityId: ({ input }) => input.id },
  async handler({ input }) {
    const { id, ...rest } = input;
    const p = await prisma.parent.update({
      where: { id },
      data: {
        ...(rest.fullName !== undefined && { fullName: rest.fullName }),
        ...(rest.phone !== undefined && {
          phone: rest.phone ?? null,
          phoneKey: normalizePhoneKey(rest.phone),
        }),
        ...(rest.email !== undefined && { email: rest.email ?? null }),
        ...(rest.notes !== undefined && { notes: rest.notes ?? null }),
      },
      select: { id: true },
    });
    revalidatePath("/v2/admin/veliler");
    revalidatePath(`/v2/admin/veliler/${id}`);
    return p;
  },
});

export const deleteParentAction = defineAction({
  input: parentDeleteSchema,
  permission: "parents.delete",
  audit: { entityType: "Parent", action: "delete", entityId: ({ input }) => input.id },
  async handler({ input }) {
    await prisma.parent.delete({ where: { id: input.id } });
    revalidatePath("/v2/admin/veliler");
    return { id: input.id };
  },
});

export const linkParentStudentAction = defineAction({
  input: parentLinkStudentSchema,
  permission: "parents.write",
  audit: {
    entityType: "ParentStudent",
    action: "create",
    entityId: ({ input }) => `${input.parentId}:${input.studentId}`,
  },
  async handler({ input }) {
    await prisma.parentStudent.upsert({
      where: { parentId_studentId: { parentId: input.parentId, studentId: input.studentId } },
      create: {
        parentId: input.parentId,
        studentId: input.studentId,
        relationship: input.relationship ?? null,
        isPrimary: input.isPrimary,
      },
      update: {
        relationship: input.relationship ?? null,
        isPrimary: input.isPrimary,
      },
    });
    revalidatePath(`/v2/admin/veliler/${input.parentId}`);
    return { ok: true };
  },
});

export const unlinkParentStudentAction = defineAction({
  input: parentUnlinkStudentSchema,
  permission: "parents.write",
  audit: {
    entityType: "ParentStudent",
    action: "delete",
    entityId: ({ input }) => `${input.parentId}:${input.studentId}`,
  },
  async handler({ input }) {
    await prisma.parentStudent.delete({
      where: { parentId_studentId: { parentId: input.parentId, studentId: input.studentId } },
    });
    revalidatePath(`/v2/admin/veliler/${input.parentId}`);
    return { ok: true };
  },
});
