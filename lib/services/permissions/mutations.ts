"use server";

import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/rbac/define-action";
import {
  togglePermissionSchema,
  userOverrideSchema,
  removeUserOverrideSchema,
} from "./schemas";
import { revalidatePath } from "next/cache";

export const toggleRolePermission = defineAction({
  input: togglePermissionSchema,
  permission: "permissions.write",
  audit: { entityType: "RolePermission", action: "toggle" },
  async handler({ input }) {
    const perm = await prisma.permission.findUnique({
      where: { key: input.permissionKey },
    });
    if (!perm) throw new Error(`Permission not found: ${input.permissionKey}`);

    if (input.granted) {
      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role: input.role, permissionId: perm.id } },
        create: { role: input.role, permissionId: perm.id },
        update: {},
      });
    } else {
      await prisma.rolePermission.deleteMany({
        where: { role: input.role, permissionId: perm.id },
      });
    }
    revalidatePath("/v2/admin/izinler");
    return { ok: true };
  },
});

export const setUserOverride = defineAction({
  input: userOverrideSchema,
  permission: "permissions.write",
  audit: { entityType: "UserPermissionOverride", action: "set" },
  async handler({ input }) {
    const perm = await prisma.permission.findUnique({
      where: { key: input.permissionKey },
    });
    if (!perm) throw new Error(`Permission not found: ${input.permissionKey}`);

    await prisma.userPermissionOverride.upsert({
      where: {
        userId_permissionId: { userId: input.userId, permissionId: perm.id },
      },
      create: {
        userId: input.userId,
        permissionId: perm.id,
        granted: input.granted,
        reason: input.reason ?? null,
      },
      update: { granted: input.granted, reason: input.reason ?? null },
    });
    revalidatePath("/v2/admin/izinler");
    return { ok: true };
  },
});

export const removeUserOverride = defineAction({
  input: removeUserOverrideSchema,
  permission: "permissions.write",
  audit: { entityType: "UserPermissionOverride", action: "remove" },
  async handler({ input }) {
    const perm = await prisma.permission.findUnique({
      where: { key: input.permissionKey },
    });
    if (!perm) throw new Error(`Permission not found: ${input.permissionKey}`);

    await prisma.userPermissionOverride.deleteMany({
      where: { userId: input.userId, permissionId: perm.id },
    });
    revalidatePath("/v2/admin/izinler");
    return { ok: true };
  },
});
