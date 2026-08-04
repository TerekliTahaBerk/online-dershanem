import "server-only";
import { prisma } from "@/lib/prisma";
import { filterNotificationRows, queuePanelNotificationEmails } from "@/lib/panel-notifications";
export interface AdPlatformProvider { health(): Promise<{ ok: boolean; code: string }>; syncCampaigns(): Promise<{ synced: number }>; }
export interface AccountingProvider { health(): Promise<{ ok: boolean; code: string }>; exportPeriod(input: { startsAt: Date; endsAt: Date }): Promise<{ reference: string }>; }
export interface NotificationProvider { notify(input: { title: string; body: string; href?: string; userIds: string[] }): Promise<void>; }
export class MockAdPlatformProvider implements AdPlatformProvider { async health(){ return { ok: true, code: "MOCK" }; } async syncCampaigns(){ return { synced: 0 }; } }
export class MockAccountingProvider implements AccountingProvider { async health(){ return { ok: true, code: "MOCK" }; } async exportPeriod(){ return { reference: "mock" }; } }

export class DatabaseNotificationProvider implements NotificationProvider {
  async notify(input: { title: string; body: string; href?: string; userIds: string[] }) {
    const userIds = [...new Set(input.userIds)];
    if (!userIds.length) return;
    const rows = await filterNotificationRows(userIds.map((userId) => ({ userId, type: "SYSTEM" as const, title: input.title, body: input.body, href: input.href })));
    await prisma.notification.createMany({ data: rows });
    await queuePanelNotificationEmails(rows);
  }
}

type MetaInsight = {
  campaign_id: string; campaign_name: string; adset_id: string; adset_name: string;
  ad_id: string; ad_name: string; spend?: string; impressions?: string; reach?: string; clicks?: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
};

export class MetaAdsProvider implements AdPlatformProvider {
  private token = process.env.META_ADS_ACCESS_TOKEN;
  private accountId = process.env.META_AD_ACCOUNT_ID;
  private version = process.env.META_GRAPH_API_VERSION;
  async health() { return { ok: Boolean(this.token && this.accountId && this.version), code: this.token && this.accountId && this.version ? "CONFIGURED" : "MISSING_CONFIGURATION" }; }
  async syncCampaigns() {
    if (!this.token || !this.accountId || !this.version) throw new Error("META_ADS_CONFIGURATION_MISSING");
    const unit = await prisma.businessUnit.findUnique({ where: { product: "OD" } });
    if (!unit) throw new Error("BUSINESS_UNIT_MISSING");
    const fields = "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,reach,clicks,actions,action_values";
    const url = new URL(`https://graph.facebook.com/${this.version}/act_${this.accountId.replace(/^act_/, "")}/insights`);
    url.searchParams.set("level", "ad"); url.searchParams.set("date_preset", "last_30d"); url.searchParams.set("fields", fields); url.searchParams.set("limit", "500");
    const rows: MetaInsight[] = []; let next: string | null = url.toString();
    for (let page = 0; page < 10 && next; page++) {
      const response = await fetch(next, { headers: { authorization: `Bearer ${this.token}` }, signal: AbortSignal.timeout(20_000) });
      const payload = await response.json() as { data?: MetaInsight[]; paging?: { next?: string }; error?: { code?: number } };
      if (!response.ok) throw new Error(`META_ADS_${payload.error?.code ?? response.status}`);
      rows.push(...(payload.data ?? [])); next = payload.paging?.next ?? null;
    }
    let synced = 0;
    for (const row of rows) {
      const campaign = await prisma.businessCampaign.upsert({ where: { businessUnitId_platform_externalId: { businessUnitId: unit.id, platform: "META", externalId: row.campaign_id } }, update: { name: row.campaign_name, status: "ACTIVE" }, create: { businessUnitId: unit.id, platform: "META", externalId: row.campaign_id, name: row.campaign_name, status: "ACTIVE" } });
      const adSet = await prisma.businessAdSet.upsert({ where: { campaignId_externalId: { campaignId: campaign.id, externalId: row.adset_id } }, update: { name: row.adset_name }, create: { campaignId: campaign.id, externalId: row.adset_id, name: row.adset_name, status: "ACTIVE" } });
      const action = (type: string) => Number(row.actions?.find((item) => item.action_type === type)?.value ?? 0);
      const value = (type: string) => Math.round(Number(row.action_values?.find((item) => item.action_type === type)?.value ?? 0) * 100);
      await prisma.businessAdvertisement.upsert({ where: { adSetId_externalId: { adSetId: adSet.id, externalId: row.ad_id } }, update: {
        name: row.ad_name, spentCents: Math.round(Number(row.spend ?? 0) * 100), impressions: Number(row.impressions ?? 0), reach: Number(row.reach ?? 0), clicks: Number(row.clicks ?? 0),
        messageStarts: action("onsite_conversion.messaging_conversation_started_7d"), leadCount: action("lead"), saleCount: action("purchase"), revenueCents: value("purchase"),
      }, create: { adSetId: adSet.id, externalId: row.ad_id, name: row.ad_name, spentCents: Math.round(Number(row.spend ?? 0) * 100), impressions: Number(row.impressions ?? 0), reach: Number(row.reach ?? 0), clicks: Number(row.clicks ?? 0), messageStarts: action("onsite_conversion.messaging_conversation_started_7d"), leadCount: action("lead"), saleCount: action("purchase"), revenueCents: value("purchase") } });
      synced++;
    }
    return { synced };
  }
}

export function getAdPlatformProvider(): AdPlatformProvider {
  return process.env.NODE_ENV === "production" && process.env.META_ADS_INTEGRATION_ENABLED === "true" ? new MetaAdsProvider() : new MockAdPlatformProvider();
}
