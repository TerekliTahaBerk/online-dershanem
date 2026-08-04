import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
export { extractReferralAttribution, selectAttributionModel } from "@/lib/business/attribution-core";
import { extractReferralAttribution } from "@/lib/business/attribution-core";

export async function attributeLeadFromReferral(
  leadId: string,
  businessUnitId: string,
  referral: unknown,
  client: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const extracted = extractReferralAttribution(referral);
  if (!extracted.adExternalId && !extracted.campaignExternalId) return null;
  const advertisement = extracted.adExternalId ? await client.businessAdvertisement.findFirst({
    where: { externalId: extracted.adExternalId, adSet: { campaign: { businessUnitId } } },
    include: { adSet: { select: { campaignId: true } } },
  }) : null;
  const campaign = advertisement
    ? { id: advertisement.adSet.campaignId }
    : extracted.campaignExternalId
      ? await client.businessCampaign.findFirst({ where: { businessUnitId, externalId: extracted.campaignExternalId }, select: { id: true } })
      : null;
  if (!advertisement && !campaign) return null;
  const existing = await client.attribution.findFirst({
    where: { leadId, campaignId: campaign?.id ?? null, advertisementId: advertisement?.id ?? null, model: "FIRST_TOUCH" },
  });
  if (existing) return existing;
  return client.attribution.create({ data: {
    leadId,
    campaignId: campaign?.id ?? null,
    advertisementId: advertisement?.id ?? null,
    model: "FIRST_TOUCH",
    confidence: extracted.confidence,
  } });
}
