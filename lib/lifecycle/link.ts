import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { evaluateLeadUserMatch } from "@/lib/lifecycle/identity";

export class LifecycleLinkError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "LifecycleLinkError";
  }
}

type LinkInput = {
  leadId: string;
  actorUserId: string;
  odOrderId?: string | null;
  odkOrderId?: string | null;
  userId?: string | null;
  force?: boolean;
};

/**
 * Lead'i sipariş ve/veya öğrenci hesabına bağlar.
 * Duplicate öğrenci yaratmaz; mevcut userId zorunlu veya yüksek güvenli eşleşme gerekir.
 */
export async function linkLeadLifecycleEntities(input: LinkInput) {
  const lead = await prisma.businessLead.findUnique({ where: { id: input.leadId } });
  if (!lead) throw new LifecycleLinkError("Aday bulunamadı.", "LEAD_NOT_FOUND");

  let userId = input.userId ?? lead.relatedOdUserId ?? lead.relatedOdkUserId ?? null;

  if (input.odOrderId) {
    const order = await prisma.odOrder.findUnique({
      where: { id: input.odOrderId },
      select: { id: true, userId: true, status: true },
    });
    if (!order) throw new LifecycleLinkError("OD siparişi bulunamadı.", "ORDER_NOT_FOUND");
    if (order.userId) userId = order.userId;
  }
  if (input.odkOrderId) {
    const order = await prisma.odkOrder.findUnique({
      where: { id: input.odkOrderId },
      select: { id: true, studentUserId: true, status: true },
    });
    if (!order) throw new LifecycleLinkError("ODK siparişi bulunamadı.", "ORDER_NOT_FOUND");
    if (order.studentUserId) userId = order.studentUserId;
  }

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true, email: true, phone: true, fullName: true },
    });
    if (!user || user.role !== "STUDENT" || user.status !== "ACTIVE") {
      throw new LifecycleLinkError("Bağlanacak hesap aktif öğrenci değil.", "USER_NOT_STUDENT");
    }
    const match = evaluateLeadUserMatch(
      { email: lead.email, phone: lead.phone, relatedUserId: lead.relatedOdUserId || lead.relatedOdkUserId },
      [{ userId: user.id, role: user.role, status: user.status, email: user.email, phone: user.phone, fullName: user.fullName }],
    );
    if (match.decision === "BLOCK" && !input.force) {
      throw new LifecycleLinkError(match.message, "IDENTITY_BLOCKED");
    }
    if (match.decision === "NONE" && !input.force && !input.userId) {
      throw new LifecycleLinkError("Kimlik sinyali yok; force veya açık userId gerekli.", "IDENTITY_WEAK");
    }
  }

  const data: Prisma.BusinessLeadUpdateInput = {};
  if (input.odOrderId) data.relatedOdOrderId = input.odOrderId;
  if (input.odkOrderId) data.relatedOdkOrderId = input.odkOrderId;
  if (userId && (input.odOrderId || lead.relatedOdOrderId || lead.productInterest !== "ONLINE_DENEME_KULUBU")) {
    data.relatedOdUserId = userId;
  }
  if (userId && (input.odkOrderId || lead.relatedOdkOrderId || lead.productInterest === "ONLINE_DENEME_KULUBU")) {
    data.relatedOdkUserId = userId;
  }
  if (input.userId && !input.odOrderId && !input.odkOrderId) {
    if (lead.productInterest === "ONLINE_DENEME_KULUBU") data.relatedOdkUserId = input.userId;
    else data.relatedOdUserId = input.userId;
  }

  await prisma.$transaction(async (tx) => {
    await tx.businessLead.update({ where: { id: lead.id }, data });
    await tx.leadActivity.create({
      data: {
        leadId: lead.id,
        type: userId ? "ACCOUNT_LINKED" : "ORDER_LINKED",
        fromValue: lead.stage,
        toValue: lead.stage,
        actorUserId: input.actorUserId,
        metadata: {
          odOrderId: input.odOrderId ?? null,
          odkOrderId: input.odkOrderId ?? null,
          userId: userId ?? null,
          force: Boolean(input.force),
        },
      },
    });
  });

  await logAudit({
    actorUserId: input.actorUserId,
    entityType: "BusinessLead",
    entityId: lead.id,
    action: input.force ? "lead.lifecycle.manual_override" : "lead.lifecycle.user_linked",
    summary: input.force ? "Lead lifecycle manuel override ile bağlandı" : "Lead sipariş/hesap ile bağlandı",
    payload: {
      odOrderId: input.odOrderId ?? null,
      odkOrderId: input.odkOrderId ?? null,
      userId: userId ?? null,
      force: Boolean(input.force),
    },
  });

  return { leadId: lead.id, userId, odOrderId: input.odOrderId ?? lead.relatedOdOrderId, odkOrderId: input.odkOrderId ?? lead.relatedOdkOrderId };
}
