import "server-only";

import { prisma } from "@/lib/prisma";
import { defaultRolePermissions, type PermissionKey } from "./matrix";

/**
 * Resolve effective permission set for a user:
 *   roleDefaults  ⊕ DB(RolePermission)  ⊕ DB(UserPermissionOverride)
 *
 * UserPermissionOverride.granted=false ⇒ permission removed.
 *
 * If `Permission`/`RolePermission` tables don't exist yet (pre-migration),
 * we gracefully fall back to `defaultRolePermissions`.
 */
export async function resolveUserPermissions(
  userId: string,
  role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT"
): Promise<Set<PermissionKey>> {
  const set = new Set<PermissionKey>(defaultRolePermissions[role]);

  // Try DB-driven permissions; if migration not run yet, swallow & use defaults.
  try {
    // @ts-ignore — model may not exist until migration 0017 applied
    const rolePerms = await prisma.rolePermission.findMany({
      where: { role },
      select: { permission: { select: { key: true } } }
    }).catch(() => [] as Array<{ permission: { key: string } | null }>);

    for (const rp of rolePerms) {
      if (rp.permission?.key) set.add(rp.permission.key as PermissionKey);
    }

    // @ts-ignore — model may not exist until migration 0017 applied
    const overrides = await prisma.userPermissionOverride.findMany({
      where: { userId },
      select: { granted: true, permission: { select: { key: true } } }
    }).catch(() => [] as Array<{ granted: boolean; permission: { key: string } | null }>);

    for (const o of overrides) {
      if (!o.permission?.key) continue;
      if (o.granted) set.add(o.permission.key as PermissionKey);
      else set.delete(o.permission.key as PermissionKey);
    }
  } catch {
    // ignore — fallback to defaults
  }

  return set;
}

/**
 * Synchronous variant for client side — uses defaults only.
 * Server side always uses `resolveUserPermissions` for full enforcement.
 */
export function defaultPermissionsFor(role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT"): Set<PermissionKey> {
  return new Set(defaultRolePermissions[role]);
}

export class ForbiddenError extends Error {
  constructor(public permission: string) {
    super(`Forbidden: missing permission "${permission}"`);
    this.name = "ForbiddenError";
  }
}

export async function enforce(
  userId: string,
  role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT",
  required: PermissionKey | PermissionKey[]
): Promise<void> {
  if (role === "ADMIN") return; // admin bypass
  const set = await resolveUserPermissions(userId, role);
  const keys = Array.isArray(required) ? required : [required];
  for (const k of keys) {
    if (!set.has(k)) throw new ForbiddenError(k);
  }
}
