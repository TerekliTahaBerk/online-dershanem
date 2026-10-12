import { z } from "zod";
import type { BusinessPermission } from "@/lib/business/permission-matrix";

/**
 * İŞLETME CRM KOMUTLARI (P2.7b) — web Server Action'ları ve mobil
 * `POST /api/panel/business/crm` AYNI şemayı ve AYNI servisi
 * (`runCrmCommand`) kullanır. Alan sınırları Server Action'lardaki zod
 * şemalarıyla birebir aynıdır.
 */

const cuid = z.string().cuid();
export const LEAD_STAGE_VALUES = ["NEW", "CONTACTED", "QUALIFIED", "MEETING_PLANNED", "TRIAL_PLANNED", "OFFER_SENT", "PAYMENT_PENDING", "WON", "LOST", "SPAM"] as const;
export const LOST_REASON_VALUES = ["PRICE", "UNREACHABLE", "COMPETITOR", "DECISION_POSTPONED", "PRODUCT_MISMATCH", "WRONG_LEAD", "OTHER"] as const;
const productInterest = z.enum(["ONLINE_DERSHANEM", "ONLINE_DENEME_KULUBU", "UNKNOWN"]);

export const crmCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("conversation.control"), conversationId: cuid, aiMode: z.enum(["OFF", "SUGGESTION", "AUTO_SAFE", "AUTO"]), status: z.enum(["OPEN", "WAITING_HUMAN", "CLOSED", "SPAM"]) }).strict(),
  z.object({ type: z.literal("conversation.read"), conversationId: cuid }).strict(),
  z.object({ type: z.literal("conversation.assign"), conversationId: cuid, assignedUserId: cuid.or(z.literal("")) }).strict(),
  z.object({ type: z.literal("conversation.tag"), conversationId: cuid, tag: z.string().trim().min(1).max(40) }).strict(),
  z.object({ type: z.literal("conversation.ai_suggest"), conversationId: cuid }).strict(),
  z.object({ type: z.literal("lead.create"), businessUnitId: z.string().min(1).max(64).optional(), firstName: z.string().trim().min(1).max(100), phone: z.string().max(30).optional(), email: z.string().email().optional(), productInterest }).strict(),
  z.object({ type: z.literal("lead.stage"), leadId: cuid, stage: z.enum(LEAD_STAGE_VALUES), lostReasonCode: z.enum(LOST_REASON_VALUES).optional(), lostReasonDetail: z.string().trim().max(500).optional() }).strict(),
  z.object({ type: z.literal("lead.note"), leadId: cuid, note: z.string().trim().min(2).max(2000) }).strict(),
  z.object({ type: z.literal("lead.task"), leadId: cuid, title: z.string().trim().min(2).max(160), note: z.string().trim().max(2000).optional(), dueAt: z.string().max(40).optional(), assignedUserId: cuid.or(z.literal("")).optional(), setFollowUp: z.boolean().optional() }).strict(),
  z.object({ type: z.literal("lead.task_complete"), taskId: cuid }).strict(),
  z.object({ type: z.literal("lead.follow_up"), leadId: cuid, nextFollowUpAt: z.string().min(1).max(40), note: z.string().trim().max(2000).optional(), taskTitle: z.string().trim().max(160).optional(), assignedUserId: cuid.or(z.literal("")).optional() }).strict(),
  z.object({ type: z.literal("lead.owner"), leadId: cuid, assignedUserId: cuid.or(z.literal("")) }).strict(),
  z.object({ type: z.literal("lead.priority"), leadId: cuid, priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]) }).strict(),
  z.object({ type: z.literal("lead.duplicate_dismiss"), leadId: cuid }).strict(),
  z.object({ type: z.literal("lead.merge"), sourceId: cuid, targetId: cuid }).strict(),
  z.object({ type: z.literal("lead.link_order"), leadId: cuid, product: z.enum(["OD", "ODK"]), orderId: cuid }).strict(),
  z.object({ type: z.literal("lead.link_lifecycle"), leadId: cuid, userId: z.string().max(64).optional(), odOrderId: z.string().max(64).optional(), odkOrderId: z.string().max(64).optional(), force: z.boolean().optional() }).strict(),
]);

export type CrmCommand = z.infer<typeof crmCommandSchema>;
export type CrmCommandType = CrmCommand["type"];

/** Komutun gerektirdiği işletme izni (web Server Action'larıyla aynı). */
export function crmPermission(type: CrmCommandType): BusinessPermission {
  if (type === "conversation.read") return "conversation:read";
  if (type.startsWith("conversation.")) return "conversation:reply";
  return "lead:write";
}

/**
 * Kaydın tamamını değiştiren komutlar eski görünüme karşı korunur: Bearer
 * istemcisi `expectedRevision` (kaydın `updatedAt` değeri) göndermek zorundadır.
 * Ekleyici komutlar (not, görev, etiket, okundu, AI önerisi) revizyon istemez.
 */
export const CRM_REVISIONED: ReadonlySet<CrmCommandType> = new Set([
  "conversation.control",
  "conversation.assign",
  "lead.stage",
  "lead.follow_up",
  "lead.owner",
  "lead.priority",
  "lead.merge",
  "lead.link_order",
  "lead.link_lifecycle",
]);

export const crmRequestSchema = z
  .object({
    command: crmCommandSchema,
    idempotencyKey: z.string().uuid().optional(),
    expectedRevision: z.string().max(40).optional(),
  })
  .strict();
