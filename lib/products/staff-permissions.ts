import "server-only";

import { cache } from "react";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import {
  STAFF_PERMISSIONS,
  decideStaffPermission,
  hasPrivilegedStaffRole,
  staffPermissionsFor,
  staffProductsFor,
  type StaffAssignmentRef,
  type StaffPermission,
  type StaffProductCode,
  type StaffRoleName,
} from "@/lib/products/staff-permission-matrix";
import { teachersWithOdkReportRelationship } from "@/lib/products/staff-assignment-backfill-server";
import { LEGACY_STAFF_PRODUCTS, legacyStaffPermission, staffAssignmentMode } from "@/lib/products/staff-mode";

/**
 * Oturum → aktif `ProductStaffAssignment` satırları → izin.
 *
 * Rol ve durum oturumdan değil VERİTABANINDAN okunur: admin önizleme / öğretmen
 * modu overlay'leri personel yetkisini değiştiremez (içerik RBAC ile aynı kural).
 *
 * Mod (`STAFF_PRODUCT_ASSIGNMENTS`, bkz. staff-mode.ts):
 *  - shadow: karar eski kuraldır; yeni kural farklıysa loglanır.
 *  - enforce: karar atamalardır.
 */

export type StaffAccess = {
  userId: string;
  platformRole: UserRole;
  isActiveUser: boolean;
  assignments: StaffAssignmentRef[];
  permissions: Set<StaffPermission>;
};

export const loadStaffAccess = cache(async (userId: string): Promise<StaffAccess | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      status: true,
      productStaffAssignments: {
        where: { revokedAt: null },
        select: { role: true, product: { select: { code: true } } },
      },
    },
  });
  if (!user) return null;
  const assignments = user.productStaffAssignments.map((row) => ({ productCode: row.product.code, role: row.role as StaffRoleName }));
  return {
    userId,
    platformRole: user.role,
    isActiveUser: user.status === "ACTIVE",
    assignments,
    permissions: user.role === "TEACHER" ? staffPermissionsFor(assignments) : new Set(),
  };
});

/* ------------------------------------------------------------------ *
 * Shadow karşılaştırma logu
 * ------------------------------------------------------------------ */

const SHADOW_LOG_TTL_MS = 60 * 60 * 1000;
const shadowLogged = new Map<string, number>();

function logShadowOnce(key: string, context: Record<string, unknown>) {
  const now = Date.now();
  const last = shadowLogged.get(key);
  if (last && now - last < SHADOW_LOG_TTL_MS) return;
  shadowLogged.set(key, now);
  if (shadowLogged.size > 5_000) shadowLogged.clear();
  log.warn("panel.staff_access_shadow_mismatch", context);
}

/**
 * Personelin bir ürünle GERÇEK, güncel ilişkisi var mı? Shadow farklarını
 * sınıflandırmak için: ilişki varken yeni kural erişimi kesiyorsa `UNEXPECTED`
 * (yönetim ataması gerekir); ilişki yoksa `EXPECTED_NARROWING` (istenen sonuç).
 */
export async function staffProductRelationshipEvidence(userId: string, product: StaffProductCode): Promise<boolean> {
  if (product === "OD") {
    const [group, direct] = await Promise.all([
      prisma.group.findFirst({ where: { teacherId: userId, isActive: true }, select: { id: true } }),
      prisma.studentTeacherAssignment.findFirst({ where: { teacherId: userId, active: true, endedAt: null }, select: { id: true } }),
    ]);
    return Boolean(group || direct);
  }
  if (product === "OK") {
    return Boolean(await prisma.coachAssignment.findFirst({ where: { endedAt: null, coach: { userId } }, select: { id: true } }));
  }
  return (await teachersWithOdkReportRelationship([userId])).has(userId);
}

/* ------------------------------------------------------------------ *
 * Kararlar
 * ------------------------------------------------------------------ */

/**
 * Personelin erişebildiği legacy ürünler (OD / OK / ODK).
 * ADMIN: daima üçü. TEACHER: mod'a göre eski kural ya da atamalar.
 */
export async function staffAccessibleProducts(userId: string, platformRole: UserRole): Promise<StaffProductCode[]> {
  if (platformRole === "ADMIN") return [...LEGACY_STAFF_PRODUCTS];
  if (platformRole !== "TEACHER") return [];
  const mode = staffAssignmentMode();
  if (mode === "legacy") return [...LEGACY_STAFF_PRODUCTS];

  const access = await loadStaffAccess(userId);
  const next = access && access.isActiveUser ? staffProductsFor(access.assignments) : [];
  if (mode === "enforce") return next;

  const missing = LEGACY_STAFF_PRODUCTS.filter((product) => !next.includes(product));
  for (const product of missing) {
    const evidence = await staffProductRelationshipEvidence(userId, product);
    logShadowOnce(`${userId}:product:${product}`, {
      userId,
      kind: "product",
      product,
      legacy: true,
      next: false,
      classification: evidence ? "UNEXPECTED" : "EXPECTED_NARROWING",
    });
  }
  return [...LEGACY_STAFF_PRODUCTS];
}

/** Tek izin kararı. Platform rolü ve durum DB'den okunur. */
export async function hasStaffPermission(userId: string, permission: StaffPermission): Promise<boolean> {
  const access = await loadStaffAccess(userId);
  if (!access) return false;
  const next = decideStaffPermission({
    platformRole: access.platformRole,
    isActiveUser: access.isActiveUser,
    permission,
    assignments: access.assignments,
  });
  const mode = staffAssignmentMode();
  if (mode === "enforce") return next;

  const legacy = access.isActiveUser && legacyStaffPermission(access.platformRole, permission);
  if (mode === "shadow" && legacy !== next) {
    logShadowOnce(`${userId}:permission:${permission}`, { userId, kind: "permission", permission, legacy, next });
  }
  return legacy;
}

/** Kullanıcının etkin izin kümesi (menü ve iniş sayfası için; yetki kararı değildir). */
export async function effectiveStaffPermissions(userId: string): Promise<{ isAdmin: boolean; permissions: Set<StaffPermission> }> {
  const access = await loadStaffAccess(userId);
  if (!access || !access.isActiveUser) return { isAdmin: false, permissions: new Set() };
  if (access.platformRole === "ADMIN") return { isAdmin: true, permissions: new Set() };
  if (access.platformRole !== "TEACHER") return { isAdmin: false, permissions: new Set() };
  if (staffAssignmentMode() === "enforce") return { isAdmin: false, permissions: access.permissions };
  // Eski kural: öğretmen OD/Yön personel izinleri + ilişkili rapor okuma; Deneme Ligi yönetimi yok.
  return { isAdmin: false, permissions: new Set(STAFF_PERMISSIONS.filter((permission) => legacyStaffPermission("TEACHER", permission))) };
}

/**
 * MFA zorunlu mu? ADMIN daima; TEACHER yalnız ayrıcalıklı Deneme Ligi / ürün
 * yöneticisi rolü taşıyorsa (mod'dan bağımsız: rol verildiği anda ikinci faktör
 * istenir, böylece enforce'a geçişte kimse korumasız kalmaz).
 */
export const userRequiresMfa = cache(async (userId: string, platformRole: UserRole): Promise<boolean> => {
  if (platformRole === "ADMIN") return true;
  if (platformRole !== "TEACHER") return false;
  const access = await loadStaffAccess(userId);
  return Boolean(access && hasPrivilegedStaffRole(access.assignments));
});
