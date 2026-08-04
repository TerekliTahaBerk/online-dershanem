import "server-only";
import { notFound } from "next/navigation";
import type { BusinessRole } from "@prisma/client";
import { getSession, type SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export type BusinessPermission =
  | "dashboard:read" | "conversation:read" | "conversation:reply"
  | "lead:read" | "lead:write" | "campaign:read" | "campaign:write"
  | "finance:read" | "finance:write" | "finance:reverse"
  | "knowledge:write" | "automation:write" | "integration:write" | "audit:read";

const ROLE_PERMISSIONS: Record<BusinessRole, readonly BusinessPermission[]> = {
  SUPER_ADMIN: ["dashboard:read", "conversation:read", "conversation:reply", "lead:read", "lead:write", "campaign:read", "campaign:write", "finance:read", "finance:write", "finance:reverse", "knowledge:write", "automation:write", "integration:write", "audit:read"],
  ADMIN: ["dashboard:read", "conversation:read", "conversation:reply", "lead:read", "lead:write", "campaign:read", "campaign:write", "finance:read", "finance:write", "knowledge:write", "automation:write", "integration:write", "audit:read"],
  SALES: ["dashboard:read", "conversation:read", "conversation:reply", "lead:read", "lead:write", "campaign:read"],
  SUPPORT: ["dashboard:read", "conversation:read", "conversation:reply", "lead:read"],
  ACCOUNTING: ["dashboard:read", "campaign:read", "finance:read", "finance:write", "finance:reverse"],
  VIEWER: ["dashboard:read", "conversation:read", "lead:read", "campaign:read", "finance:read"],
};

export function roleHasPermission(role: BusinessRole, permission: BusinessPermission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export async function getBusinessAccess(session: SessionUser, permission: BusinessPermission) {
  if (session.role === "ADMIN") {
    const units = await prisma.businessUnit.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true, product: true } });
    return { role: "SUPER_ADMIN" as const, units };
  }
  const assignments = await prisma.businessRoleAssignment.findMany({
    where: { userId: session.userId, businessUnit: { isActive: true } },
    include: { businessUnit: { select: { id: true, code: true, name: true, product: true } } },
  });
  const allowed = assignments.filter((item) => roleHasPermission(item.role, permission));
  return { role: allowed[0]?.role ?? null, units: allowed.map((item) => item.businessUnit) };
}

export async function requireBusinessPage(permission: BusinessPermission) {
  const session = await getSession();
  if (!session || session.mustChangePassword) notFound();
  const access = await getBusinessAccess(session, permission);
  if (!access.role || access.units.length === 0) notFound();
  return { session, ...access };
}

export async function authorizeBusinessRequest(permission: BusinessPermission) {
  const session = await getSession();
  if (!session || session.mustChangePassword) return null;
  const access = await getBusinessAccess(session, permission);
  return access.role && access.units.length ? { session, ...access } : null;
}
