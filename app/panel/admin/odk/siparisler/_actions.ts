"use server";
import { prisma } from "@/lib/prisma";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  markOdkOrderPaid,
  markOdkOrderCancelled,
  markOdkOrderRefunded,
  adminGrantOdkPackage,
} from "@/lib/odk/finance";
import { notifyUser, notifyUsers, resolveStudentAudience } from "@/lib/notifications";
import { sendOdkAccessGranted } from "@/lib/email";
import { logAudit } from "@/lib/audit";

function s(fd: FormData, k: string): string {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Bir ODK siparişini PAID yapar. Entitlement + tag + AccountingEntry (idempotent)
 * tek transaction içinde tetiklenir (`lib/odk/finance.markOdkOrderPaid`).
 */
export async function markOdkOrderPaidAction(orderId: string) {
  const ctx = await requireOdkPanel("admin");
  await markOdkOrderPaid(orderId, { actorUserId: ctx.userId });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "OdkOrder",
    entityId: orderId,
    action: "ORDER_MARK_PAID",
    summary: `Sipariş ${orderId.slice(0, 8)} ÖDENDİ olarak işaretlendi`,
  });
  revalidatePath("/panel/admin/odk/siparisler");
  revalidatePath(`/panel/admin/odk/siparisler/${orderId}`);
  revalidatePath("/panel/admin/odk/odemeler");
  revalidatePath("/panel/admin/muhasebe");
}

export async function markOdkOrderCancelledAction(orderId: string) {
  const ctx = await requireOdkPanel("admin");
  await markOdkOrderCancelled(orderId);
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "OdkOrder",
    entityId: orderId,
    action: "ORDER_MARK_CANCELLED",
    summary: `Sipariş ${orderId.slice(0, 8)} iptal edildi`,
  });
  revalidatePath("/panel/admin/odk/siparisler");
  revalidatePath(`/panel/admin/odk/siparisler/${orderId}`);
}

export async function markOdkOrderRefundedAction(orderId: string) {
  const ctx = await requireOdkPanel("admin");
  await markOdkOrderRefunded(orderId, { actorUserId: ctx.userId });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "OdkOrder",
    entityId: orderId,
    action: "ORDER_MARK_REFUNDED",
    summary: `Sipariş ${orderId.slice(0, 8)} iade edildi`,
  });
  revalidatePath("/panel/admin/odk/siparisler");
  revalidatePath(`/panel/admin/odk/siparisler/${orderId}`);
  revalidatePath("/panel/admin/muhasebe");
}

/**
 * Admin'in herhangi bir kullanıcıya manuel ODK paketi tanımlaması.
 *
 * - `paymentStatus = "paid"` ise sıfır tutarlı sipariş + MANUAL ödeme +
 *   entitlement + tag + AccountingEntry zinciri otomatik kurulur (idempotent).
 * - `paymentStatus = "pending"` ise sadece PENDING sipariş oluşur — admin
 *   sonra paid'e çevirebilir.
 *
 * Opsiyonel `expiresAt` parametresi paketin durationDays'inin üzerine yazılır
 * (paid akışında entitlement'a uygulanır).
 */
export async function createManualOdkOrderAction(fd: FormData) {
  const ctx = await requireOdkPanel("admin");
  const userId = s(fd, "userId");
  const packageId = s(fd, "packageId");
  const note = s(fd, "note") || null;
  const paymentStatus = s(fd, "paymentStatus") === "paid" ? "paid" : "pending";
  const expiresAtRaw = s(fd, "expiresAt");
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
  const notifyStudent = s(fd, "notifyStudent") === "on";
  const notifyParent = s(fd, "notifyParent") === "on";
  const notifyEmailFlag = s(fd, "notifyEmail") === "on";

  if (!userId || !packageId) throw new Error("Kullanıcı ve paket seçilmelidir.");

  if (paymentStatus === "paid") {
    const { orderId, entitlementId } = await adminGrantOdkPackage({
      userId,
      packageId,
      actorUserId: ctx.userId,
      note,
    });
    if (expiresAt) {
      await prisma.odkEntitlement.update({
        where: { id: entitlementId },
        data: { expiresAt },
      });
      // entitlement ile birlikte gelen tagların expiresAt'ini de senkron tut
      await prisma.odkUserAccessTag.updateMany({
        where: { entitlementId },
        data: { expiresAt },
      });
    }

    // Bildirimler (PAID akışında — hata yutulur, ana akış bozulmaz)
    if (notifyStudent || notifyParent || notifyEmailFlag) {
      try {
        const [u, pkg] = await Promise.all([
          prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, student: { select: { id: true, fullName: true } } },
          }),
          prisma.odkPackage.findUnique({
            where: { id: packageId },
            select: { title: true },
          }),
        ]);
        const pkgTitle = pkg?.title ?? "ODK Paketi";
        const inAppPayload = {
          title: "ODK paketin aktif",
          body: `${pkgTitle} paketine erişimin tanımlandı. Panelden sınavları görebilirsin.`,
          href: "/odk/panel/sinavlar",
          type: "PAYMENT" as const,
          priority: "NORMAL" as const,
          category: "SYSTEM" as const,
          createdById: ctx.userId,
          relatedEntityType: "OdkOrder",
          relatedEntityId: orderId,
        };

        if (notifyStudent) {
          if (u?.student?.id) {
            const aud = await resolveStudentAudience([u.student.id], { includeParents: false });
            if (aud.studentUserIds.length) {
              await notifyUsers(aud.studentUserIds, inAppPayload);
            } else {
              await notifyUser({ userId, ...inAppPayload });
            }
          } else {
            await notifyUser({ userId, ...inAppPayload });
          }
        }
        if (notifyParent && u?.student?.id) {
          const aud = await resolveStudentAudience([u.student.id], { includeParents: true });
          if (aud.parentUserIds.length) {
            await notifyUsers(aud.parentUserIds, {
              ...inAppPayload,
              body: `Çocuğunuza ${pkgTitle} paketi tanımlandı.`,
            });
          }
        }
        if (notifyEmailFlag && u?.email) {
          await sendOdkAccessGranted({
            to: u.email,
            name: u.name ?? u.student?.fullName ?? u.email,
            tagTitle: pkgTitle,
          });
        }
      } catch (err) {
        console.warn("[createManualOdkOrderAction] notify failed", err);
      }
    }

    revalidatePath("/panel/admin/odk/siparisler");
    revalidatePath("/panel/admin/odk/ogrenciler");
    revalidatePath("/panel/admin/muhasebe");
    redirect(`/panel/admin/odk/siparisler/${orderId}`);
  }

  // PENDING — para almadan sadece sipariş kaydı oluştur.
  const pkg = await prisma.odkPackage.findUnique({
    where: { id: packageId },
    select: { priceCents: true },
  });
  if (!pkg) throw new Error("Paket bulunamadı.");
  const order = await prisma.odkOrder.create({
    data: {
      userId,
      packageId,
      status: "PENDING",
      subtotalCents: pkg.priceCents,
      discountCents: 0,
      totalCents: pkg.priceCents,
    },
  });
  if (note) {
    await prisma.odkPayment.create({
      data: {
        orderId: order.id,
        provider: "MANUAL",
        status: "PENDING",
        amountCents: pkg.priceCents,
        failureReason: note,
      },
    });
  }
  revalidatePath("/panel/admin/odk/siparisler");
  redirect(`/panel/admin/odk/siparisler/${order.id}`);
}
