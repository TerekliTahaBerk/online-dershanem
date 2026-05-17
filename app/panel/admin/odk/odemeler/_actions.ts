"use server";
import { prisma } from "@/lib/prisma";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import {
  markOdkOrderPaid,
  markOdkOrderRefunded,
} from "@/lib/odk/finance";

/**
 * Ödeme SUCCEEDED işaretlenir + bağlı sipariş PAID akışı tetiklenir
 * (markOdkOrderPaid → entitlement + tag + AccountingEntry).
 */
export async function markOdkPaymentSucceededAction(paymentId: string) {
  const ctx = await requireOdkPanel("admin");
  const payment = await prisma.odkPayment.findUnique({
    where: { id: paymentId },
    select: { id: true, orderId: true, status: true },
  });
  if (!payment) throw new Error("Ödeme bulunamadı.");
  if (payment.status !== "SUCCEEDED") {
    await prisma.odkPayment.update({
      where: { id: payment.id },
      data: { status: "SUCCEEDED", paidAt: new Date(), failureReason: null },
    });
  }
  await markOdkOrderPaid(payment.orderId, { actorUserId: ctx.userId });
  revalidatePath("/panel/admin/odk/odemeler");
  revalidatePath(`/panel/admin/odk/odemeler/${paymentId}`);
  revalidatePath(`/panel/admin/odk/siparisler/${payment.orderId}`);
  revalidatePath("/panel/admin/muhasebe");
}

export async function markOdkPaymentFailedAction(paymentId: string, fd: FormData) {
  const ctx = await requireOdkPanel("admin");
  const reason = (fd.get("reason") as string | null)?.trim() || "Admin tarafından FAILED işaretlendi";
  await prisma.odkPayment.update({
    where: { id: paymentId },
    data: { status: "FAILED", failureReason: reason },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "OdkPayment",
    entityId: paymentId,
    action: "PAYMENT_MARK_FAILED",
    summary: `Ödeme FAILED işaretlendi: ${reason}`,
  });
  revalidatePath("/panel/admin/odk/odemeler");
  revalidatePath(`/panel/admin/odk/odemeler/${paymentId}`);
}

export async function markOdkPaymentRefundedAction(paymentId: string) {
  const ctx = await requireOdkPanel("admin");
  const payment = await prisma.odkPayment.findUnique({
    where: { id: paymentId },
    select: { id: true, orderId: true },
  });
  if (!payment) throw new Error("Ödeme bulunamadı.");
  await prisma.odkPayment.update({
    where: { id: payment.id },
    data: { status: "REFUNDED" },
  });
  await markOdkOrderRefunded(payment.orderId, { actorUserId: ctx.userId });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "OdkPayment",
    entityId: paymentId,
    action: "PAYMENT_MARK_REFUNDED",
    summary: `Ödeme iade edildi (sipariş ${payment.orderId.slice(0, 8)})`,
  });
  revalidatePath("/panel/admin/odk/odemeler");
  revalidatePath(`/panel/admin/odk/odemeler/${paymentId}`);
  revalidatePath(`/panel/admin/odk/siparisler/${payment.orderId}`);
  revalidatePath("/panel/admin/muhasebe");
}
