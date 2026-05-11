"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/rbac/define-action";
import {
  packageCreateSchema,
  packageUpdateSchema,
  packageDeleteSchema,
} from "./schemas";

export const createPackageAction = defineAction({
  input: packageCreateSchema,
  permission: "packages.write",
  audit: { entityType: "Package", action: "create", entityId: ({ output }) => (output as any)?.id ?? "—" },
  async handler({ input }) {
    const p = await prisma.package.create({
      data: {
        name: input.name,
        type: input.type,
        description: input.description ?? null,
        price: input.price,
        paytrLink: input.paytrLink ?? null,
        lessonCount: input.lessonCount,
        subjects: input.subjects,
        isActive: input.isActive,
      },
      select: { id: true, name: true },
    });
    revalidatePath("/v2/admin/paketler");
    return p;
  },
});

export const updatePackageAction = defineAction({
  input: packageUpdateSchema,
  permission: "packages.write",
  audit: { entityType: "Package", action: "update", entityId: ({ input }) => input.id },
  async handler({ input }) {
    const { id, ...rest } = input;
    const p = await prisma.package.update({
      where: { id },
      data: {
        ...(rest.name !== undefined && { name: rest.name }),
        ...(rest.type !== undefined && { type: rest.type }),
        ...(rest.description !== undefined && { description: rest.description ?? null }),
        ...(rest.price !== undefined && { price: rest.price }),
        ...(rest.paytrLink !== undefined && { paytrLink: rest.paytrLink ?? null }),
        ...(rest.lessonCount !== undefined && { lessonCount: rest.lessonCount }),
        ...(rest.subjects !== undefined && { subjects: rest.subjects }),
        ...(rest.isActive !== undefined && { isActive: rest.isActive }),
      },
      select: { id: true, name: true },
    });
    revalidatePath("/v2/admin/paketler");
    return p;
  },
});

export const deletePackageAction = defineAction({
  input: packageDeleteSchema,
  permission: "packages.delete",
  audit: { entityType: "Package", action: "delete", entityId: ({ input }) => input.id },
  async handler({ input }) {
    await prisma.package.delete({ where: { id: input.id } });
    revalidatePath("/v2/admin/paketler");
    return { id: input.id };
  },
});
