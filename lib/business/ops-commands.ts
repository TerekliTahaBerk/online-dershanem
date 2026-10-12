import { z } from "zod";
import { governanceSchemas } from "./governance-commands";
import type { BusinessPermission } from "@/lib/business/permission-matrix";

/**
 * İŞLETME KOMUTLARI (P2.7c–d) — web Server Action'ları ve
 * mobil `POST /api/panel/business/ops` AYNI şemayı ve AYNI servisi
 * (`runOpsCommand`) kullanır. Alan sınırları Server Action'lardaki zod
 * şemalarıyla birebir aynıdır (TL tutarları; kuruş dönüşümü sunucuda).
 */

const cuid = z.string().cuid();
const unit = z.string().min(1).max(64).optional();
const interest = z.enum(["ONLINE_DERSHANEM", "ONLINE_DENEME_KULUBU", "UNKNOWN"]);
const count = z.coerce.number().int().min(0);
const tl = z.coerce.number().min(0).max(100_000_000);

export const opsCommandSchema = z.discriminatedUnion("type", [
  ...governanceSchemas,
  z.object({ type: z.literal("campaign.create"), businessUnitId: unit, name: z.string().trim().min(2).max(160), platform: z.string().trim().min(2).max(40), budgetTl: tl, productInterest: interest }).strict(),
  z.object({ type: z.literal("advertisement.create"), campaignId: cuid, adSetName: z.string().trim().min(2).max(160), name: z.string().trim().min(2).max(160), spentTl: tl, impressions: count, clicks: count, messageStarts: count, leadCount: count, saleCount: count, revenueTl: tl }).strict(),
  z.object({ type: z.literal("attribution.manual"), leadId: cuid, campaignId: cuid.or(z.literal("")), advertisementId: cuid.or(z.literal("")) }).strict(),
  z.object({ type: z.literal("meta_ads.sync") }).strict(),
  z.object({ type: z.literal("finance.create"), businessUnitId: unit, kind: z.enum(["MANUAL_INCOME", "EXPENSE", "ADJUSTMENT"]), description: z.string().trim().min(2).max(300), category: z.string().trim().min(2).max(80), amountTl: z.coerce.number().positive().max(100_000_000), vatRate: z.coerce.number().min(0).max(100).default(0), withholdingRate: z.coerce.number().min(0).max(100).default(0), commissionTl: tl.default(0), transactionDate: z.string().date().optional() }).strict(),
  z.object({ type: z.literal("finance.reverse"), transactionId: cuid }).strict(),
  z.object({ type: z.literal("period.lock"), businessUnitId: unit, startsAt: z.string().date(), endsAt: z.string().date() }).strict(),
  z.object({ type: z.literal("reconciliation.run") }).strict(),
  z.object({ type: z.literal("reconciliation.resolve"), id: cuid, status: z.enum(["MANUALLY_MATCHED", "CORRECTED"]) }).strict(),
]);

export type OpsCommand = z.infer<typeof opsCommandSchema>;
export type OpsCommandType = OpsCommand["type"];

/** Komutun gerektirdiği işletme izni (web Server Action'larıyla aynı). */
export function opsPermission(type: OpsCommandType): BusinessPermission {
  switch (type) {
    case "knowledge.create":
    case "knowledge.version":
    case "prompt.create": return "knowledge:write";
    case "automation.create":
    case "automation.toggle":
    case "automation.dry_run": return "automation:write";
    case "retention.update": return "settings:write";
    case "role.assign":
    case "role.revoke": return "role:write";
    case "campaign.create":
    case "advertisement.create":
    case "attribution.manual":
      return "campaign:write";
    case "meta_ads.sync":
      return "integration:write";
    case "finance.reverse":
    case "period.lock":
      return "finance:reverse";
    default:
      return "finance:write";
  }
}

/** Web'de `requireRecentBusinessPage` ile korunan finans ve rol işlemleri: taze step-up. */
export const OPS_STEP_UP: ReadonlySet<OpsCommandType> = new Set(["finance.create", "finance.reverse", "period.lock", "role.assign", "role.revoke"]);

/** Finans bayrağı kapalıyken açılmayan komutlar (finans bölümleriyle aynı). */
export const OPS_FINANCE: ReadonlySet<OpsCommandType> = new Set(["finance.create", "finance.reverse", "period.lock", "reconciliation.run", "reconciliation.resolve"]);

export const opsRequestSchema = z.object({ command: opsCommandSchema, idempotencyKey: z.string().uuid().optional() }).strict();
