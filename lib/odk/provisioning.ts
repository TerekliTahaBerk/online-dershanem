import "server-only";

import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { logCriticalAudit } from "@/lib/audit";
import { getActiveOdkExamGrant, provisionedAccessWindow } from "@/lib/odk/product-contract-server";
import { log } from "@/lib/logger";
import { parentBuyerId, upsertMergedMembership } from "@/lib/commerce/account-purchase";

export type OdkProvisioningFailurePoint = "AFTER_USER" | "AFTER_PROFILE" | "AFTER_MEMBERSHIP";

export class OdkProvisioningError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "OdkProvisioningError";
  }
}

function textField(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeEmail(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase();
}

function injected(point: OdkProvisioningFailurePoint | undefined, expected: OdkProvisioningFailurePoint) {
  if (point === expected) throw new OdkProvisioningError(`Injected failure at ${expected}`, "INJECTED_FAILURE");
}

async function waitForConcurrentProvisioning(orderId: string) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const order = await prisma.odkOrder.findUniqueOrThrow({ where: { id: orderId }, select: { provisioningStatus: true, studentUserId: true } });
    if (order.provisioningStatus === "SUCCEEDED") return { userId: order.studentUserId!, alreadyProvisioned: true };
    if (order.provisioningStatus !== "RUNNING") break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new OdkProvisioningError("Provisioning is already running", "PROVISIONING_BUSY");
}

export type OdkProvisioningResult = {
  userId: string | null;
  alreadyProvisioned: boolean;
  /** Veli, hesabı açılmamış çocuk için ödedi; öğrenci hesabını yönetim açacak. */
  awaitingStudentAccount?: boolean;
};

export async function provisionOdkOrder(
  orderId: string,
  options: { failurePoint?: OdkProvisioningFailurePoint; studentUserId?: string } = {},
): Promise<OdkProvisioningResult> {
  const claim = await prisma.odkOrder.updateMany({
    where: {
      id: orderId,
      status: "PAID",
      OR: [
        { provisioningStatus: { in: ["PENDING", "RETRY_PENDING"] } },
        { provisioningStatus: "RUNNING", updatedAt: { lt: new Date(Date.now() - 5 * 60_000) } },
      ],
    },
    data: { provisioningStatus: "RUNNING", provisioningAttempts: { increment: 1 }, provisioningError: null },
  });
  if (claim.count === 0) {
    const order = await prisma.odkOrder.findUnique({ where: { id: orderId }, select: { status: true, provisioningStatus: true, studentUserId: true } });
    if (!order) throw new OdkProvisioningError("Sipariş bulunamadı.", "ORDER_NOT_FOUND");
    if (order.status !== "PAID") throw new OdkProvisioningError("Yalnız ödenmiş sipariş provision edilebilir.", "ORDER_NOT_PAID");
    if (order.provisioningStatus === "SUCCEEDED") return { userId: order.studentUserId!, alreadyProvisioned: true };
    return waitForConcurrentProvisioning(orderId);
  }

  await prisma.commerceOrderLine.updateMany({
    where: { odkOrderId: orderId, product: "ODK", fulfillmentStatus: { in: ["PENDING", "RETRY_PENDING"] } },
    data: { fulfillmentStatus: "RUNNING", fulfillmentAttempts: { increment: 1 }, fulfillmentError: null },
  });

  try {
    const order = await prisma.odkOrder.findUniqueOrThrow({
      where: { id: orderId },
      select: {
        packageId: true,
        buyerInfo: true,
        buyerUserId: true,
        pendingChild: { select: { id: true, status: true, fullName: true, studentProfile: { select: { userId: true } } } },
      },
    });
    const buyer = (order.buyerInfo ?? {}) as Record<string, unknown>;
    const payingParentId = await parentBuyerId(prisma, order.buyerUserId);
    let studentUserId = options.studentUserId ?? null;
    if (!studentUserId && order.pendingChild?.status === "ACCOUNT_CREATED") studentUserId = order.pendingChild.studentProfile?.userId ?? null;

    // Veli, öğrenci hesabı henüz olmayan çocuk için ödedi: velinin kendi ODK
    // erişimi açılır; sipariş PENDING kalır ve yönetim hesabı açınca yeniden
    // provision edilir (bkz. "Yeni kayıtlar" → Öğrenci hesabı aç).
    if (!studentUserId && order.pendingChild?.status === "PENDING") {
      const access = await provisionedAccessWindow(orderId);
      if (payingParentId) {
        await prisma.$transaction((tx) => upsertMergedMembership(tx, { userId: payingParentId, product: "ODK", startsAt: access.startsAt, expiresAt: access.expiresAt }));
      }
      const reason = `Veli ödedi; ${order.pendingChild.fullName} için öğrenci hesabı yönetim tarafından açılacak.`;
      await prisma.odkOrder.updateMany({ where: { id: orderId, provisioningStatus: "RUNNING" }, data: { provisioningStatus: "PENDING", provisioningError: `STUDENT_ACCOUNT_PENDING: ${reason}` } });
      await prisma.commerceOrderLine.updateMany({ where: { odkOrderId: orderId, fulfillmentStatus: "RUNNING" }, data: { fulfillmentStatus: "PENDING", fulfillmentError: "STUDENT_ACCOUNT_PENDING" } });
      const admins = await prisma.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
      if (admins.length) {
        await prisma.notification.createMany({
          data: admins.map((admin) => ({ userId: admin.id, type: "SYSTEM" as const, title: "Ödeme alındı — öğrenci hesabı açılacak", body: `${order.pendingChild!.fullName} · Online Deneme Kulübüm`, href: "/panel/yonetim/basvurular?sekme=cocuklar" })),
        });
      }
      await logCriticalAudit({
        actorType: "SYSTEM",
        entityType: "OdkOrder",
        entityId: orderId,
        action: "odk.provisioning.awaiting_student_account",
        summary: reason,
        payload: { pendingChildId: order.pendingChild.id, parentUserId: payingParentId },
        idempotencyKey: `odk:provisioning:awaiting-student:${orderId}`,
      });
      return { userId: null, alreadyProvisioned: false, awaitingStudentAccount: true };
    }

    const emailValue = textField(buyer, "studentEmail") ?? textField(buyer, "email");
    if (!emailValue && !studentUserId) throw new OdkProvisioningError("Öğrenci e-postası eksik.", "STUDENT_EMAIL_MISSING");
    const email = emailValue ? normalizeEmail(emailValue) : "";
    const fullName = textField(buyer, "studentFullName") ?? textField(buyer, "fullName") ?? "ODK Öğrencisi";
    const phone = textField(buyer, "studentPhone") ?? textField(buyer, "phone");

    let user = studentUserId
      ? await prisma.user.findUnique({ where: { id: studentUserId }, select: { id: true, role: true } })
      : await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
    if (studentUserId && !user) throw new OdkProvisioningError("Seçilen öğrenci hesabı bulunamadı.", "FORCED_STUDENT_MISSING");
    if (user && user.role !== "STUDENT") {
      throw new OdkProvisioningError("Bu e-posta öğrenci olmayan bir hesaba bağlı.", "IDENTITY_ROLE_CONFLICT");
    }
    if (!user) {
      const passwordHash = await hashPassword(randomBytes(32).toString("base64url"));
      try {
        user = await prisma.user.create({
          data: { email, fullName, phone, role: "STUDENT", status: "ACTIVE", passwordHash, mustChangePassword: true, registrationSource: "PURCHASE" },
          select: { id: true, role: true },
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
        user = await prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true, role: true } });
        if (user.role !== "STUDENT") throw new OdkProvisioningError("Kimlik yarışında rol çakışması oluştu.", "IDENTITY_ROLE_CONFLICT");
      }
    }
    await prisma.odkOrder.update({ where: { id: orderId }, data: { studentUserId: user.id } });
    injected(options.failurePoint, "AFTER_USER");

    await prisma.studentProfile.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
    injected(options.failurePoint, "AFTER_PROFILE");

    const access = await provisionedAccessWindow(orderId);
    const { startsAt, expiresAt } = access;
    const existingMembership = await prisma.productMembership.findUnique({ where: { userId_product: { userId: user.id, product: "ODK" } }, select: { startsAt: true, expiresAt: true } });
    const membershipStartsAt = existingMembership && existingMembership.startsAt < startsAt ? existingMembership.startsAt : startsAt;
    const membershipExpiresAt = existingMembership
      ? existingMembership.expiresAt === null || expiresAt === null
        ? null
        : new Date(Math.max(existingMembership.expiresAt.getTime(), expiresAt.getTime()))
      : expiresAt;
    await prisma.productMembership.upsert({
      where: { userId_product: { userId: user.id, product: "ODK" } },
      create: { userId: user.id, product: "ODK", source: "PURCHASE", startsAt: membershipStartsAt, expiresAt: membershipExpiresAt },
      update: { revokedAt: null, startsAt: membershipStartsAt, expiresAt: membershipExpiresAt, source: "PURCHASE" },
    });
    injected(options.failurePoint, "AFTER_MEMBERSHIP");

    // Ödeyen veli: kendi ODK erişimi (deneme raporları) ve öğrenciyle bağı.
    if (payingParentId) {
      const studentProfile = await prisma.studentProfile.findUniqueOrThrow({ where: { userId: user.id }, select: { id: true } });
      await prisma.$transaction(async (tx) => {
        await upsertMergedMembership(tx, { userId: payingParentId, product: "ODK", startsAt, expiresAt });
        await tx.parentStudent.upsert({
          where: { parentId_studentId: { parentId: payingParentId, studentId: studentProfile.id } },
          create: { parentId: payingParentId, studentId: studentProfile.id, relationship: "Veli" },
          update: { active: true, endedAt: null },
        });
      });
    }

    const entitlement = await prisma.$transaction(async (tx) => {
      const storedEntitlement = await tx.odkEntitlement.upsert({
        where: { orderId },
        create: { orderId, userId: user.id, packageId: order.packageId, startsAt, expiresAt, contractSnapshot: access.contract as unknown as Prisma.InputJsonValue },
        update: { userId: user.id, packageId: order.packageId, revokedAt: null, expiresAt },
      });
      await tx.odkOrder.update({
        where: { id: orderId },
        data: { provisioningStatus: "SUCCEEDED", provisioningError: null, provisionedAt: new Date() },
      });
      await tx.businessLead.updateMany({
        where: { relatedOdkOrderId: orderId },
        data: { relatedOdkUserId: user.id },
      });
      await tx.commerceOrderLine.updateMany({
        where: { odkOrderId: orderId, product: "ODK" },
        data: { fulfillmentOwnerUserId: user.id, fulfillmentStatus: "SUCCEEDED", fulfillmentError: null, fulfilledAt: new Date() },
      });
      return storedEntitlement;
    });
    await logCriticalAudit({
      actorType: "SYSTEM",
      entityType: "ProductMembership",
      entityId: `${user.id}:ODK`,
      action: "product_membership.purchase_granted",
      summary: "ODK satın alma erişimi açıldı",
      payload: { orderId, product: "ODK", source: "PURCHASE" },
      idempotencyKey: `odk:provisioning:membership:${orderId}`,
    });
    await logCriticalAudit({
      actorType: "SYSTEM",
      entityType: "OdkOrder",
      entityId: orderId,
      action: "odk.provisioning.succeeded",
      summary: "Hesap ve ODK erişimi hazırlandı",
      payload: { entitlementId: entitlement.id, product: "ODK" },
      idempotencyKey: `odk:provisioning:succeeded:${orderId}`,
    });
    return { userId: user.id, alreadyProvisioned: false };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Bilinmeyen provisioning hatası";
    await prisma.odkOrder.updateMany({
      where: { id: orderId, provisioningStatus: "RUNNING" },
      data: { provisioningStatus: "RETRY_PENDING", provisioningError: message },
    });
    await prisma.commerceOrderLine.updateMany({
      where: { odkOrderId: orderId, fulfillmentStatus: "RUNNING" },
      data: { fulfillmentStatus: "RETRY_PENDING", fulfillmentError: message },
    });
    const { emitEducationAutomation } = await import("@/lib/automation/emit-helpers");
    // Sağlama arızası alarmı: bu yol zaten hata yolu, beklemenin kullanıcıya
    // maliyeti yok — ama `void` bırakılırsa alarm hiç gitmeden süreç sonlanabilir.
    await emitEducationAutomation("provisioning_failed", {
      entityType: "order",
      entityId: orderId,
      product: "ODK",
      severity: "high",
      href: "/panel/yonetim/siparisler",
    }).catch((emitError: unknown) =>
      log.error("provisioning.automation_emit_failed", emitError, { orderId, product: "ODK" }),
    );
    throw error;
  }
}

export async function hasActiveOdkExamEntitlement(userId: string, examId: string, now = new Date()): Promise<boolean> {
  return Boolean(await getActiveOdkExamGrant(userId, examId, now));
}
