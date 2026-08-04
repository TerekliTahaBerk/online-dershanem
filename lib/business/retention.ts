import "server-only";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const pseudonym = (id: string) => `anon_${createHash("sha256").update(`${process.env.INTEGRATION_ENCRYPTION_KEY ?? "local"}:${id}`).digest("hex").slice(0, 18)}`;

export async function applyBusinessRetention(now = new Date()) {
  const units = await prisma.businessUnit.findMany({ where: { isActive: true }, select: { id: true, retentionDays: true } });
  let conversations = 0; let leads = 0;
  for (const unit of units) {
    const cutoff = new Date(now.getTime() - unit.retentionDays * 86_400_000);
    const expired = await prisma.businessConversation.findMany({ where: { businessUnitId: unit.id, anonymizedAt: null, lastMessageAt: { lt: cutoff }, status: { in: ["CLOSED", "SPAM"] } }, select: { id: true, lead: { select: { id: true } } }, take: 500 });
    for (const item of expired) {
      await prisma.$transaction(async (tx) => {
        await tx.businessMessage.updateMany({ where: { conversationId: item.id }, data: { body: null, mediaMetadata: Prisma.JsonNull, providerMetadata: Prisma.JsonNull } });
        await tx.businessConversation.update({ where: { id: item.id }, data: { instagramScopedUserId: pseudonym(item.id), username: null, displayName: null, profilePictureUrl: null, tags: [], summary: null, anonymizedAt: now } });
        if (item.lead) await tx.businessLead.update({ where: { id: item.lead.id }, data: { firstName: null, lastName: null, instagramScopedId: null, phone: null, normalizedPhone: null, email: null, normalizedEmail: null, studentName: null, parentName: null, city: null, consentMetadata: Prisma.JsonNull, anonymizedAt: now } });
      });
      conversations++; if (item.lead) leads++;
    }
  }
  return { conversations, leads };
}
