// FAZ 5 — ODK finans/erişim merkezi helper'ı.
// Sipariş PAID olduğunda:
//   1. OdkEntitlement upsert (orderId benzersiz olduğundan idempotent)
//   2. Pakete bağlı OdkAccessTag'leri kullanıcıya bağla (unique constraint → upsert)
//   3. AccountingEntry (service=ODK, category=PACKAGE_SALE, refType=OdkOrder, refId=orderId) yaz
//      → mevcutsa tekrar yazma (duplicate koruma)
// Bu modül hem manuel admin "paid yap" akışından hem de ileride eklenecek
// webhook'tan tek bir yerden çağrılır.
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { sendOrderPaidUserEmail, sendOrderPaidAdminEmail } from "@/lib/email";

const DAY = 86400000;

type Tx = Prisma.TransactionClient;

/**
 * Bir ODK siparişini PAID yapar:
 *  - Order.status = PAID
 *  - Entitlement upsert (paket süresine göre expiresAt)
 *  - Pakete bağlı tüm AccessTag'leri kullanıcıya (PURCHASE source) ata
 *  - AccountingEntry (service=ODK) yaz (idempotent)
 *
 * Tekrar çağrılırsa yan etki üretmez (idempotent).
 */
export async function markOdkOrderPaid(
  orderId: string,
  options: { actorUserId?: string | null } = {},
): Promise<{ entitlementId: string | null; accountingEntryId: string | null }> {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.odkOrder.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        package: {
          select: {
            id: true,
            durationDays: true,
            title: true,
            packageAccessTags: { select: { accessTagId: true } },
          },
        },
      },
    });
    if (!order) throw new Error("Sipariş bulunamadı.");

    // Order status'unu PAID'e çek (idempotent — zaten PAID ise update no-op).
    if (order.status !== "PAID") {
      await tx.odkOrder.update({ where: { id: order.id }, data: { status: "PAID" } });
    }

    const now = new Date();
    const expiresAt = order.package.durationDays
      ? new Date(now.getTime() + order.package.durationDays * DAY)
      : null;

    // ── Guest order (userId=null) ──────────────────────────────────────────
    // Entitlement ve access-tag userId gerektirir. Guest ödemede henüz hesap
    // yoktur; erişim açma admin onboarding'e (order'ı kullanıcıya bağlama)
    // ertelenir. Bu nedenle entitlement/tag SADECE userId varsa oluşturulur.
    // Order yine PAID + accounting yazılır → onboarding kuyruğuna düşer.
    let entitlementId: string | null = null;
    if (order.userId) {
      // Entitlement upsert (orderId @unique).
      const entitlement = await tx.odkEntitlement.upsert({
        where: { orderId: order.id },
        create: {
          userId: order.userId,
          packageId: order.packageId,
          orderId: order.id,
          status: "ACTIVE",
          startsAt: now,
          expiresAt,
        },
        update: {
          // Re-activate eğer revoked/expired ise + expiry uzat.
          status: "ACTIVE",
          revokedAt: null,
          expiresAt,
        },
      });
      entitlementId = entitlement.id;

      // Pakete bağlı tagları kullanıcıya ata (idempotent).
      for (const link of order.package.packageAccessTags) {
        await grantTagToUser(tx, {
          userId: order.userId,
          accessTagId: link.accessTagId,
          entitlementId: entitlement.id,
          expiresAt,
          source: "PURCHASE",
        });
      }
    }

    // AccountingEntry — duplicate koruması.
    const existing = await tx.accountingEntry.findFirst({
      where: { refType: "OdkOrder", refId: order.id },
      select: { id: true },
    });
    let accountingEntryId: string | null = existing?.id ?? null;
    if (!existing) {
      const entry = await tx.accountingEntry.create({
        data: {
          service: "ODK",
          type: "INCOME",
          category: "PACKAGE_SALE",
          amount: order.totalCents,
          occurredAt: now,
          description: `ODK paket satışı: ${order.package.title}`,
          refType: "OdkOrder",
          refId: order.id,
          createdById: options.actorUserId ?? null,
        },
        select: { id: true },
      });
      accountingEntryId = entry.id;
    }

    return {
      entitlementId,
      accountingEntryId,
      _emailPayload: {
        userEmail: order.user?.email ?? null,
        userName: order.user?.name ?? null,
        packageName: order.package.title,
        totalCents: order.totalCents,
        buyerInfo: (order.buyerInfo ?? {}) as Record<string, string | null | undefined>,
      },
    };
  });

  // Fire-and-forget bildirim e-postaları (outbox zaten retry yapıyor)
  try {
    const p = result._emailPayload;
    if (p.userEmail) {
      void sendOrderPaidUserEmail({
        to: p.userEmail,
        name: p.userName,
        service: "ODK",
        orderId,
        packageName: p.packageName,
        totalCents: p.totalCents,
      }).catch((e) => console.error("[odk.finance] user email failed:", e));
    }

    void sendOrderPaidAdminEmail({
      service: "ODK",
      orderId,
      packageName: p.packageName,
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
    }).catch((e) => console.error("[odk.finance] admin email failed:", e));
  } catch (e) {
    console.error("[odk.finance] email dispatch failed:", e);
  }

  return {
    entitlementId: result.entitlementId,
    accountingEntryId: result.accountingEntryId,
  };
}

/**
 * Siparişi CANCELLED yapar — entitlement varsa REVOKED işaretler,
 * pakete bağlı PURCHASE source tagları revoke eder.
 * AccountingEntry **silinmez** (muhasebe izi korunur); admin manuel iade kaydı atabilir.
 */
export async function markOdkOrderCancelled(orderId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.odkOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Sipariş bulunamadı.");
    if (order.status !== "CANCELLED") {
      await tx.odkOrder.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    }
    await revokeEntitlementByOrderId(tx, order.id);
  });
}

/**
 * Siparişi REFUNDED yapar — entitlement REVOKED, taglar revoke;
 * ek olarak AccountingEntry EXPENSE/OTHER_EXPENSE (negatif gelir karşılığı) iade kaydı yazılır
 * (idempotent: refType="OdkOrderRefund").
 */
export async function markOdkOrderRefunded(
  orderId: string,
  options: { actorUserId?: string | null } = {},
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.odkOrder.findUnique({
      where: { id: orderId },
      include: { package: { select: { title: true } } },
    });
    if (!order) throw new Error("Sipariş bulunamadı.");
    if (order.status !== "REFUNDED") {
      await tx.odkOrder.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
    }
    await revokeEntitlementByOrderId(tx, order.id);

    const existingRefund = await tx.accountingEntry.findFirst({
      where: { refType: "OdkOrderRefund", refId: order.id },
      select: { id: true },
    });
    if (!existingRefund && order.totalCents > 0) {
      await tx.accountingEntry.create({
        data: {
          service: "ODK",
          type: "EXPENSE",
          category: "OTHER_EXPENSE",
          amount: order.totalCents,
          occurredAt: new Date(),
          description: `ODK iade: ${order.package.title}`,
          refType: "OdkOrderRefund",
          refId: order.id,
          createdById: options.actorUserId ?? null,
        },
      });
    }
  });
}

async function revokeEntitlementByOrderId(tx: Tx, orderId: string): Promise<void> {
  const ent = await tx.odkEntitlement.findUnique({ where: { orderId } });
  if (!ent) return;
  if (ent.status !== "REVOKED") {
    await tx.odkEntitlement.update({
      where: { id: ent.id },
      data: { status: "REVOKED", revokedAt: new Date() },
    });
  }
  // Bu entitlement üzerinden verilmiş PURCHASE source tagları revoke et.
  await tx.odkUserAccessTag.updateMany({
    where: { entitlementId: ent.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Kullanıcıya manuel ODK paket tanımlama (sipariş + ödeme + entitlement + tag + muhasebe).
 * Admin "manuel paket ver" akışında kullanılır.
 */
export async function adminGrantOdkPackage(input: {
  userId: string;
  packageId: string;
  actorUserId?: string | null;
  note?: string | null;
}): Promise<{ orderId: string; entitlementId: string }> {
  const pkg = await prisma.odkPackage.findUnique({
    where: { id: input.packageId },
    select: { id: true, priceCents: true },
  });
  if (!pkg) throw new Error("Paket bulunamadı.");

  // Idempotency: aynı user+package için ACTIVE entitlement varsa onu döndür.
  const existing = await prisma.odkEntitlement.findFirst({
    where: {
      userId: input.userId,
      packageId: pkg.id,
      status: "ACTIVE",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true, orderId: true },
  });
  if (existing && existing.orderId) {
    return { orderId: existing.orderId, entitlementId: existing.id };
  }

  // Sıfır tutarlı sipariş + ödeme zinciri (manuel grant — para alınmamış).
  const order = await prisma.odkOrder.create({
    data: {
      userId: input.userId,
      packageId: pkg.id,
      status: "PENDING",
      subtotalCents: 0,
      discountCents: pkg.priceCents,
      totalCents: 0,
    },
  });
  await prisma.odkPayment.create({
    data: {
      orderId: order.id,
      provider: "MANUAL",
      status: "SUCCEEDED",
      amountCents: 0,
      paidAt: new Date(),
      failureReason: input.note ?? "Admin manuel grant",
    },
  });
  const { entitlementId } = await markOdkOrderPaid(order.id, {
    actorUserId: input.actorUserId,
  });
  // Admin manuel grant her zaman gerçek bir userId ile çağrılır → entitlement
  // mutlaka oluşur. Guest yolu (entitlementId=null) buraya düşmez.
  if (!entitlementId) throw new Error("Entitlement oluşturulamadı (beklenmeyen guest order).");
  return { orderId: order.id, entitlementId };
}

/**
 * Manuel olarak bir kullanıcının ODK erişimini iptal eder
 * (tüm aktif entitlement + tag revoke). Sipariş REFUNDED yapılmaz.
 */
export async function adminRevokeUserOdkAccess(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const ents = await tx.odkEntitlement.findMany({
      where: { userId, status: "ACTIVE" },
      select: { id: true },
    });
    if (ents.length > 0) {
      await tx.odkEntitlement.updateMany({
        where: { id: { in: ents.map((e) => e.id) } },
        data: { status: "REVOKED", revokedAt: new Date() },
      });
    }
    await tx.odkUserAccessTag.updateMany({
      where: { userId, revokedAt: null, accessTag: { service: "ODK" } },
      data: { revokedAt: new Date() },
    });
  });
}

async function grantTagToUser(
  tx: Tx,
  args: {
    userId: string;
    accessTagId: string;
    entitlementId: string | null;
    expiresAt: Date | null;
    source: "PURCHASE" | "MANUAL";
  },
): Promise<void> {
  await tx.odkUserAccessTag.upsert({
    where: {
      userId_accessTagId: {
        userId: args.userId,
        accessTagId: args.accessTagId,
      },
    },
    create: {
      userId: args.userId,
      accessTagId: args.accessTagId,
      entitlementId: args.entitlementId,
      expiresAt: args.expiresAt,
      source: args.source,
    },
    update: {
      revokedAt: null,
      entitlementId: args.entitlementId,
      expiresAt: args.expiresAt,
      source: args.source,
    },
  });
}
