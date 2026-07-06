import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { redeemCoupon } from "@/lib/discount";
import { sendOrderPaidAdminEmail, sendOrderPaidUserEmail } from "@/lib/email";

export async function markOdOrderPaid(
  orderId: string,
  options: { transaction?: Prisma.TransactionClient; afterCommit?: Array<() => void> } = {},
): Promise<void> {
  const execute = async (tx: Prisma.TransactionClient) => {
    const order = await tx.odOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Sipariş bulunamadı.");
    if (order.status !== "PAID") await tx.odOrder.update({ where: { id: order.id }, data: { status: "PAID" } });
    const buyer = (order.buyerInfo ?? {}) as Record<string, unknown>;
    const coupon = buyer.coupon as { id?: string; discountCents?: number } | null | undefined;
    const customerKey = typeof buyer.email === "string" ? buyer.email.toLowerCase() : null;
    if (customerKey && coupon?.id && coupon.discountCents && coupon.discountCents > 0) {
      await redeemCoupon(tx, { couponId: coupon.id, customerKey, orderService: "OD", orderId, discountCents: coupon.discountCents });
    }
    let intentId = order.intentId;
    if (!intentId) {
      const value = buyer as Record<string, string | null | undefined>;
      const intent = await tx.purchaseIntent.create({ data: {
        source: `od_paid_${(order.category || "GEN").toLowerCase()}`, packageName: order.packageName,
        studentFullName: value.fullName || "—", studentPhone: value.phone || "—", studentEmail: value.email || "—",
        schoolName: value.schoolName || "—", city: value.city || "—", district: value.district || "—",
        classLevel: value.classLevel || "—", department: value.department || null, examType: value.examType || order.category || "—",
        targetSchool: value.targetSchool || null, targetRanking: "—", currentLevel: "—", currentNet: "—",
        weakLessons: value.notes ? String(value.notes).slice(0, 200) : "—", needType: "Paket Satın Alma (Ödenmiş)",
        studyStatus: "—", weeklyStudyHours: "—", parentFullName: value.parentFullName || null,
        parentPhone: value.parentPhone || null, notes: `OD Order: ${order.id}`, kvkkConsent: true,
        paymentConsent: true, status: "PAID", submittedAt: new Date(),
      }, select: { id: true } });
      intentId = intent.id;
      await tx.odOrder.update({ where: { id: order.id }, data: { intentId } });
    }
    return { packageName: order.packageName, totalCents: order.totalCents, buyer: buyer as Record<string, string | null | undefined> };
  };
  const result = options.transaction ? await execute(options.transaction) : await prisma.$transaction(execute);
  const notify = () => {
    if (result.buyer.email) void sendOrderPaidUserEmail({ to: result.buyer.email, name: result.buyer.fullName, service: "OD", orderId, packageName: result.packageName, totalCents: result.totalCents });
    void sendOrderPaidAdminEmail({ service: "OD", orderId, packageName: result.packageName, totalCents: result.totalCents, buyer: result.buyer });
  };
  options.afterCommit ? options.afterCommit.push(notify) : notify();
}
