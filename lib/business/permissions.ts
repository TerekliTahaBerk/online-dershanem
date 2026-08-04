import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import type { BusinessRole } from "@prisma/client";
import { getSession, type SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import {
  BUSINESS_ROLE_PERMISSIONS,
  roleHasPermission,
  type BusinessPermission,
} from "@/lib/business/permission-matrix";

/**
 * İşletme Paneli yetkilendirmesi.
 *
 * Erişim TEK kaynaktan çözümlenir: `BusinessRoleAssignment`. Platformun
 * `User.role === "ADMIN"` değeri tek başına hiçbir işletme izni vermez —
 * eğitim tarafındaki yöneticilik ile finans/CRM yetkisi bilinçli olarak
 * ayrıdır. Bir kullanıcı farklı iş birimlerinde farklı rollere sahip olabilir
 * ve her izin kontrolü iş birimi bazında yapılır.
 *
 * Rol → izin tablosu için bkz. `permission-matrix.ts` (saf, test edilebilir).
 * Kilitlenmeyi önleyen kurtarma kapısı için bkz. `bootstrapEmails`.
 */

export { roleHasPermission };
export type { BusinessPermission };

export function permissionsForRole(role: BusinessRole): readonly BusinessPermission[] {
  return BUSINESS_ROLE_PERMISSIONS[role];
}

export type BusinessUnitAccess = {
  id: string;
  code: string;
  name: string;
  product: string;
  role: BusinessRole;
};

export type BusinessAccess = {
  session: SessionUser;
  units: BusinessUnitAccess[];
};

/**
 * Kurtarma kapısı. Yalnız `BUSINESS_BOOTSTRAP_SUPER_ADMIN_EMAILS` içinde
 * açıkça listelenen platform yöneticileri, hiç atamaları yokken SUPER_ADMIN
 * kabul edilir. Normal işleyişte boştur; kullanıldığında uyarı loglanır.
 *
 * Kalıcı çözüm veri tarafındadır: `0014_business_rbac_backfill` migration'ı
 * mevcut platform yöneticilerine gerçek atama satırları oluşturur.
 */
function bootstrapEmails(): Set<string> {
  const raw = process.env.BUSINESS_BOOTSTRAP_SUPER_ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Atama satırları istek başına bir kez okunur. */
const loadAssignments = cache(async (userId: string) => {
  const rows = await prisma.businessRoleAssignment.findMany({
    where: { userId, businessUnit: { isActive: true } },
    select: {
      role: true,
      businessUnit: { select: { id: true, code: true, name: true, product: true } },
    },
  });
  return rows.map((row) => ({ ...row.businessUnit, role: row.role }));
});

const loadActiveUnits = cache(async () =>
  prisma.businessUnit.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true, product: true },
  }),
);

/**
 * Kullanıcının erişebildiği iş birimleri — yalnız istenen izni gerçekten
 * veren roller döner. İzin verilmeyen birim listede yer almaz.
 */
export async function getBusinessAccess(
  session: SessionUser,
  permission: BusinessPermission,
): Promise<BusinessUnitAccess[]> {
  if (session.status !== "ACTIVE" || session.mustChangePassword) return [];

  let assignments = await loadAssignments(session.userId);

  if (assignments.length === 0 && session.role === "ADMIN" && bootstrapEmails().has(session.email.toLowerCase())) {
    const units = await loadActiveUnits();
    if (units.length > 0) {
      log.warn("business.bootstrap_super_admin_used", {
        userId: session.userId,
        unitCount: units.length,
      });
      assignments = units.map((unit) => ({ ...unit, role: "SUPER_ADMIN" as BusinessRole }));
    }
  }

  // Aynı iş biriminde birden çok rol atanmış olabilir (unique kısıt
  // userId+unitId+role üzerindedir). İzni veren ilk rol yeterlidir; birim
  // listede yalnız bir kez yer alır.
  const granted = assignments.filter((unit) => roleHasPermission(unit.role, permission));
  const byUnit = new Map<string, BusinessUnitAccess>();
  for (const unit of granted) if (!byUnit.has(unit.id)) byUnit.set(unit.id, unit);
  return [...byUnit.values()];
}

/**
 * Sayfa guard'ı. Yetkisiz kullanıcıya işletme alanının varlığını sızdırmamak
 * için 403 yerine 404 döner.
 */
export async function requireBusinessPage(permission: BusinessPermission): Promise<BusinessAccess> {
  const session = await getSession();
  if (!session || session.mustChangePassword) notFound();
  const units = await getBusinessAccess(session, permission);
  if (units.length === 0) notFound();
  return { session, units };
}

/** API/route handler guard'ı. Yetkisizde `null` döner. */
export async function authorizeBusinessRequest(
  permission: BusinessPermission,
): Promise<BusinessAccess | null> {
  const session = await getSession();
  if (!session || session.mustChangePassword) return null;
  const units = await getBusinessAccess(session, permission);
  return units.length > 0 ? { session, units } : null;
}

/**
 * Mutasyonun hangi iş biriminde çalışacağını çözümler.
 *
 * Formdan gelen değere ASLA doğrudan güvenilmez; her zaman kullanıcının o
 * izin için erişebildiği birimler arasından doğrulanır. Kullanıcı tek birime
 * erişiyorsa o birim kullanılır; birden fazla birime erişiyorsa seçim
 * zorunludur — sessizce "ilk birim"e yazmak yasaktır.
 */
export function resolveMutationUnit(
  access: BusinessAccess,
  requestedUnitId: unknown,
): BusinessUnitAccess {
  if (typeof requestedUnitId === "string" && requestedUnitId.length > 0) {
    const match = access.units.find((unit) => unit.id === requestedUnitId);
    if (!match) throw new Error("BUSINESS_UNIT_FORBIDDEN");
    return match;
  }
  if (access.units.length === 1) return access.units[0];
  throw new Error("BUSINESS_UNIT_REQUIRED");
}

/** Sorgu kapsamı — kullanıcının o izinle görebildiği birim kimlikleri. */
export function scopedUnitIds(access: BusinessAccess): string[] {
  return access.units.map((unit) => unit.id);
}

/**
 * Kullanıcının bütün iş birimlerindeki izinlerinin birleşimi.
 *
 * Navigasyonda hangi bölümlerin görüneceğini belirlemek için kullanılır.
 * DİKKAT: Bu yalnız görünürlüktür, güvenlik sınırı DEĞİLDİR — her sayfa ve
 * her mutation kendi guard'ını ayrıca çalıştırır.
 */
export async function getUserBusinessPermissions(
  session: SessionUser,
): Promise<Set<BusinessPermission>> {
  const granted = new Set<BusinessPermission>();
  if (session.status !== "ACTIVE" || session.mustChangePassword) return granted;

  let assignments = await loadAssignments(session.userId);
  if (assignments.length === 0 && session.role === "ADMIN" && bootstrapEmails().has(session.email.toLowerCase())) {
    const units = await loadActiveUnits();
    assignments = units.map((unit) => ({ ...unit, role: "SUPER_ADMIN" as BusinessRole }));
  }

  for (const assignment of assignments) {
    for (const permission of BUSINESS_ROLE_PERMISSIONS[assignment.role]) granted.add(permission);
  }
  return granted;
}
