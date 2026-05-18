/**
 * OD finans helper'ı — `markOdOrderPaid()` idempotent.
 *
 * Aksiyon:
 *  1. OdOrder.status = PAID
 *  2. AccountingEntry (service=OD, category=PACKAGE_SALE, refType=OdOrder, refId=orderId) yaz
 *     → mevcutsa tekrar yazma (duplicate koruma)
 *  3. Entitlement YOK — admin hocaları manuel atayacaktır.
 *
 * Ayrıca eğer ödeme tamamlandıysa PurchaseIntent kaydı oluşturulur/linklenir
 * ki admin panelinde tek noktadan "kim ne aldı, hangi paket"i görebilsin.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { sendOrderPaidUserEmail, sendOrderPaidAdminEmail } from "@/lib/email";
import { redeemCoupon } from "@/lib/discount";

export async function markOdOrderPaid(
  orderId: string,
  options: { actorUserId?: string | null } = {},
): Promise<{ orderId: string; accountingEntryId: string | null; intentId: string | null }> {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.odOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        packageId: true,
        packageName: true,
        category: true,
        subject: true,
        status: true,
        totalCents: true,
        buyerInfo: true,
        intentId: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });
    if (!order) throw new Error("OD sipariş bulunamadı.");

    if (order.status !== "PAID") {
      await tx.odOrder.update({
        where: { id: order.id },
        data: { status: "PAID" },
      });
    }

    const now = new Date();

    // 1. AccountingEntry (idempotent — duplicate koruma)
    const existing = await tx.accountingEntry.findFirst({
      where: { refType: "OdOrder", refId: order.id },
      select: { id: true },
    });
    let accountingEntryId: string | null = existing?.id ?? null;
    if (!existing) {
      const entry = await tx.accountingEntry.create({
        data: {
          service: "OD",
          type: "INCOME",
          category: "PACKAGE_SALE",
          amount: order.totalCents,
          occurredAt: now,
          description: `OD paket satışı: ${order.packageName}`,
          refType: "OdOrder",
          refId: order.id,
          packageId: order.packageId ?? null,
          createdById: options.actorUserId ?? null,
        },
        select: { id: true },
      });
      accountingEntryId = entry.id;
    }

    // 1b. Coupon redemption (idempotent, buyerInfo.coupon varsa)
    const buyerInfoObj = (order.buyerInfo ?? {}) as Record<string, unknown>;
    const couponRaw = buyerInfoObj.coupon as
      | { id?: string; code?: string; discountCents?: number }
      | null
      | undefined;
    if (couponRaw && couponRaw.id && couponRaw.discountCents && couponRaw.discountCents > 0) {
      await redeemCoupon(tx, {
        couponId: couponRaw.id,
        userId: order.userId,
        orderService: "OD",
        orderId: order.id,
        discountCents: couponRaw.discountCents,
      });
    }

    // 2. PurchaseIntent: link existing or create
    let intentId: string | null = order.intentId;
    if (!intentId) {
      const buyer = (order.buyerInfo ?? {}) as Record<string, string | null | undefined>;
      const intent = await tx.purchaseIntent.create({
        data: {
          source: `od_paid_${(order.category || "GEN").toLowerCase()}`,
          packageName: order.packageName,
          paymentLink: null,
          studentFullName: buyer.fullName || order.user.name || "—",
          studentPhone: buyer.phone || "—",
          studentEmail: buyer.email || order.user.email || "—",
          schoolName: buyer.schoolName || "—",
          city: buyer.city || "—",
          district: buyer.district || "—",
          classLevel: buyer.classLevel || "—",
          department: buyer.department || null,
          examType: buyer.examType || order.category || "—",
          targetSchool: buyer.targetSchool || null,
          targetRanking: "—",
          currentLevel: "—",
          currentNet: "—",
          weakLessons: buyer.notes ? String(buyer.notes).slice(0, 200) : "—",
          strongLessons: null,
          needType: "Paket Satın Alma (Ödenmiş)",
          studyStatus: "—",
          weeklyStudyHours: "—",
          parentFullName: buyer.parentFullName || null,
          parentPhone: buyer.parentPhone || null,
          parentEmail: null,
          notes: [
            `OD Order: ${order.id}`,
            `userId: ${order.userId}`,
            buyer.address ? `Adres: ${buyer.address}` : null,
            buyer.tcKimlik ? `TC: ${buyer.tcKimlik}` : null,
          ]
            .filter(Boolean)
            .join(" | "),
          kvkkConsent: true,
          paymentConsent: true,
          status: "PAID",
          submittedAt: now,
        },
        select: { id: true },
      });
      intentId = intent.id;
      await tx.odOrder.update({
        where: { id: order.id },
        data: { intentId },
      });
    } else {
      // ensure status is PAID
      await tx.purchaseIntent.update({
        where: { id: intentId },
        data: { status: "PAID" },
      });
    }

    return {
      orderId: order.id,
      accountingEntryId,
      intentId,
      // Email payload (captured inside tx for consistent buyer view)
      _emailPayload: {
        userEmail: order.user.email,
        userName: order.user.name,
        packageName: order.packageName,
        totalCents: order.totalCents,
        buyerInfo: (order.buyerInfo ?? {}) as Record<string, string | null | undefined>,
      },
    };
  });

  // Fire-and-forget email notifications (errors swallowed — outbox already retries)
  try {
    const p = result._emailPayload;
    const items = Array.isArray(p.buyerInfo.cart)
      ? (p.buyerInfo.cart as Array<{ name: string; qty?: number; priceCents: number }>)
      : undefined;

    if (p.userEmail) {
      void sendOrderPaidUserEmail({
        to: p.userEmail,
        name: p.userName,
        service: "OD",
        orderId: result.orderId,
        packageName: p.packageName,
        items,
        totalCents: p.totalCents,
      }).catch((e) => console.error("[od.finance] user email failed:", e));
    }

    void sendOrderPaidAdminEmail({
      service: "OD",
      orderId: result.orderId,
      packageName: p.packageName,
      items,
      totalCents: p.totalCents,
      buyer: {
        fullName: p.buyerInfo.fullName || p.userName || "—",
        email: p.buyerInfo.email || p.userEmail || "—",
        phone: p.buyerInfo.phone || null,
        city: p.buyerInfo.city || null,
        district: p.buyerInfo.district || null,
        classLevel: p.buyerInfo.classLevel || null,
        examType: p.buyerInfo.examType || null,
        schoolName: p.buyerInfo.schoolName || null,
        parentPhone: p.buyerInfo.parentPhone || null,
      },
    }).catch((e) => console.error("[od.finance] admin email failed:", e));
  } catch (e) {
    console.error("[od.finance] email dispatch failed:", e);
  }

  return {
    orderId: result.orderId,
    accountingEntryId: result.accountingEntryId,
    intentId: result.intentId,
  };
}
