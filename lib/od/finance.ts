import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { redeemCoupon } from "@/lib/discount";
import { sendOrderPaidAdminEmail, sendOrderPaidUserEmail } from "@/lib/email";
import { ensurePaidOdOnboarding } from "@/lib/od/onboarding";

/**
 * Ödeme alındığında aktif adminlere panel içi bildirim yazar.
 *
 * Best-effort: bildirim yazımı başarısız olursa ödeme akışı bozulmamalı —
 * sipariş zaten `/panel/yonetim/isler` kuyruğunda görünür.
 */
async function notifyAdminsOfPaidOrder(
  orderId: string,
  packageName: string,
  totalCents: number,
  buyerName: string | null | undefined,
): Promise<void> {
  try {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
    if (!admins.length) return;
    const total = (totalCents / 100).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: "SYSTEM" as const,
        title: "Yeni ödeme alındı",
        body: `${buyerName || "Müşteri"} · ${packageName} · ${total}`,
        href: "/panel/yonetim/isler",
      })),
    });
  } catch {
    /* bildirim yazılamadı — ödeme akışı etkilenmez */
  }
}

export async function markOdOrderPaid(
  orderId: string,
  options: { transaction?: Prisma.TransactionClient; afterCommit?: Array<() => Promise<void>> } = {},
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
        parentEmail: value.parentEmail || null,
        paymentConsent: true, status: "PAID", submittedAt: new Date(),
      }, select: { id: true } });
      intentId = intent.id;
      await tx.odOrder.update({ where: { id: order.id }, data: { intentId } });
    }
    await ensurePaidOdOnboarding(tx, order.id);
    return { packageName: order.packageName, totalCents: order.totalCents, buyer: buyer as Record<string, string | null | undefined> };
  };
  const result = options.transaction ? await execute(options.transaction) : await prisma.$transaction(execute);
  const notify = async () => {
    const deliveries: Promise<void>[] = [];
    if (result.buyer.email) deliveries.push(sendOrderPaidUserEmail({ to: result.buyer.email, name: result.buyer.fullName, service: "OD", orderId, packageName: result.packageName, totalCents: result.totalCents }));
    deliveries.push(sendOrderPaidAdminEmail({ service: "OD", orderId, packageName: result.packageName, totalCents: result.totalCents, buyer: result.buyer }));
    // Admin satış e-postası `EMAIL_MODE=all` gerektirir ve varsayılan "receipts".
    // Panel içi bildirim bu yüzden e-postadan BAĞIMSIZ yazılır: aksi halde
    // varsayılan kurulumda ödeme alındığında kimseye haber gitmiyor.
    // Aynı kalıp public lead formunda da kullanılıyor (`app/api/leads`).
    deliveries.push(notifyAdminsOfPaidOrder(orderId, result.packageName, result.totalCents, result.buyer.fullName));
    await Promise.all(deliveries);
  };
  if (options.afterCommit) options.afterCommit.push(notify);
  else await notify();
}
