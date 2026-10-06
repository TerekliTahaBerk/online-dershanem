import { prisma } from "@/lib/prisma";
import { classifyOdMembership, type OdMembershipAuditClassification } from "@/lib/commerce/od-membership-audit";

/**
 * P0-5 salt-okunur denetim sorgusu. YALNIZ okur (`findMany`); hiçbir üyelik,
 * sipariş veya ödeme satırına yazmaz. Sınıflandırma `od-membership-audit.ts`.
 */

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 2)}***@${domain}`;
}

export type OdMembershipAuditCandidate = {
  userId: string;
  email: string;
  membershipId: string;
  source: string;
  sourceOdOrderId: string | null;
  startsAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  orderId: string;
  orderStatus: string;
  provisioningStatus: string;
  paymentStatuses: string[];
  lineProducts: string[];
  hasOdLine: boolean;
};

export async function runOdMembershipAudit(options: { includeEmail?: boolean; now?: Date } = {}) {
  const now = options.now ?? new Date();
  const memberships = await prisma.productMembership.findMany({
    where: { product: "OD" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      userId: true,
      source: true,
      sourceOdOrderId: true,
      startsAt: true,
      expiresAt: true,
      revokedAt: true,
      user: { select: { email: true } },
      sourceOdOrder: {
        select: {
          id: true,
          status: true,
          provisioningStatus: true,
          lines: { select: { product: true } },
          payments: { select: { status: true } },
        },
      },
    },
  });

  const byClassification: Record<OdMembershipAuditClassification, number> = {
    CANDIDATE: 0,
    HAS_OD_LINE: 0,
    LEGACY_LINELESS_ORDER: 0,
    OD_EVIDENCE_ELSEWHERE: 0,
    NOT_PURCHASE: 0,
    SOURCE_ORDER_UNKNOWN: 0,
  };
  const candidates: OdMembershipAuditCandidate[] = [];

  for (const membership of memberships) {
    const sourceOrder = membership.sourceOdOrder
      ? { lineProducts: membership.sourceOdOrder.lines.map((line) => line.product) }
      : null;

    // Başka OD kanıtı yalnız gerektiğinde sorgulanır: kullanıcının (öğrenci
    // ya da satır sahibi olarak) ödenmiş, OD satırlı veya satırsız eski siparişi.
    let otherOdEvidenceOrderIds: string[] = [];
    const needsEvidence = membership.source === "PURCHASE"
      && sourceOrder !== null
      && sourceOrder.lineProducts.length > 0
      && !sourceOrder.lineProducts.includes("OD");
    if (needsEvidence) {
      const evidence = await prisma.odOrder.findMany({
        where: {
          id: { not: membership.sourceOdOrderId! },
          status: "PAID",
          OR: [
            { userId: membership.userId, lines: { some: { product: "OD" } } },
            { userId: membership.userId, lines: { none: {} } },
            { lines: { some: { product: "OD", fulfillmentOwnerUserId: membership.userId } } },
          ],
        },
        select: { id: true },
      });
      otherOdEvidenceOrderIds = evidence.map((order) => order.id);
    }

    const classification = classifyOdMembership({
      membership: { source: membership.source, sourceOdOrderId: membership.sourceOdOrderId },
      sourceOrder,
      otherOdEvidenceOrderIds,
    });
    byClassification[classification] += 1;

    if (classification === "CANDIDATE" && membership.sourceOdOrder) {
      candidates.push({
        userId: membership.userId,
        email: options.includeEmail ? membership.user.email : maskEmail(membership.user.email),
        membershipId: membership.id,
        source: membership.source,
        sourceOdOrderId: membership.sourceOdOrderId,
        startsAt: membership.startsAt.toISOString(),
        expiresAt: membership.expiresAt?.toISOString() ?? null,
        revokedAt: membership.revokedAt?.toISOString() ?? null,
        orderId: membership.sourceOdOrder.id,
        orderStatus: membership.sourceOdOrder.status,
        provisioningStatus: membership.sourceOdOrder.provisioningStatus,
        paymentStatuses: membership.sourceOdOrder.payments.map((payment) => payment.status),
        lineProducts: membership.sourceOdOrder.lines.map((line) => line.product),
        hasOdLine: false,
      });
    }
  }

  return {
    checkedAt: now.toISOString(),
    readOnly: true as const,
    totals: { scanned: memberships.length, byClassification },
    candidates,
  };
}
