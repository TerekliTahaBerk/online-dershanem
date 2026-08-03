"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBusinessPage } from "@/lib/business/permissions";
import { assertAccountingPeriodOpen } from "@/lib/business/finance";
import { normalizeEmail, normalizePhone } from "@/lib/business/normalization";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const basePath = "/panel/yonetim/isletme";
export async function updateLeadStage(formData: FormData) {
  const access = await requireBusinessPage("lead:write");
  const parsed = z.object({ id: z.string().cuid(), stage: z.enum(["NEW", "CONTACTED", "QUALIFIED", "MEETING_PLANNED", "TRIAL_PLANNED", "OFFER_SENT", "PAYMENT_PENDING", "WON", "LOST", "SPAM"]) }).parse(Object.fromEntries(formData));
  const lead = await prisma.businessLead.findFirst({ where: { id: parsed.id, businessUnitId: { in: access.units.map((unit) => unit.id) } } });
  if (!lead) throw new Error("LEAD_NOT_FOUND");
  await prisma.$transaction([prisma.businessLead.update({ where: { id: lead.id }, data: { stage: parsed.stage } }), prisma.leadActivity.create({ data: { leadId: lead.id, type: "STAGE_CHANGED", fromValue: lead.stage, toValue: parsed.stage, actorUserId: access.session.userId } })]);
  void logAudit({ actorUserId: access.session.userId, entityType: "BusinessLead", entityId: lead.id, action: "LEAD_STAGE_CHANGED", payload: { from: lead.stage, to: parsed.stage } });
  revalidatePath(`${basePath}/satis-hunisi`);
}

export async function createManualLead(formData: FormData) {
  const access = await requireBusinessPage("lead:write");
  const parsed = z.object({ firstName: z.string().trim().min(1).max(100), phone: z.string().max(30).optional(), email: z.string().email().optional(), productInterest: z.enum(["ONLINE_DERSHANEM", "ONLINE_DENEME_KULUBU", "UNKNOWN"]) }).parse(Object.fromEntries(formData));
  await prisma.businessLead.create({ data: { businessUnitId: access.units[0].id, source: "MANUAL", firstName: parsed.firstName, phone: parsed.phone || null, normalizedPhone: normalizePhone(parsed.phone), email: parsed.email || null, normalizedEmail: normalizeEmail(parsed.email), productInterest: parsed.productInterest } });
  revalidatePath(`${basePath}/adaylar`);
}

export async function createFinancialTransaction(formData: FormData) {
  const access = await requireBusinessPage("finance:write");
  const parsed = z.object({ kind: z.enum(["MANUAL_INCOME", "EXPENSE", "ADJUSTMENT"]), description: z.string().trim().min(2).max(300), category: z.string().trim().min(2).max(80), amountTl: z.coerce.number().positive().max(100_000_000), vatRate: z.coerce.number().min(0).max(100).default(0) }).parse(Object.fromEntries(formData));
  const unit = access.units[0]; const at = new Date(); await assertAccountingPeriodOpen(unit.id, at);
  const netCents = Math.round(parsed.amountTl * 100); const vatCents = Math.round(netCents * parsed.vatRate / (100 + parsed.vatRate));
  const row = await prisma.financialTransaction.create({ data: { businessUnitId: unit.id, source: "MANUAL", idempotencyKey: `manual:${crypto.randomUUID()}`, kind: parsed.kind, status: "PAID", transactionAt: at, paidAt: at, description: parsed.description, category: parsed.category, grossCents: netCents, netCents, vatRate: parsed.vatRate, vatCents, createdById: access.session.userId } });
  void logAudit({ actorUserId: access.session.userId, entityType: "FinancialTransaction", entityId: row.id, action: "FINANCIAL_TRANSACTION_CREATED", payload: { kind: row.kind, netCents: row.netCents } });
  revalidatePath(`${basePath}/gelirler`); revalidatePath(`${basePath}/giderler`);
}

export async function reverseFinancialTransaction(formData: FormData) {
  const access = await requireBusinessPage("finance:reverse");
  const id = z.string().cuid().parse(formData.get("id"));
  const original = await prisma.financialTransaction.findFirst({ where: { id, businessUnitId: { in: access.units.map((unit) => unit.id) }, cancelledAt: null } });
  if (!original) throw new Error("TRANSACTION_NOT_FOUND");
  await assertAccountingPeriodOpen(original.businessUnitId, new Date());
  await prisma.$transaction([prisma.financialTransaction.create({ data: { businessUnitId: original.businessUnitId, source: original.source, idempotencyKey: `reversal:${original.id}`, kind: "REVERSAL", status: "PAID", transactionAt: new Date(), paidAt: new Date(), description: `Ters kayıt: ${original.description}`, category: original.category, grossCents: -original.grossCents, discountCents: -original.discountCents, netCents: -original.netCents, vatRate: original.vatRate, vatCents: -original.vatCents, withholdingRate: original.withholdingRate, withholdingCents: -original.withholdingCents, otherTaxCents: -original.otherTaxCents, commissionCents: -original.commissionCents, reversalOfId: original.id, createdById: access.session.userId } }), prisma.financialTransaction.update({ where: { id: original.id }, data: { cancelledAt: new Date(), status: "CANCELLED" } })]);
  void logAudit({ actorUserId: access.session.userId, entityType: "FinancialTransaction", entityId: original.id, action: "FINANCIAL_TRANSACTION_REVERSED" });
  revalidatePath(basePath);
}

export async function setConversationControl(formData: FormData) {
  const access = await requireBusinessPage("conversation:reply");
  const parsed = z.object({ id: z.string().cuid(), aiMode: z.enum(["OFF", "SUGGESTION", "AUTO_SAFE", "AUTO"]), status: z.enum(["OPEN", "WAITING_HUMAN", "CLOSED", "SPAM"]) }).parse(Object.fromEntries(formData));
  await prisma.businessConversation.updateMany({ where: { id: parsed.id, businessUnitId: { in: access.units.map((unit) => unit.id) } }, data: { aiMode: parsed.aiMode, status: parsed.status, assignedUserId: access.session.userId } });
  void logAudit({ actorUserId: access.session.userId, entityType: "BusinessConversation", entityId: parsed.id, action: "CONVERSATION_CONTROL_CHANGED", payload: { aiMode: parsed.aiMode, status: parsed.status } });
  revalidatePath(`${basePath}/mesaj-kutusu`);
}

export async function createKnowledgeEntry(formData: FormData) {
  const access = await requireBusinessPage("knowledge:write");
  const parsed = z.object({ title: z.string().trim().min(2).max(160), category: z.string().trim().min(2).max(80), content: z.string().trim().min(10).max(10_000), productInterest: z.enum(["ONLINE_DERSHANEM", "ONLINE_DENEME_KULUBU", "UNKNOWN"]) }).parse(Object.fromEntries(formData));
  const row = await prisma.knowledgeBaseEntry.create({ data: { businessUnitId: access.units[0].id, ...parsed, source: "Admin paneli", updatedById: access.session.userId } });
  void logAudit({ actorUserId: access.session.userId, entityType: "KnowledgeBaseEntry", entityId: row.id, action: "KNOWLEDGE_ENTRY_CREATED" });
  revalidatePath(`${basePath}/ai-bilgi-merkezi`);
}

export async function createCampaign(formData: FormData) {
  const access = await requireBusinessPage("campaign:write");
  const parsed = z.object({ name: z.string().trim().min(2).max(160), platform: z.string().trim().min(2).max(40), budgetTl: z.coerce.number().min(0).max(100_000_000), productInterest: z.enum(["ONLINE_DERSHANEM", "ONLINE_DENEME_KULUBU", "UNKNOWN"]) }).parse(Object.fromEntries(formData));
  const row = await prisma.businessCampaign.create({ data: { businessUnitId: access.units[0].id, name: parsed.name, platform: parsed.platform, budgetCents: Math.round(parsed.budgetTl * 100), productInterest: parsed.productInterest } });
  void logAudit({ actorUserId: access.session.userId, entityType: "BusinessCampaign", entityId: row.id, action: "CAMPAIGN_CREATED" });
  revalidatePath(`${basePath}/kampanyalar`);
}

export async function createAutomationRule(formData: FormData) {
  const access = await requireBusinessPage("automation:write");
  const parsed = z.object({ name: z.string().trim().min(2).max(160), triggerType: z.enum(["NEW_MESSAGE", "HOT_LEAD", "PAYMENT_COMPLETED", "COMPLAINT", "UNANSWERED_HOT_LEAD"]), actionType: z.enum(["SUGGEST_AI_REPLY", "ASSIGN_SALES", "MARK_WON", "NOTIFY_ADMIN", "ADD_TAG"]) }).parse(Object.fromEntries(formData));
  const row = await prisma.automationRule.create({ data: { businessUnitId: access.units[0].id, name: parsed.name, triggerType: parsed.triggerType, conditions: {}, actions: [{ type: parsed.actionType }] } });
  void logAudit({ actorUserId: access.session.userId, entityType: "AutomationRule", entityId: row.id, action: "AUTOMATION_RULE_CREATED" });
  revalidatePath(`${basePath}/otomasyon-kurallari`);
}
