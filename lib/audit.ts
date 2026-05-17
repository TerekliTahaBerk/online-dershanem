/**
 * Audit log helper.
 *
 * Production-grade requirement: tüm "destructive" veya "para/erişim etkileyici"
 * admin/system action'ları AuditLog tablosuna yazılmalı. Bu helper her zaman
 * non-throwing — audit yazımı asla iş akışını bozmaz.
 *
 * Kullanım:
 *   await logAudit({
 *     actorUserId: session.user.id,
 *     entityType: "OdkOrder",
 *     entityId: order.id,
 *     action: "ORDER_MARKED_PAID",
 *     summary: `Sipariş ${order.id.slice(0,8)} elle ÖDENDİ işaretlendi`,
 *     payload: { packageId: order.packageId, amount: order.amount },
 *   });
 *
 * Geleneksel action isimleri (snake-case SCREAMING):
 *   ACCESS_GRANT, ACCESS_REVOKE, PACKAGE_DELETE, ORDER_MARK_PAID,
 *   ORDER_MARK_CANCELLED, ORDER_MARK_REFUNDED, MANUAL_ORDER_CREATE,
 *   ACCOUNTING_CREATE, ACCOUNTING_UPDATE, ACCOUNTING_DELETE,
 *   STUDENT_DELETE, LESSON_CANCEL, BULK_GRANT_APPLIED, PAYMENT_OVERRIDE.
 */
import "server-only";
import type { AuditActorType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type LogAuditInput = {
  actorUserId?: string | null;
  actorType?: AuditActorType;
  entityType: string;
  entityId: string;
  action: string;
  summary?: string | null;
  payload?: Prisma.InputJsonValue | null;
};

export async function logAudit(input: LogAuditInput): Promise<void> {
  const {
    actorUserId = null,
    actorType = actorUserId ? "USER" : "SYSTEM",
    entityType,
    entityId,
    action,
    summary = null,
    payload = null,
  } = input;

  try {
    await prisma.auditLog.create({
      data: {
        actorUserId,
        actorType,
        entityType,
        entityId,
        action,
        summary,
        payload: payload ?? undefined,
      },
    });
  } catch (err) {
    // Asla throw etme; audit failure parent transaction'ı bozmasın.
    console.warn("[audit] write failed", { entityType, action, err });
  }
}

/** Birden fazla entity tek seferde — örn. bulk grant CSV. */
export async function logAuditMany(
  rows: LogAuditInput[],
): Promise<void> {
  if (rows.length === 0) return;
  try {
    await prisma.auditLog.createMany({
      data: rows.map((r) => ({
        actorUserId: r.actorUserId ?? null,
        actorType: r.actorType ?? (r.actorUserId ? "USER" : "SYSTEM"),
        entityType: r.entityType,
        entityId: r.entityId,
        action: r.action,
        summary: r.summary ?? null,
        payload: (r.payload as Prisma.InputJsonValue | undefined) ?? undefined,
      })),
    });
  } catch (err) {
    console.warn("[audit] bulk write failed", { count: rows.length, err });
  }
}
