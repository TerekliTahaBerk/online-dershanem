import "server-only";

import { randomBytes } from "node:crypto";
import type { Prisma, UserRole } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { normalizeEmail, normalizePhone } from "@/lib/business/normalization";
import { dueAtForOdOnboardingState } from "@/lib/od/onboarding-state";
import { prisma } from "@/lib/prisma";
import { contractAccessWindow, parseOdkProductContract } from "@/lib/odk/product-contract";
import { COMMERCE_TO_PRODUCT_CODE, MEMBERSHIP_BACKED_PRODUCTS } from "@/lib/commerce/product-mapping";
import { createAccountClaimToken } from "@/lib/od/account-claim";
import { issueAccountClaim } from "@/lib/od/account-claim-server";

export type OdProvisioningFailurePoint = "AFTER_USER" | "AFTER_PROFILE" | "AFTER_MEMBERSHIP";

export type OdProvisioningResult = {
  status: "SUCCEEDED" | "MANUAL_REVIEW";
  userId?: string;
  parentUserId?: string;
  alreadyProvisioned?: boolean;
  reason?: string;
};

export class OdProvisioningError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "OdProvisioningError";
  }
}

type DbClient = Prisma.TransactionClient;
type Buyer = Record<string, unknown>;
type IdentityUser = { id: string; role: UserRole; status: "ACTIVE" | "SUSPENDED" };

function textField(source: Buyer, key: string): string | null {
  const value = source[key];
  return typeof value === "string" && value.trim() ? value.normalize("NFKC").trim() : null;
}

function injected(point: OdProvisioningFailurePoint | undefined, expected: OdProvisioningFailurePoint) {
  if (point === expected) throw new OdProvisioningError(`Injected failure at ${expected}`, "INJECTED_FAILURE");
}

async function provisionRemainingOdLines(orderId: string) {
  const lines = await prisma.commerceOrderLine.findMany({
    where: { odOrderId: orderId, fulfillmentStatus: { in: ["PENDING", "RETRY_PENDING"] } },
    orderBy: { position: "asc" },
    select: { id: true, product: true, productId: true, productSnapshot: true, fulfillmentOwnerKey: true, fulfillmentOwnerSnapshot: true },
  });
  for (const line of lines) {
    const claim = await prisma.commerceOrderLine.updateMany({
      where: { id: line.id, fulfillmentStatus: { in: ["PENDING", "RETRY_PENDING"] } },
      data: { fulfillmentStatus: "RUNNING", fulfillmentAttempts: { increment: 1 }, fulfillmentError: null },
    });
    if (!claim.count) continue;
    try {
      const owner = line.fulfillmentOwnerSnapshot as Buyer;
      const email = normalizeEmail(line.fulfillmentOwnerKey);
      if (!email) throw new OdProvisioningError("Satır öğrenci e-postası eksik.", "LINE_OWNER_EMAIL_MISSING");
      const passwordHash = await hashPassword(randomBytes(32).toString("base64url"));
      const lineClaimToken = await createAccountClaimToken().catch(() => null);
      const user = await prisma.user.upsert({
        where: { email },
        create: { email, fullName: textField(owner, "fullName") ?? "OD Öğrencisi", phone: textField(owner, "phone"), role: "STUDENT", status: "ACTIVE", passwordHash, mustChangePassword: true },
        update: {},
        select: { id: true, role: true, status: true },
      });
      const conflict = usableIdentity(user, "STUDENT", "Satır öğrenci e-postası");
      if (conflict) throw new OdProvisioningError(conflict, "LINE_OWNER_CONFLICT");
      await prisma.$transaction(async (tx) => {
        await tx.studentProfile.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
        /*
         * ÜRÜN AYRIMI AÇIK OLMALI. Burası eskiden `if (OD) … else { ODK }`
         * idi; üçüncü ürün (Koçum) eklendiğinde OK satırı sessizce ODK
         * dalına düşüp ya hata veriyor ya da yanlış yetki açıyordu.
         * Artık üyelik temelli ürünler (OD, OK) ortak dalda, ODK kendi
         * sözleşme/pencere mantığında.
         */
        if (MEMBERSHIP_BACKED_PRODUCTS[line.product]) {
          const productCode = COMMERCE_TO_PRODUCT_CODE[line.product];
          await tx.productMembership.upsert({
            where: { userId_product: { userId: user.id, product: productCode } },
            create: { userId: user.id, product: productCode, source: "PURCHASE", sourceOdOrderId: orderId },
            update: { source: "PURCHASE", sourceOdOrderId: orderId, revokedAt: null, expiresAt: null },
          });
        } else {
          if (!line.productId) throw new OdProvisioningError("ODK satırında ürün kimliği eksik.", "ODK_LINE_PRODUCT_MISSING");
          const contract = parseOdkProductContract(line.productSnapshot);
          if (!contract.success) throw new OdProvisioningError("ODK satır sözleşmesi geçersiz.", "ODK_LINE_CONTRACT_INVALID");
          const paid = await tx.odPayment.findFirst({ where: { orderId, status: "SUCCEEDED" }, orderBy: { paidAt: "asc" }, select: { paidAt: true } });
          const { startsAt, expiresAt } = contractAccessWindow(contract.data.policy, paid?.paidAt ?? new Date());
          const existing = await tx.productMembership.findUnique({ where: { userId_product: { userId: user.id, product: "ODK" } } });
          const membershipStartsAt = existing && existing.startsAt < startsAt ? existing.startsAt : startsAt;
          const membershipExpiresAt = existing
            ? existing.expiresAt === null || expiresAt === null ? null : new Date(Math.max(existing.expiresAt.getTime(), expiresAt.getTime()))
            : expiresAt;
          await tx.productMembership.upsert({
            where: { userId_product: { userId: user.id, product: "ODK" } },
            create: { userId: user.id, product: "ODK", source: "PURCHASE", startsAt: membershipStartsAt, expiresAt: membershipExpiresAt },
            update: { source: "PURCHASE", revokedAt: null, startsAt: membershipStartsAt, expiresAt: membershipExpiresAt },
          });
          await tx.odkEntitlement.upsert({
            where: { orderLineId: line.id },
            create: { orderLineId: line.id, userId: user.id, packageId: line.productId, startsAt, expiresAt, contractSnapshot: contract.data as unknown as Prisma.InputJsonValue },
            update: { userId: user.id, packageId: line.productId, revokedAt: null, startsAt, expiresAt },
          });
        }
        await tx.commerceOrderLine.update({ where: { id: line.id }, data: { fulfillmentOwnerUserId: user.id, fulfillmentStatus: "SUCCEEDED", fulfillmentError: null, fulfilledAt: new Date() } });
        // Çok satırlı siparişte her satırın sahibi ayrı bir hesaptır ve o da
        // hesabını devralabilmelidir; aksi hâlde yalnız ilk öğrenci davet alır.
        // Davet üretilemezse satır yine de teslim edilmiş sayılır: erişim
        // açılmıştır ve bir e-posta yüzünden geri alınması daha kötüdür.
        if (lineClaimToken) await issueAccountClaim(tx, { userId: user.id, audience: "STUDENT", odOrderId: orderId, generated: lineClaimToken });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : "Bilinmeyen satır provisioning hatası";
      await prisma.commerceOrderLine.update({ where: { id: line.id }, data: { fulfillmentStatus: "RETRY_PENDING", fulfillmentError: message } });
      throw error;
    }
  }
}

function usableIdentity(user: IdentityUser | null, expectedRole: UserRole, label: string): string | null {
  if (!user) return null;
  if (user.role !== expectedRole) return `${label} başka bir hesap rolüne bağlı.`;
  if (user.status !== "ACTIVE") return `${label} askıya alınmış bir hesaba bağlı.`;
  return null;
}

async function matchingParentsByPhone(tx: DbClient, phone: string | null): Promise<IdentityUser[]> {
  const normalized = normalizePhone(phone);
  if (!normalized) return [];
  const parents = await tx.user.findMany({
    where: { role: "PARENT", phone: { not: null } },
    select: { id: true, role: true, status: true, phone: true },
  });
  return parents.filter((candidate) => normalizePhone(candidate.phone) === normalized);
}

async function putOnboardingInManualReview(tx: DbClient, orderId: string, reason: string, metadata: Prisma.InputJsonValue) {
  const onboarding = await tx.odOnboarding.findUniqueOrThrow({ where: { orderId } });
  const now = new Date();
  if (onboarding.state !== "MANUAL_REVIEW") {
    await tx.odOnboardingTransition.create({
      data: {
        onboardingId: onboarding.id,
        fromState: onboarding.state,
        toState: "MANUAL_REVIEW",
        actorType: "SYSTEM",
        note: reason,
        metadata,
        occurredAt: now,
      },
    });
  }
  await tx.odOnboarding.update({
    where: { id: onboarding.id },
    data: {
      state: "MANUAL_REVIEW",
      dueAt: dueAtForOdOnboardingState("MANUAL_REVIEW", now),
      blockerReason: reason,
      blockedFromState: onboarding.state === "MANUAL_REVIEW" ? onboarding.blockedFromState : onboarding.state,
      stateEnteredAt: now,
      version: { increment: 1 },
    },
  });
  await tx.odOrder.update({
    where: { id: orderId },
    data: { provisioningStatus: "MANUAL_REVIEW", provisioningError: reason },
  });
  await tx.auditLog.create({
    data: {
      actorType: "SYSTEM",
      entityType: "OdOrder",
      entityId: orderId,
      action: "od.provisioning.manual_review",
      summary: reason,
      payload: metadata,
    },
  });
  return { status: "MANUAL_REVIEW" as const, reason };
}

async function waitForConcurrentProvisioning(orderId: string): Promise<OdProvisioningResult> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const order = await prisma.odOrder.findUniqueOrThrow({
      where: { id: orderId },
      select: { provisioningStatus: true, provisioningError: true, userId: true },
    });
    if (order.provisioningStatus === "SUCCEEDED") {
      await provisionRemainingOdLines(orderId);
      return { status: "SUCCEEDED", userId: order.userId!, alreadyProvisioned: true };
    }
    if (order.provisioningStatus === "MANUAL_REVIEW") return { status: "MANUAL_REVIEW", reason: order.provisioningError ?? "Manuel inceleme gerekli." };
    if (order.provisioningStatus !== "RUNNING") break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new OdProvisioningError("Provisioning is already running", "PROVISIONING_BUSY");
}

export async function provisionOdOrder(
  orderId: string,
  options: { failurePoint?: OdProvisioningFailurePoint; studentUserId?: string } = {},
): Promise<OdProvisioningResult> {
  const claim = await prisma.odOrder.updateMany({
    where: {
      id: orderId,
      status: "PAID",
      OR: [
        { provisioningStatus: { in: ["PENDING", "RETRY_PENDING", "MANUAL_REVIEW"] } },
        { provisioningStatus: "RUNNING", updatedAt: { lt: new Date(Date.now() - 5 * 60_000) } },
      ],
    },
    data: { provisioningStatus: "RUNNING", provisioningAttempts: { increment: 1 }, provisioningError: null },
  });
  if (claim.count === 0) {
    const order = await prisma.odOrder.findUnique({ where: { id: orderId }, select: { status: true, provisioningStatus: true, userId: true } });
    if (!order) throw new OdProvisioningError("Sipariş bulunamadı.", "ORDER_NOT_FOUND");
    if (order.status !== "PAID") throw new OdProvisioningError("Yalnız ödenmiş sipariş provision edilebilir.", "ORDER_NOT_PAID");
    if (order.provisioningStatus === "SUCCEEDED") return { status: "SUCCEEDED", userId: order.userId!, alreadyProvisioned: true };
    return waitForConcurrentProvisioning(orderId);
  }

  try {
    const passwordHash = await hashPassword(randomBytes(32).toString("base64url"));
    /*
     * `passwordHash` gibi, davet token'ları da transaction'dan ÖNCE üretilir:
     * ikisi de scrypt çalıştırır ve Serializable kilidi altında beklemeleri eş
     * zamanlı ödeme callback'lerinde gereksiz çakışma üretir.
     *
     * ÜRETİM BAŞARISIZSA PROVISIONING DEVAM EDER. Token üretimi
     * `NEXTAUTH_SECRET`'e bağlıdır; o yapılandırma eksikse davet gönderilemez
     * ama PARA ÇOKTAN ALINMIŞTIR — hesabın ve ürün erişiminin açılmaması çok
     * daha kötü bir sonuçtur. Davetsiz kalan sipariş operasyona görünür kalır.
     */
    const claimTokens = await Promise.all([createAccountClaimToken(), createAccountClaimToken()]).catch(() => null);
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.odOrder.findUniqueOrThrow({ where: { id: orderId }, include: { onboarding: true } });
      const buyer = (order.buyerInfo ?? {}) as Buyer;
      const rawEmail = textField(buyer, "studentEmail") ?? textField(buyer, "email");
      const email = normalizeEmail(rawEmail);
      if (!email) return putOnboardingInManualReview(tx, orderId, "Öğrenci e-postası eksik veya geçersiz.", { code: "STUDENT_EMAIL_MISSING" });

      const emailUser = await tx.user.findUnique({ where: { email }, select: { id: true, role: true, status: true } });
      const emailConflict = usableIdentity(emailUser, "STUDENT", "Öğrenci e-postası");
      if (emailConflict && !options.studentUserId) return putOnboardingInManualReview(tx, orderId, emailConflict, { code: "STUDENT_EMAIL_CONFLICT", email });

      const tcKimlik = textField(buyer, "tcKimlik");
      const tcOrders = tcKimlik ? await tx.odOrder.findMany({
        where: { id: { not: orderId }, userId: { not: null }, buyerInfo: { path: ["tcKimlik"], equals: tcKimlik } },
        select: { user: { select: { id: true, role: true, status: true } } },
        distinct: ["userId"],
      }) : [];
      const tcUsers = tcOrders.map((candidate) => candidate.user).filter((candidate): candidate is IdentityUser => Boolean(candidate));
      if (tcUsers.length > 1 && !options.studentUserId) return putOnboardingInManualReview(tx, orderId, "TC kimlik geçmişte birden fazla hesaba bağlanmış.", { code: "STUDENT_IDENTITY_AMBIGUOUS" });
      const tcUser = tcUsers[0] ?? null;
      const tcConflict = usableIdentity(tcUser, "STUDENT", "TC kimlik");
      if (tcConflict && !options.studentUserId) return putOnboardingInManualReview(tx, orderId, tcConflict, { code: "STUDENT_IDENTITY_CONFLICT" });

      const forcedUser = options.studentUserId ? await tx.user.findUnique({ where: { id: options.studentUserId }, select: { id: true, role: true, status: true } }) : null;
      const forcedConflict = options.studentUserId ? usableIdentity(forcedUser, "STUDENT", "Admin tarafından seçilen hesap") : null;
      if (forcedConflict || (options.studentUserId && !forcedUser)) {
        return putOnboardingInManualReview(tx, orderId, forcedConflict ?? "Admin tarafından seçilen öğrenci hesabı bulunamadı.", { code: "FORCED_STUDENT_CONFLICT" });
      }
      const candidateIds = new Set((forcedUser ? [forcedUser.id] : [emailUser?.id, tcUser?.id]).filter(Boolean));
      if (candidateIds.size > 1) {
        return putOnboardingInManualReview(tx, orderId, "Öğrenci e-posta/kimlik sinyalleri farklı hesapları gösteriyor.", { code: "STUDENT_IDENTITY_MISMATCH" });
      }

      const existingStudent = forcedUser ?? emailUser ?? tcUser;
      const fullName = textField(buyer, "studentFullName") ?? textField(buyer, "fullName") ?? "OD Öğrencisi";
      const phone = textField(buyer, "studentPhone") ?? textField(buyer, "phone");
      const student = existingStudent ?? await tx.user.upsert({
        where: { email },
        create: { email, fullName, phone, role: "STUDENT", status: "ACTIVE", passwordHash, mustChangePassword: true },
        update: {},
        select: { id: true, role: true, status: true },
      });
      injected(options.failurePoint, "AFTER_USER");

      const profile = await tx.studentProfile.upsert({
        where: { userId: student.id },
        create: { userId: student.id, classLevel: textField(buyer, "classLevel"), schoolName: textField(buyer, "schoolName") },
        update: {},
        select: { id: true },
      });
      injected(options.failurePoint, "AFTER_PROFILE");

      const existingMembership = await tx.productMembership.findUnique({ where: { userId_product: { userId: student.id, product: "OD" } }, select: { id: true } });
      const membership = await tx.productMembership.upsert({
        where: { userId_product: { userId: student.id, product: "OD" } },
        create: { userId: student.id, product: "OD", source: "PURCHASE", sourceOdOrderId: orderId },
        update: { source: "PURCHASE", sourceOdOrderId: orderId, revokedAt: null, expiresAt: null },
        select: { id: true },
      });
      injected(options.failurePoint, "AFTER_MEMBERSHIP");

      const parentFullName = textField(buyer, "parentFullName");
      const parentPhone = textField(buyer, "parentPhone");
      const rawParentEmail = textField(buyer, "parentEmail");
      const parentEmail = normalizeEmail(rawParentEmail);
      let parentUserId: string | undefined;
      let parentLinkCreated = false;
      if (parentFullName || parentPhone || parentEmail) {
        const parentByEmail = parentEmail ? await tx.user.findUnique({ where: { email: parentEmail }, select: { id: true, role: true, status: true } }) : null;
        const parentEmailConflict = usableIdentity(parentByEmail, "PARENT", "Veli e-postası");
        if (parentEmailConflict) return putOnboardingInManualReview(tx, orderId, parentEmailConflict, { code: "PARENT_EMAIL_CONFLICT", parentEmail });
        const parentPhoneMatches = await matchingParentsByPhone(tx, parentPhone);
        if (parentPhoneMatches.length > 1) return putOnboardingInManualReview(tx, orderId, "Veli telefonu birden fazla hesaba bağlı.", { code: "PARENT_PHONE_AMBIGUOUS" });
        const parentByPhone = parentPhoneMatches[0] ?? null;
        if (parentByPhone && parentByPhone.status !== "ACTIVE") return putOnboardingInManualReview(tx, orderId, "Veli telefonu askıya alınmış hesaba bağlı.", { code: "PARENT_SUSPENDED" });
        if (parentByEmail && parentByPhone && parentByEmail.id !== parentByPhone.id) {
          return putOnboardingInManualReview(tx, orderId, "Veli e-posta ve telefon sinyalleri farklı hesapları gösteriyor.", { code: "PARENT_IDENTITY_MISMATCH" });
        }
        if (!parentByEmail && !parentByPhone && !parentEmail) {
          return putOnboardingInManualReview(tx, orderId, "Yeni veli hesabı için e-posta eksik; güvenli otomatik hesap açılamadı.", { code: "PARENT_EMAIL_MISSING" });
        }
        const parent = parentByEmail ?? parentByPhone ?? await tx.user.upsert({
          where: { email: parentEmail! },
          create: { email: parentEmail!, fullName: parentFullName ?? "OD Velisi", phone: parentPhone, role: "PARENT", status: "ACTIVE", passwordHash, mustChangePassword: true },
          update: {},
          select: { id: true, role: true, status: true },
        });
        parentUserId = parent.id;
        const existingLink = await tx.parentStudent.findUnique({ where: { parentId_studentId: { parentId: parent.id, studentId: profile.id } }, select: { id: true } });
        await tx.parentStudent.upsert({
          where: { parentId_studentId: { parentId: parent.id, studentId: profile.id } },
          create: { parentId: parent.id, studentId: profile.id, relationship: "Veli" },
          update: {},
        });
        parentLinkCreated = !existingLink;
      }

      await tx.odOrder.update({
        where: { id: orderId },
        data: { userId: student.id, provisioningStatus: "SUCCEEDED", provisioningError: null, provisionedAt: new Date() },
      });
      await tx.commerceOrderLine.updateMany({
        where: { odOrderId: orderId, product: "OD", fulfillmentOwnerKey: email, fulfillmentStatus: { in: ["PENDING", "RUNNING", "RETRY_PENDING"] } },
        data: { fulfillmentOwnerUserId: student.id, fulfillmentStatus: "SUCCEEDED", fulfillmentError: null, fulfilledAt: new Date() },
      });
      const hasParentLink = (await tx.parentStudent.count({ where: { studentId: profile.id } })) > 0;
      const targetState = hasParentLink ? "PARENT_LINKED" as const : "ACCOUNT_READY" as const;
      const onboarding = await tx.odOnboarding.findUniqueOrThrow({ where: { orderId } });
      const now = new Date();
      if (onboarding.state !== targetState) {
        await tx.odOnboardingTransition.create({ data: { onboardingId: onboarding.id, fromState: onboarding.state, toState: targetState, actorType: "SYSTEM", note: "Ödeme sonrası hesap ve ürün erişimi otomatik hazırlandı.", metadata: { studentUserId: student.id, parentUserId: parentUserId ?? null, membershipId: membership.id }, occurredAt: now } });
      }
      await tx.odOnboarding.update({
        where: { id: onboarding.id },
        data: { state: targetState, flowType: existingStudent ? "EXISTING_STUDENT" : "NEW_STUDENT", dueAt: dueAtForOdOnboardingState(targetState, now), blockerReason: null, blockedFromState: null, stateEnteredAt: now, version: { increment: 1 } },
      });
      /*
       * HESAP DEVRALMA DAVETİ (OD-013).
       *
       * Hesap rastgele bir parolayla açıldı; sahibi onu bilmiyor. Davet
       * gitmezse müşterinin panele girebilmesi için bir insanın arayıp geçici
       * parola iletmesi gerekir — 100 müşteride sürdürülebilen, 10.000'de SLA
       * üreten adım tam olarak budur. Davet ZATEN DEVRALINMIŞ hesaba
       * gönderilmez (`issueAccountClaim` kontrol eder), yani ikinci bir ürün
       * satın alan mevcut müşteri gereksiz e-posta almaz.
       */
      if (claimTokens) {
        await issueAccountClaim(tx, { userId: student.id, audience: "STUDENT", odOrderId: orderId, generated: claimTokens[0] });
        if (parentUserId) await issueAccountClaim(tx, { userId: parentUserId, audience: "PARENT", odOrderId: orderId, generated: claimTokens[1] });
      } else {
        await tx.auditLog.create({ data: { actorType: "SYSTEM", entityType: "OdOrder", entityId: orderId, action: "account_claim.issue_skipped", summary: "Davet üretilemedi; hesap açıldı fakat davet gönderilmedi.", payload: { userId: student.id, parentUserId: parentUserId ?? null } } });
      }

      await tx.auditLog.createMany({ data: [
        { actorType: "SYSTEM", entityType: "ProductMembership", entityId: membership.id, action: existingMembership ? "product_membership.purchase_refreshed" : "product_membership.purchase_granted", summary: "OD satın alma erişimi açıldı", payload: { orderId, userId: student.id, product: "OD", source: "PURCHASE" } },
        ...(parentUserId ? [{ actorType: "SYSTEM" as const, entityType: "ParentStudent", entityId: `${parentUserId}:${profile.id}`, action: parentLinkCreated ? "parent_student.auto_linked" : "parent_student.link_confirmed", summary: "Veli öğrenci bağlantısı doğrulandı", payload: { orderId, parentUserId, studentProfileId: profile.id } }] : []),
        { actorType: "SYSTEM", entityType: "OdOrder", entityId: orderId, action: "od.provisioning.succeeded", summary: `Hesap ve OD erişimi hazırlandı; onboarding ${targetState}`, payload: { userId: student.id, parentUserId: parentUserId ?? null, flowType: existingStudent ? "EXISTING_STUDENT" : "NEW_STUDENT", onboardingState: targetState } },
      ] });
      return { status: "SUCCEEDED" as const, userId: student.id, parentUserId };
    }, { isolationLevel: "Serializable" });
    if (result.status === "SUCCEEDED") await provisionRemainingOdLines(orderId);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Bilinmeyen provisioning hatası";
    await prisma.odOrder.updateMany({
      where: { id: orderId, provisioningStatus: "RUNNING" },
      data: { provisioningStatus: "RETRY_PENDING", provisioningError: message },
    });
    await prisma.auditLog.create({ data: { actorType: "SYSTEM", entityType: "OdOrder", entityId: orderId, action: "od.provisioning.retry_pending", summary: message, payload: { code: error instanceof OdProvisioningError ? error.code : "UNEXPECTED" } } });
    throw error;
  }
}
