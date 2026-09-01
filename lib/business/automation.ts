import "server-only";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DatabaseNotificationProvider } from "@/lib/business/providers";

export const automationTriggerSchema = z.enum(["NEW_MESSAGE", "HOT_LEAD", "PAYMENT_COMPLETED", "COMPLAINT", "UNANSWERED_HOT_LEAD"]);
export const automationConditionSchema = z.object({
  temperature: z.enum(["COLD", "WARM", "HOT"]).optional(),
  intent: z.string().max(60).optional(),
  campaignExternalId: z.string().max(120).optional(),
});
export const automationActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SUGGEST_AI_REPLY") }),
  z.object({ type: z.literal("ASSIGN_SALES") }),
  z.object({ type: z.literal("MARK_WON") }),
  z.object({ type: z.literal("NOTIFY_ADMIN") }),
  z.object({ type: z.literal("ADD_TAG"), tag: z.string().trim().min(1).max(40).default("otomasyon") }),
  z.object({ type: z.literal("STOP_AI") }),
  z.object({ type: z.literal("MARK_SPAM") }),
  z.object({ type: z.literal("CREATE_TASK"), title: z.string().trim().min(2).max(160).default("Adayı takip et") }),
]);

type AutomationContext = { businessUnitId: string; entityType: "conversation" | "lead" | "payment"; entityId: string; conversationId?: string; leadId?: string; temperature?: "COLD" | "WARM" | "HOT"; intent?: string; campaignExternalId?: string | null };
export function conditionsMatch(conditions: unknown, context: AutomationContext) {
  const parsed = automationConditionSchema.safeParse(conditions);
  if (!parsed.success) return false;
  const value = parsed.data;
  return (!value.temperature || value.temperature === context.temperature)
    && (!value.intent || value.intent === context.intent)
    && (!value.campaignExternalId || value.campaignExternalId === context.campaignExternalId);
}

export async function executeAutomations(trigger: z.infer<typeof automationTriggerSchema>, context: AutomationContext) {
  const rules = await prisma.automationRule.findMany({ where: { businessUnitId: context.businessUnitId, triggerType: trigger, isActive: true } });
  for (const rule of rules) {
    const started = Date.now(); let result = "SKIPPED"; let errorCode: string | null = null; const applied: string[] = [];
    try {
      if (!conditionsMatch(rule.conditions, context)) continue;
      const actions = z.array(automationActionSchema).max(10).parse(rule.actions);
      for (const action of actions) {
        if (action.type === "SUGGEST_AI_REPLY" && context.conversationId) {
          const bucket = Math.floor(Date.now() / 8_000); const idempotencyKey = `ai-suggestion:${context.conversationId}:${bucket}`;
          await prisma.backgroundJob.upsert({ where: { idempotencyKey }, update: {}, create: { businessUnitId: context.businessUnitId, type: "GENERATE_AI_REPLY", idempotencyKey, payload: { conversationId: context.conversationId } } });
        }
        if (action.type === "ASSIGN_SALES") {
          const assignee = await prisma.businessRoleAssignment.findFirst({ where: { businessUnitId: context.businessUnitId, role: "SALES" }, orderBy: { createdAt: "asc" } });
          if (assignee) {
            if (context.leadId) await prisma.businessLead.update({ where: { id: context.leadId }, data: { assignedUserId: assignee.userId } });
            if (context.conversationId) await prisma.businessConversation.update({ where: { id: context.conversationId }, data: { assignedUserId: assignee.userId } });
          }
        }
        if (action.type === "MARK_WON" && context.leadId) await prisma.businessLead.update({ where: { id: context.leadId }, data: { stage: "WON", wonAt: new Date() } });
        if (action.type === "ADD_TAG") {
          if (context.leadId) await prisma.businessLead.update({ where: { id: context.leadId }, data: { tags: { push: action.tag } } });
          if (context.conversationId) await prisma.businessConversation.update({ where: { id: context.conversationId }, data: { tags: { push: action.tag } } });
        }
        if (action.type === "STOP_AI" && context.conversationId) await prisma.businessConversation.update({ where: { id: context.conversationId }, data: { aiMode: "OFF", status: "WAITING_HUMAN" } });
        if (action.type === "MARK_SPAM" && context.conversationId) await prisma.businessConversation.update({ where: { id: context.conversationId }, data: { aiMode: "OFF", status: "SPAM" } });
        if (action.type === "CREATE_TASK" && context.leadId) await prisma.leadTask.create({ data: { leadId: context.leadId, title: action.title } });
        if (action.type === "NOTIFY_ADMIN") {
          const admins = await prisma.businessRoleAssignment.findMany({ where: { businessUnitId: context.businessUnitId, role: { in: ["SUPER_ADMIN", "ADMIN"] } }, select: { userId: true } });
          await new DatabaseNotificationProvider().notify({ title: "İşletme merkezi uyarısı", body: `${trigger}: inceleme gerekiyor.`, href: context.conversationId ? `/panel/yonetim/isletme/mesaj-kutusu?conversation=${context.conversationId}` : "/panel/yonetim/isletme/genel-bakis", userIds: admins.map((item) => item.userId) });
        }
        applied.push(action.type);
      }
      result = "SUCCEEDED";
    } catch (error) { result = "FAILED"; errorCode = error instanceof Error ? error.message.slice(0, 100) : "UNKNOWN"; }
    await prisma.automationExecution.create({ data: { ruleId: rule.id, entityType: context.entityType, entityId: context.entityId, result, errorCode, durationMs: Date.now() - started, details: { trigger, applied } as Prisma.InputJsonValue } });
  }
}

export async function runUnansweredHotLeadAutomations(now = new Date()) {
  const cutoff = new Date(now.getTime() - 15 * 60_000);
  const conversations = await prisma.businessConversation.findMany({ where: { temperature: "HOT", status: { in: ["OPEN", "WAITING_HUMAN"] }, lastMessageAt: { lte: cutoff }, OR: [{ lastReplyBy: null }, { lastReplyBy: "CUSTOMER" }] }, include: { lead: { select: { id: true } } }, take: 200 });
  for (const conversation of conversations) await executeAutomations("UNANSWERED_HOT_LEAD", { businessUnitId: conversation.businessUnitId, entityType: "conversation", entityId: conversation.id, conversationId: conversation.id, leadId: conversation.lead?.id, temperature: "HOT", campaignExternalId: conversation.sourceCampaignExternalId });
  return conversations.length;
}
