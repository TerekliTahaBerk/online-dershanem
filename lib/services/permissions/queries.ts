import { prisma } from "@/lib/prisma";
import { PERMISSION_KEYS, defaultRolePermissions, type PermissionKey } from "@/lib/rbac/matrix";

export async function listAllPermissions() {
  const rows = await prisma.permission.findMany({
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });
  return rows;
}

export async function getRolePermissionMatrix() {
  const [permissions, rolePerms] = await Promise.all([
    prisma.permission.findMany({ orderBy: [{ category: "asc" }, { key: "asc" }] }),
    prisma.rolePermission.findMany({ select: { role: true, permissionId: true } }),
  ]);

  const grantedSet = new Set(rolePerms.map((rp) => `${rp.role}::${rp.permissionId}`));

  return {
    permissions,
    isGranted: (role: string, permissionId: string) =>
      grantedSet.has(`${role}::${permissionId}`),
  };
}

export async function listUserOverrides(userId: string) {
  return prisma.userPermissionOverride.findMany({
    where: { userId },
    include: { permission: true },
    orderBy: [{ permission: { category: "asc" } }, { permission: { key: "asc" } }],
  });
}

/** Bir kullanıcının efektif izinleri: rol defaults + DB overrides. */
export async function resolveEffectivePermissions(
  userId: string,
  role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT",
): Promise<PermissionKey[]> {
  const [rolePerms, overrides] = await Promise.all([
    prisma.rolePermission.findMany({
      where: { role },
      include: { permission: true },
    }),
    prisma.userPermissionOverride.findMany({
      where: { userId },
      include: { permission: true },
    }),
  ]);

  const set = new Set<PermissionKey>(
    rolePerms.length > 0
      ? rolePerms.map((rp) => rp.permission.key as PermissionKey)
      : defaultRolePermissions[role],
  );

  for (const o of overrides) {
    const k = o.permission.key as PermissionKey;
    if (o.granted) set.add(k);
    else set.delete(k);
  }

  return Array.from(set);
}

export { PERMISSION_KEYS };
