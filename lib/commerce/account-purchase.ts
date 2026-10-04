import "server-only";

import type { BeneficiaryInput } from "@/lib/commerce/beneficiary";
import type { Prisma, ProductCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

/**
 * GİRİŞ YAPMIŞ KULLANICININ SATIN ALIMI.
 *
 * Kendi kendine kayıt sonrası Öğrenci ve Veli hesabı paket alabilir. Ödeme
 * sonrası erişim OTOMATİK açılır; kime açılacağını bu modül sipariş anında
 * sabitler:
 *
 *  - STUDENT oturumu: paket öğrencinin KENDİ hesabına. Formdaki e-posta ne
 *    olursa olsun öğrenci e-postası oturumdan alınır; aksi halde provisioning
 *    yazım hatalı bir e-postayla ikinci bir öğrenci hesabı açardı.
 *  - PARENT + bağlı çocuk: paket çocuğun hesabına, veli bağı korunur.
 *  - PARENT + bekleyen çocuk (`PendingChild`): öğrenci hesabı YOK. Ödeme
 *    sonrası velinin kendi üyeliği açılır, sipariş "öğrenci hesabı bekleniyor"
 *    olarak yönetim kuyruğuna düşer; hesabı admin açınca öğrencinin erişimi de
 *    açılır.
 *  - Oturum yok ya da personel: eski anonim akış aynen sürer.
 *
 * GÜVENLİK: istemciden gelen `beneficiary` yalnız bir SEÇİMDİR; çocuğun
 * gerçekten bu veliye bağlı / bu velinin bildirdiği bir kayıt olduğu burada
 * sunucuda doğrulanır. Başkasının çocuğu için sipariş açılamaz.
 */

export { beneficiarySchema, type BeneficiaryInput } from "@/lib/commerce/beneficiary";

type Person = { userId: string; email: string; fullName: string | null; phone: string | null };

export type PurchaseContext =
  | { kind: "anonymous" }
  | { kind: "student"; buyer: Person }
  | { kind: "parent-linked"; buyer: Person; student: Person }
  | { kind: "parent-pending"; buyer: Person; pendingChildId: string; childName: string };

export type PurchaseContextResult = { ok: true; context: PurchaseContext } | { ok: false; status: number; error: string };

export async function resolvePurchaseContext(beneficiary: BeneficiaryInput): Promise<PurchaseContextResult> {
  const session = await getSession();
  if (!session || (session.role !== "STUDENT" && session.role !== "PARENT")) {
    return { ok: true, context: { kind: "anonymous" } };
  }
  const account = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, fullName: true, phone: true },
  });
  if (!account) return { ok: true, context: { kind: "anonymous" } };
  const buyer: Person = { userId: account.id, email: account.email, fullName: account.fullName, phone: account.phone };

  if (session.role === "STUDENT") return { ok: true, context: { kind: "student", buyer } };

  if (!beneficiary) {
    return { ok: false, status: 400, error: "Paketin hangi çocuğunuz için olduğunu seçin." };
  }
  if (beneficiary.type === "linked") {
    const link = await prisma.parentStudent.findFirst({
      where: { parentId: account.id, studentId: beneficiary.id, active: true, endedAt: null },
      select: { student: { select: { user: { select: { id: true, email: true, fullName: true, phone: true, status: true } } } } },
    });
    const student = link?.student.user;
    if (!student || student.status !== "ACTIVE") return { ok: false, status: 404, error: "Seçilen öğrenci hesabınıza bağlı değil." };
    return {
      ok: true,
      context: { kind: "parent-linked", buyer, student: { userId: student.id, email: student.email, fullName: student.fullName, phone: student.phone } },
    };
  }
  const child = await prisma.pendingChild.findFirst({
    where: { id: beneficiary.id, parentUserId: account.id, status: "PENDING" },
    select: { id: true, fullName: true },
  });
  if (!child) return { ok: false, status: 404, error: "Seçilen çocuk kaydı bulunamadı." };
  return { ok: true, context: { kind: "parent-pending", buyer, pendingChildId: child.id, childName: child.fullName } };
}

/**
 * Sipariş `buyerInfo` alanlarını bağlama göre sabitler. Döndürülen
 * `ownerEmail` satırların varsayılan teslim sahibidir (`fulfillmentOwnerKey`).
 */
export function applyPurchaseContext<T extends Record<string, unknown>>(
  buyerInfo: T,
  context: PurchaseContext,
): { buyerInfo: T & Record<string, unknown>; ownerEmail: string | null; ownerName: string | null; ownerPhone: string | null } {
  switch (context.kind) {
    case "anonymous":
      return { buyerInfo, ownerEmail: null, ownerName: null, ownerPhone: null };
    case "student":
      return {
        buyerInfo: {
          ...buyerInfo,
          email: context.buyer.email,
          studentEmail: context.buyer.email,
          accountUserId: context.buyer.userId,
        },
        ownerEmail: context.buyer.email,
        ownerName: context.buyer.fullName,
        ownerPhone: context.buyer.phone,
      };
    case "parent-linked":
      return {
        buyerInfo: {
          ...buyerInfo,
          email: context.buyer.email,
          studentEmail: context.student.email,
          studentFullName: context.student.fullName,
          studentPhone: context.student.phone,
          parentFullName: context.buyer.fullName,
          parentPhone: context.buyer.phone,
          parentEmail: context.buyer.email,
          accountUserId: context.buyer.userId,
        },
        ownerEmail: context.student.email,
        ownerName: context.student.fullName,
        ownerPhone: context.student.phone,
      };
    case "parent-pending":
      return {
        buyerInfo: {
          ...buyerInfo,
          email: context.buyer.email,
          // Öğrenci hesabı yok; satır sahibi anahtarı geçici olarak velidir.
          studentEmail: context.buyer.email,
          studentPhone: context.buyer.phone,
          studentFullName: context.childName,
          parentFullName: context.buyer.fullName,
          parentPhone: context.buyer.phone,
          parentEmail: context.buyer.email,
          accountUserId: context.buyer.userId,
          pendingChildId: context.pendingChildId,
        },
        // Öğrenci hesabı yok: satır sahibi geçici olarak velidir; admin hesabı
        // açınca provisioning bu satırı çocuğa yönlendirir (bkz. provisioning).
        ownerEmail: context.buyer.email,
        ownerName: context.childName,
        ownerPhone: context.buyer.phone,
      };
  }
}

export function contextOrderFields(context: PurchaseContext): { buyerUserId: string | null; pendingChildId: string | null } {
  if (context.kind === "anonymous") return { buyerUserId: null, pendingChildId: null };
  return { buyerUserId: context.buyer.userId, pendingChildId: context.kind === "parent-pending" ? context.pendingChildId : null };
}

type Db = Prisma.TransactionClient;

/**
 * Pencereli üyelik birleştirme: mevcut üyelik daha erken başlıyorsa başlangıç
 * korunur, bitişlerden geç olan seçilir (null = süresiz kazanır).
 */
export async function upsertMergedMembership(
  tx: Db,
  input: { userId: string; product: ProductCode; startsAt: Date; expiresAt: Date | null; sourceOdOrderId?: string | null },
): Promise<void> {
  const existing = await tx.productMembership.findUnique({
    where: { userId_product: { userId: input.userId, product: input.product } },
    select: { startsAt: true, expiresAt: true, revokedAt: true },
  });
  const live = existing && !existing.revokedAt ? existing : null;
  const startsAt = live && live.startsAt < input.startsAt ? live.startsAt : input.startsAt;
  const expiresAt = live
    ? live.expiresAt === null || input.expiresAt === null
      ? null
      : new Date(Math.max(live.expiresAt.getTime(), input.expiresAt.getTime()))
    : input.expiresAt;
  await tx.productMembership.upsert({
    where: { userId_product: { userId: input.userId, product: input.product } },
    create: { userId: input.userId, product: input.product, source: "PURCHASE", startsAt, expiresAt, sourceOdOrderId: input.sourceOdOrderId ?? null },
    update: { source: "PURCHASE", revokedAt: null, startsAt, expiresAt, ...(input.sourceOdOrderId ? { sourceOdOrderId: input.sourceOdOrderId } : {}) },
  });
}

/** Ödeyen velinin hesabı (yoksa null). Personel/öğrenci alıcıda veli üyeliği açılmaz. */
export async function parentBuyerId(tx: Db, buyerUserId: string | null): Promise<string | null> {
  if (!buyerUserId) return null;
  const buyer = await tx.user.findUnique({ where: { id: buyerUserId }, select: { id: true, role: true, status: true } });
  return buyer && buyer.role === "PARENT" && buyer.status === "ACTIVE" ? buyer.id : null;
}
