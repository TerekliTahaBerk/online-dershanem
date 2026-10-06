import "server-only";

import { Prisma, type ProductStaffAssignmentSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { isValidStaffAssignment, type StaffProductCode, type StaffRoleName } from "@/lib/products/staff-permission-matrix";

/**
 * Ürün personel sorumluluğu yazma yolu — TEK yer.
 *
 * Geçmiş korunur: verme YENİ satır açar, iptal satırı KAPATIR; satır silinmez
 * ve yeniden kullanılmaz. "Bir aktif satır" kuralını SQL kısmi tekil indeksi
 * (`product_staff_assignments_one_active`) korur; çakışma = zaten aktif
 * (idempotent). COACH@OK, geçiş süresince `TeacherProfile.isCoach` ile çift
 * yazılır (Phase 9'da `isCoach` okumaları kaldırılır).
 */

export class StaffAssignmentError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Son taşıyıcı uyarısı (engellemez): ADMIN her zaman yayınlayabilir. */
const LAST_HOLDER_WARNING_ROLES: readonly StaffRoleName[] = ["RESULT_PUBLISHER", "EXAM_OPERATOR"];

async function productIdFor(code: StaffProductCode) {
  const product = await prisma.product.findUnique({ where: { code }, select: { id: true } });
  if (!product) throw new StaffAssignmentError("Ürün kaydı bulunamadı.", 404);
  return product.id;
}

export async function grantStaffRole(input: {
  userId: string;
  productCode: StaffProductCode;
  role: StaffRoleName;
  actorUserId: string | null;
  reason: string | null;
  source?: ProductStaffAssignmentSource;
}) {
  if (!isValidStaffAssignment(input.productCode, input.role)) {
    throw new StaffAssignmentError("Bu rol bu üründe geçerli değil.", 400);
  }
  const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { id: true, role: true, status: true } });
  if (!user) throw new StaffAssignmentError("Kullanıcı bulunamadı.", 404);
  if (user.role === "ADMIN") throw new StaffAssignmentError("Yönetici tüm ürün yetkilerine zaten sahiptir.", 400);
  if (user.role !== "TEACHER") throw new StaffAssignmentError("Ürün sorumluluğu yalnız personel (öğretmen) hesaplarına verilir.", 400);
  if (user.status === "ARCHIVED") throw new StaffAssignmentError("Arşivlenmiş hesaba yetki verilemez.", 409);

  const productId = await productIdFor(input.productCode);
  const existing = await prisma.productStaffAssignment.findFirst({
    where: { userId: user.id, productId, role: input.role, revokedAt: null },
    select: { id: true },
  });
  if (existing) return { assignmentId: existing.id, created: false };

  try {
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.productStaffAssignment.create({
        data: {
          userId: user.id,
          productId,
          role: input.role,
          source: input.source ?? "MANUAL",
          grantedById: input.actorUserId,
          grantReason: input.reason,
        },
        select: { id: true },
      });
      if (input.role === "COACH") {
        await tx.teacherProfile.upsert({
          where: { userId: user.id },
          create: { userId: user.id, isCoach: true },
          update: { isCoach: true },
        });
      }
      return row;
    });
    await logAudit({
      actorUserId: input.actorUserId,
      entityType: "ProductStaffAssignment",
      entityId: created.id,
      action: "product_staff.granted",
      summary: `${input.productCode} · ${input.role} verildi`,
      payload: { userId: user.id, product: input.productCode, role: input.role, reason: input.reason, source: input.source ?? "MANUAL" },
    });
    return { assignmentId: created.id, created: true };
  } catch (error) {
    // Kısmi tekil indeks: eşzamanlı ikinci verme → zaten aktif.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const row = await prisma.productStaffAssignment.findFirst({ where: { userId: user.id, productId, role: input.role, revokedAt: null }, select: { id: true } });
      if (row) return { assignmentId: row.id, created: false };
    }
    throw error;
  }
}

export async function revokeStaffRole(input: { assignmentId: string; userId: string; actorUserId: string; reason: string | null }) {
  const row = await prisma.productStaffAssignment.findFirst({
    where: { id: input.assignmentId, userId: input.userId },
    select: { id: true, role: true, revokedAt: true, productId: true, product: { select: { code: true } } },
  });
  if (!row) throw new StaffAssignmentError("Atama bulunamadı.", 404);
  if (row.revokedAt) return { revoked: false, lastHolderWarning: false };

  const now = new Date();
  const changed = await prisma.$transaction(async (tx) => {
    const updated = await tx.productStaffAssignment.updateMany({
      where: { id: row.id, revokedAt: null },
      data: { revokedAt: now, revokedById: input.actorUserId, revokeReason: input.reason },
    });
    if (updated.count && row.role === "COACH") {
      await tx.teacherProfile.updateMany({ where: { userId: input.userId }, data: { isCoach: false } });
    }
    return updated.count > 0;
  });
  if (!changed) return { revoked: false, lastHolderWarning: false };

  const lastHolderWarning = LAST_HOLDER_WARNING_ROLES.includes(row.role as StaffRoleName)
    ? (await prisma.productStaffAssignment.count({ where: { productId: row.productId, role: row.role, revokedAt: null } })) === 0
    : false;
  await logAudit({
    actorUserId: input.actorUserId,
    entityType: "ProductStaffAssignment",
    entityId: row.id,
    action: "product_staff.revoked",
    summary: `${row.product.code} · ${row.role} iptal edildi`,
    payload: { userId: input.userId, product: row.product.code, role: row.role, reason: input.reason, lastHolderWarning },
  });
  return { revoked: true, lastHolderWarning };
}

export type StaffAssignmentHistoryRow = {
  id: string;
  productCode: string;
  role: StaffRoleName;
  source: ProductStaffAssignmentSource;
  grantedAt: string;
  grantedBy: string | null;
  grantReason: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revokeReason: string | null;
  /** Aktif satır ve bu rolün başka aktif (yönetici olmayan) taşıyıcısı yoksa. */
  lastHolder: boolean;
};

export async function listStaffAssignmentHistory(userId: string): Promise<StaffAssignmentHistoryRow[]> {
  const rows = await prisma.productStaffAssignment.findMany({
    where: { userId },
    orderBy: [{ revokedAt: { sort: "asc", nulls: "first" } }, { grantedAt: "desc" }],
    select: {
      id: true,
      role: true,
      source: true,
      productId: true,
      grantedAt: true,
      grantReason: true,
      revokedAt: true,
      revokeReason: true,
      product: { select: { code: true } },
      grantedBy: { select: { fullName: true, email: true } },
      revokedBy: { select: { fullName: true, email: true } },
    },
  });
  const activeWarnRows = rows.filter((row) => !row.revokedAt && LAST_HOLDER_WARNING_ROLES.includes(row.role as StaffRoleName));
  const holderCounts = await Promise.all(
    activeWarnRows.map((row) => prisma.productStaffAssignment.count({ where: { productId: row.productId, role: row.role, revokedAt: null } })),
  );
  const lastHolderIds = new Set(activeWarnRows.filter((_, index) => holderCounts[index] === 1).map((row) => row.id));
  return rows.map((row) => ({
    id: row.id,
    productCode: row.product.code,
    role: row.role as StaffRoleName,
    source: row.source,
    grantedAt: row.grantedAt.toISOString(),
    grantedBy: row.grantedBy ? row.grantedBy.fullName || row.grantedBy.email : null,
    grantReason: row.grantReason,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    revokedBy: row.revokedBy ? row.revokedBy.fullName || row.revokedBy.email : null,
    revokeReason: row.revokeReason,
    lastHolder: lastHolderIds.has(row.id),
  }));
}
