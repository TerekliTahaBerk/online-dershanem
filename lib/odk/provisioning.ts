import "server-only";

import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { logCriticalAudit } from "@/lib/audit";

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

export async function provisionOdkOrder(
  orderId: string,
  options: { failurePoint?: OdkProvisioningFailurePoint } = {},
): Promise<{ userId: string; alreadyProvisioned: boolean }> {
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

  try {
    const order = await prisma.odkOrder.findUniqueOrThrow({
      where: { id: orderId },
      select: { packageId: true, buyerInfo: true, package: { select: { durationDays: true } } },
    });
    const buyer = (order.buyerInfo ?? {}) as Record<string, unknown>;
    const emailValue = textField(buyer, "studentEmail") ?? textField(buyer, "email");
    if (!emailValue) throw new OdkProvisioningError("Öğrenci e-postası eksik.", "STUDENT_EMAIL_MISSING");
    const email = normalizeEmail(emailValue);
    const fullName = textField(buyer, "studentFullName") ?? textField(buyer, "fullName") ?? "ODK Öğrencisi";
    const phone = textField(buyer, "studentPhone") ?? textField(buyer, "phone");

    let user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
    if (user && user.role !== "STUDENT") {
      throw new OdkProvisioningError("Bu e-posta öğrenci olmayan bir hesaba bağlı.", "IDENTITY_ROLE_CONFLICT");
    }
    if (!user) {
      const passwordHash = await hashPassword(randomBytes(32).toString("base64url"));
      try {
        user = await prisma.user.create({
          data: { email, fullName, phone, role: "STUDENT", status: "ACTIVE", passwordHash, mustChangePassword: true },
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

    const startsAt = new Date();
    const expiresAt = order.package.durationDays
      ? new Date(startsAt.getTime() + order.package.durationDays * 86_400_000)
      : null;
    await prisma.productMembership.upsert({
      where: { userId_product: { userId: user.id, product: "ODK" } },
      create: { userId: user.id, product: "ODK", source: "PURCHASE", startsAt, expiresAt },
      update: { revokedAt: null, expiresAt, source: "PURCHASE" },
    });
    injected(options.failurePoint, "AFTER_MEMBERSHIP");

    const entitlement = await prisma.$transaction(async (tx) => {
      const storedEntitlement = await tx.odkEntitlement.upsert({
        where: { orderId },
        create: { orderId, userId: user.id, packageId: order.packageId, startsAt, expiresAt },
        update: { userId: user.id, packageId: order.packageId, revokedAt: null, expiresAt },
      });
      await tx.odkOrder.update({
        where: { id: orderId },
        data: { provisioningStatus: "SUCCEEDED", provisioningError: null, provisionedAt: new Date() },
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
    throw error;
  }
}

export async function hasActiveOdkExamEntitlement(userId: string, examId: string, now = new Date()): Promise<boolean> {
  return (await prisma.odkEntitlement.count({
    where: {
      userId,
      startsAt: { lte: now },
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      package: { examLinks: { some: { examId } } },
    },
  })) > 0;
}
