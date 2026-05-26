"use server";

/**
 * Admin OD siparişleri için server actions — Sprint 5 / FAZ 1.
 *
 * Tüm aksiyonlar:
 *  - `requirePanelRole("admin")` ile guard'lı
 *  - `logAudit` ile iz bırakır (ORDER_MARK_PAID_MANUAL / ORDER_MARK_CANCELLED / ORDER_MARK_REFUNDED)
 *  - İlgili sayfaları `revalidatePath` ile invalidate eder
 *  - `lib/od/finance.ts` helper'larını çağırır (idempotent)
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { logAudit } from "@/lib/audit";
import {
  markOdOrderPaid,
  markOdOrderCancelled,
  markOdOrderRefunded,
} from "@/lib/od/finance";

function pathsToRevalidate(orderId: string): string[] {
  return [
    "/panel/admin/od-siparisler",
    `/panel/admin/od-siparisler/${orderId}`,
    "/panel/admin/muhasebe",
    "/panel/admin/odemeler",
  ];
}

function revalidateAll(orderId: string): void {
  for (const p of pathsToRevalidate(orderId)) revalidatePath(p);
}

/**
 * Manuel "ödendi" işaretle — örn. havale/EFT alındığında, PayTR dışı
 * tahsilat. En son PENDING ödemeyi SUCCEEDED yapar, ardından
 * `markOdOrderPaid` (idempotent) çağırır → AccountingEntry + email +
 * (callback'le aynı path olduğu için duplicate guard'lı).
 *
 * NOT: Callback'te de aynı `markOdOrderPaid` çağrılırsa idempotent — duplicate accounting yazılmaz.
 */
export async function markOdOrderPaidManualAction(orderId: string): Promise<void> {
  const ctx = await requirePanelRole("admin");

  const order = await prisma.odOrder.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, totalCents: true },
  });
  if (!order) throw new Error("Sipariş bulunamadı.");
  if (order.status === "REFUNDED" || order.status === "CANCELLED") {
    throw new Error(
      `${order.status} durumundaki sipariş ödendi olarak işaretlenemez.`,
    );
  }

  // En son PENDING ödeme varsa SUCCEEDED'a çek
  const pendingPayment = await prisma.odPayment.findFirst({
    where: { orderId: order.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (pendingPayment) {
    await prisma.odPayment.update({
      where: { id: pendingPayment.id },
      data: {
        status: "SUCCEEDED",
        paidAt: new Date(),
        failureReason: null,
      },
    });
  } else if (order.status !== "PAID") {
    // Hiç ödeme satırı yoksa MANUAL provider ile bir tane oluştur
    await prisma.odPayment.create({
      data: {
        orderId: order.id,
        provider: "MANUAL",
        status: "SUCCEEDED",
        amountCents: order.totalCents,
        paidAt: new Date(),
      },
    });
  }

  await markOdOrderPaid(order.id, { actorUserId: ctx.userId });

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "OdOrder",
    entityId: order.id,
    action: "ORDER_MARK_PAID_MANUAL",
    summary: `OD sipariş manuel ÖDENDİ işaretlendi (${(order.totalCents / 100).toLocaleString("tr-TR")} ₺)`,
  });

  revalidateAll(order.id);
}

/**
 * PENDING siparişi iptal et — refund değildir (ödenmemiş sipariş).
 * Reason zorunlu değil ama önerilir; FormData üzerinden gelir.
 */
export async function markOdOrderCancelledAction(
  orderId: string,
  fd: FormData,
): Promise<void> {
  const ctx = await requirePanelRole("admin");
  const reason = (fd.get("reason") as string | null)?.trim() || null;

  await markOdOrderCancelled(orderId, {
    actorUserId: ctx.userId,
    reason,
  });

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "OdOrder",
    entityId: orderId,
    action: "ORDER_MARK_CANCELLED",
    summary: `OD sipariş iptal: ${reason || "(sebep belirtilmedi)"}`,
    payload: reason ? { reason } : null,
  });

  revalidateAll(orderId);
}

/**
 * PAID siparişi iade et — reversal AccountingEntry yazar (idempotent).
 *
 * UYARI: StudentPackage otomatik revoke EDİLMEZ. Eğer admin daha önce
 * öğrenciye manuel paket/ders ataması yapmışsa, erişimi admin manuel
 * kontrol etmelidir (UI'da banner var).
 */
export async function markOdOrderRefundedAction(
  orderId: string,
  fd: FormData,
): Promise<void> {
  const ctx = await requirePanelRole("admin");
  const reason = (fd.get("reason") as string | null)?.trim() || null;

  const result = await markOdOrderRefunded(orderId, {
    actorUserId: ctx.userId,
    reason,
  });

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "OdOrder",
    entityId: orderId,
    action: "ORDER_MARK_REFUNDED",
    summary: `OD sipariş iade edildi: ${reason || "(sebep belirtilmedi)"}`,
    payload: {
      reason,
      refundEntryId: result.refundEntryId,
    },
  });

  revalidateAll(orderId);
}
