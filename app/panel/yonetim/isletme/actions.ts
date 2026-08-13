"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireBusinessPage, requireRecentBusinessPage, resolveMutationUnit, scopedUnitIds } from "@/lib/business/permissions";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { assertAccountingPeriodOpen, reverseLedgerTransaction } from "@/lib/business/finance";
import { normalizeEmail, normalizePhone } from "@/lib/business/normalization";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { enforceMutation } from "@/lib/security/mutation-guard";
import { generateAIReply } from "@/lib/business/jobs";
import { automationActionSchema, automationConditionSchema } from "@/lib/business/automation";
import { reconcileBusinessUnit } from "@/lib/business/reconciliation";
import { getAdPlatformProvider } from "@/lib/business/providers";

const basePath = "/panel/yonetim/isletme";

/**
 * İşletme bölümlerini tazeler.
 *
 * Bütün bölümler TEK bir dinamik route tarafından render edilir
 * (`[section]/page.tsx`), bu yüzden alt ağacın tamamı geçersiz kılınır;
 * tek bir bölüme somut yol vermek kardeş bölümleri bayat bırakıyordu.
 */
function revalidateBusiness() {
  revalidatePath(basePath, "layout");
}

/**
 * Mutation sonrası bölüme TAZE bir GET ile döner (POST-Redirect-GET).
 *
 * Doğrulanmış davranış: server action dönüşünde yapılan render yeni kaydı
 * göstermiyordu — kayıt veritabanına yazılıyor, liste boş görünüyordu.
 * `revalidatePath` (hem "page" hem "layout" tipiyle) bunu çözmedi; taze bir
 * GET ise her zaman doğru sonucu veriyor. Ek fayda: sayfa yenilendiğinde
 * formun yeniden gönderilmesini de engeller.
 *
 * `redirect()` özel bir hata fırlatır — try/catch içine ALMAYIN.
 */
function redirectToSection(section: string): never {
  redirect(`${basePath}/${section}`);
}
const guard = (action: string, userId: string) => enforceMutation({ action: `business.${action}`, userId, requireSameOrigin: true, rateLimit: { max: 60, windowMs: 60_000 } });
export async function updateLeadStage(formData: FormData) {
  const access = await requireBusinessPage("lead:write");
  await guard("lead.stage", access.session.userId);
  const parsed = z.object({ id: z.string().cuid(), stage: z.enum(["NEW", "CONTACTED", "QUALIFIED", "MEETING_PLANNED", "TRIAL_PLANNED", "OFFER_SENT", "PAYMENT_PENDING", "WON", "LOST", "SPAM"]) }).parse(Object.fromEntries(formData));
  const lead = await prisma.businessLead.findFirst({ where: { id: parsed.id, businessUnitId: { in: scopedUnitIds(access) } } });
  if (!lead) throw new Error("LEAD_NOT_FOUND");
  await prisma.$transaction([prisma.businessLead.update({ where: { id: lead.id }, data: { stage: parsed.stage } }), prisma.leadActivity.create({ data: { leadId: lead.id, type: "STAGE_CHANGED", fromValue: lead.stage, toValue: parsed.stage, actorUserId: access.session.userId } })]);
  void logAudit({ actorUserId: access.session.userId, entityType: "BusinessLead", entityId: lead.id, action: "LEAD_STAGE_CHANGED", payload: { from: lead.stage, to: parsed.stage } });
  revalidateBusiness();
  redirectToSection("satis-hunisi");
}

export async function createManualLead(formData: FormData) {
  const access = await requireBusinessPage("lead:write");
  await guard("lead.create", access.session.userId);
  const parsed = z.object({ firstName: z.string().trim().min(1).max(100), phone: z.string().max(30).optional(), email: z.string().email().optional(), productInterest: z.enum(["ONLINE_DERSHANEM", "ONLINE_DENEME_KULUBU", "UNKNOWN"]) }).parse(Object.fromEntries(formData));
  const unit = resolveMutationUnit(access, formData.get("businessUnitId"));
  const normalizedPhone = normalizePhone(parsed.phone); const normalizedEmail = normalizeEmail(parsed.email);
  // Boş normalize alanlar `undefined` olarak Prisma'ya gitseydi `OR: [{}, {}]`
  // üretir ve birimdeki RASTGELE bir adayı "aynı kişi" diye önerirdi.
  const duplicateFilters = [
    ...(normalizedPhone ? [{ normalizedPhone }] : []),
    ...(normalizedEmail ? [{ normalizedEmail }] : []),
  ];
  const possible = duplicateFilters.length
    ? await prisma.businessLead.findFirst({ where: { businessUnitId: unit.id, OR: duplicateFilters }, select: { id: true, firstName: true } })
    : null;
  const row = await prisma.businessLead.create({ data: { businessUnitId: unit.id, source: "MANUAL", firstName: parsed.firstName, phone: parsed.phone || null, normalizedPhone, email: parsed.email || null, normalizedEmail, productInterest: parsed.productInterest, matchSuggestion: possible ? { leadId: possible.id, name: possible.firstName, confidence: 0.78 } : undefined } });
  void logAudit({ actorUserId: access.session.userId, entityType: "BusinessLead", entityId: row.id, action: "LEAD_CREATED" });
  revalidateBusiness();
  redirectToSection("adaylar");
}

export async function createFinancialTransaction(formData: FormData) {
  const access = await requireRecentBusinessPage("finance:write");
  await guard("finance.create", access.session.userId);
  const parsed = z.object({ kind: z.enum(["MANUAL_INCOME", "EXPENSE", "ADJUSTMENT"]), description: z.string().trim().min(2).max(300), category: z.string().trim().min(2).max(80), amountTl: z.coerce.number().positive().max(100_000_000), vatRate: z.coerce.number().min(0).max(100).default(0), withholdingRate: z.coerce.number().min(0).max(100).default(0), commissionTl: z.coerce.number().min(0).max(100_000_000).default(0), transactionDate: z.string().optional() }).parse(Object.fromEntries(formData));
  const unit = resolveMutationUnit(access, formData.get("businessUnitId")); const at = new Date();
  const transactionAt = parsed.transactionDate ? new Date(`${parsed.transactionDate}T00:00:00+03:00`) : at; await assertAccountingPeriodOpen(unit.id, transactionAt);
  const netCents = Math.round(parsed.amountTl * 100); const vatCents = Math.round(netCents * parsed.vatRate / (100 + parsed.vatRate)); const withholdingCents = Math.round((netCents-vatCents)*parsed.withholdingRate/100);
  const row = await prisma.financialTransaction.create({ data: { businessUnitId: unit.id, source: "MANUAL", idempotencyKey: `manual:${crypto.randomUUID()}`, kind: parsed.kind, status: "PAID", transactionAt, paidAt: transactionAt, description: parsed.description, category: parsed.category, grossCents: netCents, netCents, vatRate: parsed.vatRate, vatCents, withholdingRate: parsed.withholdingRate, withholdingCents, commissionCents: Math.round(parsed.commissionTl*100), createdById: access.session.userId } });
  void logAudit({ actorUserId: access.session.userId, entityType: "FinancialTransaction", entityId: row.id, action: "FINANCIAL_TRANSACTION_CREATED", payload: { kind: row.kind, netCents: row.netCents } });
  revalidateBusiness();
  redirectToSection(row.kind === "EXPENSE" ? "giderler" : "gelirler");
}

export async function reverseFinancialTransaction(formData: FormData) {
  const access = await requireRecentBusinessPage("finance:reverse");
  await guard("finance.reverse", access.session.userId);
  const id = z.string().cuid().parse(formData.get("id"));
  const original = await prisma.financialTransaction.findFirst({ where: { id, businessUnitId: { in: scopedUnitIds(access) }, cancelledAt: null } });
  if (!original) throw new Error("TRANSACTION_NOT_FOUND");
  await reverseLedgerTransaction(original.id, access.session.userId);
  void logAudit({ actorUserId: access.session.userId, entityType: "FinancialTransaction", entityId: original.id, action: "FINANCIAL_TRANSACTION_REVERSED" });
  revalidateBusiness();
  redirectToSection(original.kind === "EXPENSE" ? "giderler" : "gelirler");
}

export async function setConversationControl(formData: FormData) {
  const access = await requireBusinessPage("conversation:reply");
  await guard("conversation.control", access.session.userId);
  const parsed = z.object({ id: z.string().cuid(), aiMode: z.enum(["OFF", "SUGGESTION", "AUTO_SAFE", "AUTO"]), status: z.enum(["OPEN", "WAITING_HUMAN", "CLOSED", "SPAM"]) }).parse(Object.fromEntries(formData));
  await prisma.businessConversation.updateMany({ where: { id: parsed.id, businessUnitId: { in: scopedUnitIds(access) } }, data: { aiMode: parsed.aiMode, status: parsed.status, assignedUserId: access.session.userId } });
  void logAudit({ actorUserId: access.session.userId, entityType: "BusinessConversation", entityId: parsed.id, action: "CONVERSATION_CONTROL_CHANGED", payload: { aiMode: parsed.aiMode, status: parsed.status } });
  revalidateBusiness();
}

export async function createKnowledgeEntry(formData: FormData) {
  const access = await requireBusinessPage("knowledge:write");
  await guard("knowledge.create", access.session.userId);
  const parsed = z.object({ title: z.string().trim().min(2).max(160), category: z.string().trim().min(2).max(80), content: z.string().trim().min(10).max(10_000), productInterest: z.enum(["ONLINE_DERSHANEM", "ONLINE_DENEME_KULUBU", "UNKNOWN"]), validFrom: z.string().optional(), validUntil: z.string().optional() }).parse(Object.fromEntries(formData));
  const unit = resolveMutationUnit(access, formData.get("businessUnitId"));
  const row = await prisma.knowledgeBaseEntry.create({ data: { businessUnitId: unit.id, title: parsed.title, category: parsed.category, content: parsed.content, productInterest: parsed.productInterest, validFrom: parsed.validFrom ? new Date(parsed.validFrom) : null, validUntil: parsed.validUntil ? new Date(parsed.validUntil) : null, source: "Admin paneli", updatedById: access.session.userId } });
  void logAudit({ actorUserId: access.session.userId, entityType: "KnowledgeBaseEntry", entityId: row.id, action: "KNOWLEDGE_ENTRY_CREATED" });
  revalidateBusiness();
  redirectToSection("ai-bilgi-merkezi");
}

export async function versionKnowledgeEntry(formData: FormData) {
  const access = await requireBusinessPage("knowledge:write"); await guard("knowledge.version", access.session.userId);
  const parsed = z.object({ id: z.string().cuid(), content: z.string().trim().min(10).max(10_000), isActive: z.enum(["true", "false"]) }).parse(Object.fromEntries(formData));
  const current = await prisma.knowledgeBaseEntry.findFirst({ where: { id: parsed.id, businessUnitId: { in: scopedUnitIds(access) } } }); if (!current) throw new Error("KNOWLEDGE_NOT_FOUND");
  await prisma.knowledgeBaseEntry.update({ where: { id: current.id }, data: { content: parsed.content, isActive: parsed.isActive === "true", version: { increment: 1 }, updatedById: access.session.userId } });
  void logAudit({ actorUserId: access.session.userId, entityType: "KnowledgeBaseEntry", entityId: current.id, action: "KNOWLEDGE_ENTRY_VERSIONED", payload: { fromVersion: current.version, toVersion: current.version + 1 } }); revalidateBusiness();
  redirectToSection("ai-bilgi-merkezi");
}

export async function createCampaign(formData: FormData) {
  const access = await requireBusinessPage("campaign:write");
  await guard("campaign.create", access.session.userId);
  const parsed = z.object({ name: z.string().trim().min(2).max(160), platform: z.string().trim().min(2).max(40), budgetTl: z.coerce.number().min(0).max(100_000_000), productInterest: z.enum(["ONLINE_DERSHANEM", "ONLINE_DENEME_KULUBU", "UNKNOWN"]) }).parse(Object.fromEntries(formData));
  const unit = resolveMutationUnit(access, formData.get("businessUnitId"));
  const row = await prisma.businessCampaign.create({ data: { businessUnitId: unit.id, name: parsed.name, platform: parsed.platform, budgetCents: Math.round(parsed.budgetTl * 100), productInterest: parsed.productInterest } });
  void logAudit({ actorUserId: access.session.userId, entityType: "BusinessCampaign", entityId: row.id, action: "CAMPAIGN_CREATED" });
  revalidateBusiness();
  redirectToSection("kampanyalar");
}

export async function createAdvertisement(formData: FormData) {
  const access = await requireBusinessPage("campaign:write"); await guard("advertisement.create", access.session.userId);
  const parsed = z.object({ campaignId: z.string().cuid(), adSetName: z.string().trim().min(2).max(160), name: z.string().trim().min(2).max(160), spentTl: z.coerce.number().min(0).max(100_000_000), impressions: z.coerce.number().int().min(0), clicks: z.coerce.number().int().min(0), messageStarts: z.coerce.number().int().min(0), leadCount: z.coerce.number().int().min(0), saleCount: z.coerce.number().int().min(0), revenueTl: z.coerce.number().min(0).max(100_000_000) }).parse(Object.fromEntries(formData));
  const campaign = await prisma.businessCampaign.findFirst({ where: { id: parsed.campaignId, businessUnitId: { in: scopedUnitIds(access) } } }); if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");
  const adSet = await prisma.businessAdSet.create({ data: { campaignId: campaign.id, name: parsed.adSetName } });
  const ad = await prisma.businessAdvertisement.create({ data: { adSetId: adSet.id, name: parsed.name, spentCents: Math.round(parsed.spentTl * 100), impressions: parsed.impressions, clicks: parsed.clicks, messageStarts: parsed.messageStarts, leadCount: parsed.leadCount, saleCount: parsed.saleCount, revenueCents: Math.round(parsed.revenueTl * 100) } });
  void logAudit({ actorUserId: access.session.userId, entityType: "BusinessAdvertisement", entityId: ad.id, action: "ADVERTISEMENT_CREATED" }); revalidateBusiness();
  redirectToSection("reklamlar");
}

export async function createAutomationRule(formData: FormData) {
  const access = await requireBusinessPage("automation:write");
  await guard("automation.create", access.session.userId);
  const parsed = z.object({ name: z.string().trim().min(2).max(160), triggerType: z.enum(["NEW_MESSAGE", "HOT_LEAD", "PAYMENT_COMPLETED", "COMPLAINT", "UNANSWERED_HOT_LEAD"]), actionType: z.enum(["SUGGEST_AI_REPLY", "ASSIGN_SALES", "MARK_WON", "NOTIFY_ADMIN", "ADD_TAG", "STOP_AI", "MARK_SPAM", "CREATE_TASK"]), tag: z.string().trim().max(40).optional(), temperature: z.enum(["", "COLD", "WARM", "HOT"]).optional() }).parse(Object.fromEntries(formData));
  const conditions = automationConditionSchema.parse(parsed.temperature ? { temperature: parsed.temperature } : {});
  const actions = [automationActionSchema.parse(parsed.actionType === "ADD_TAG" ? { type: parsed.actionType, tag: parsed.tag || "otomasyon" } : { type: parsed.actionType })];
  const unit = resolveMutationUnit(access, formData.get("businessUnitId"));
  const row = await prisma.automationRule.create({ data: { businessUnitId: unit.id, name: parsed.name, triggerType: parsed.triggerType, conditions, actions } });
  void logAudit({ actorUserId: access.session.userId, entityType: "AutomationRule", entityId: row.id, action: "AUTOMATION_RULE_CREATED" });
  revalidateBusiness();
  redirectToSection("otomasyon-kurallari");
}

export async function requestAISuggestion(formData: FormData) {
  const access = await requireBusinessPage("conversation:reply"); await guard("conversation.ai-suggest", access.session.userId);
  const id = z.string().cuid().parse(formData.get("id"));
  const conversation = await prisma.businessConversation.findFirst({ where: { id, businessUnitId: { in: scopedUnitIds(access) } } });
  if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");
  await generateAIReply(id);
  void logAudit({ actorUserId: access.session.userId, entityType: "BusinessConversation", entityId: id, action: "AI_SUGGESTION_REQUESTED" });
  revalidateBusiness();
}

export async function assignConversation(formData: FormData) {
  const access = await requireBusinessPage("conversation:reply"); await guard("conversation.assign", access.session.userId);
  const parsed = z.object({ id: z.string().cuid(), assignedUserId: z.string().cuid().or(z.literal("")) }).parse(Object.fromEntries(formData));
  await prisma.businessConversation.updateMany({ where: { id: parsed.id, businessUnitId: { in: scopedUnitIds(access) } }, data: { assignedUserId: parsed.assignedUserId || null } });
  void logAudit({ actorUserId: access.session.userId, entityType: "BusinessConversation", entityId: parsed.id, action: "CONVERSATION_ASSIGNED", payload: { assignedUserId: parsed.assignedUserId || null } });
  revalidateBusiness();
}

export async function addConversationTag(formData: FormData) {
  const access = await requireBusinessPage("conversation:reply"); await guard("conversation.tag", access.session.userId);
  const parsed = z.object({ id: z.string().cuid(), tag: z.string().trim().min(1).max(40) }).parse(Object.fromEntries(formData));
  await prisma.businessConversation.updateMany({ where: { id: parsed.id, businessUnitId: { in: scopedUnitIds(access) } }, data: { tags: { push: parsed.tag } } });
  void logAudit({ actorUserId: access.session.userId, entityType: "BusinessConversation", entityId: parsed.id, action: "CONVERSATION_TAG_ADDED", payload: { tag: parsed.tag } }); revalidateBusiness();
}

export async function addLeadNote(formData: FormData) {
  const access = await requireBusinessPage("lead:write"); await guard("lead.note", access.session.userId);
  const parsed = z.object({ leadId: z.string().cuid(), note: z.string().trim().min(2).max(2000) }).parse(Object.fromEntries(formData));
  const lead = await prisma.businessLead.findFirst({ where: { id: parsed.leadId, businessUnitId: { in: scopedUnitIds(access) } } }); if (!lead) throw new Error("LEAD_NOT_FOUND");
  await prisma.leadActivity.create({ data: { leadId: lead.id, type: "NOTE", actorUserId: access.session.userId, metadata: { note: parsed.note } } });
  void logAudit({ actorUserId: access.session.userId, entityType: "BusinessLead", entityId: lead.id, action: "LEAD_NOTE_ADDED" }); revalidateBusiness();
}

export async function createLeadTask(formData: FormData) {
  const access = await requireBusinessPage("lead:write"); await guard("lead.task", access.session.userId);
  const parsed = z.object({ leadId: z.string().cuid(), title: z.string().trim().min(2).max(160), dueAt: z.string().optional() }).parse(Object.fromEntries(formData));
  const lead = await prisma.businessLead.findFirst({ where: { id: parsed.leadId, businessUnitId: { in: scopedUnitIds(access) } } }); if (!lead) throw new Error("LEAD_NOT_FOUND");
  await prisma.leadTask.create({ data: { leadId: lead.id, title: parsed.title, dueAt: parsed.dueAt ? new Date(parsed.dueAt) : null, assignedUserId: access.session.userId } }); revalidateBusiness();
}

export async function markConversationRead(formData: FormData) {
  const access = await requireBusinessPage("conversation:read"); await guard("conversation.read", access.session.userId); const id = z.string().cuid().parse(formData.get("id"));
  await prisma.businessConversation.updateMany({ where: { id, businessUnitId: { in: scopedUnitIds(access) } }, data: { unreadCount: 0 } }); revalidateBusiness();
}

export async function createPromptVersion(formData: FormData) {
  const access = await requireBusinessPage("knowledge:write"); await guard("prompt.create", access.session.userId);
  const parsed = z.object({ name: z.string().trim().min(2).max(80), systemPrompt: z.string().trim().min(20).max(8000) }).parse(Object.fromEntries(formData));
  const unit = resolveMutationUnit(access, formData.get("businessUnitId"));
  const latest = await prisma.aIPromptVersion.findFirst({ where: { businessUnitId: unit.id, name: parsed.name }, orderBy: { version: "desc" } });
  await prisma.$transaction(async (tx) => { await tx.aIPromptVersion.updateMany({ where: { businessUnitId: unit.id, name: parsed.name, isActive: true }, data: { isActive: false } }); await tx.aIPromptVersion.create({ data: { businessUnitId: unit.id, name: parsed.name, version: (latest?.version ?? 0) + 1, systemPrompt: parsed.systemPrompt, isActive: true } }); });
  void logAudit({ actorUserId: access.session.userId, entityType: "AIPromptVersion", entityId: parsed.name, action: "AI_PROMPT_VERSION_CREATED" }); revalidateBusiness();
  redirectToSection("ai-bilgi-merkezi");
}

export async function lockAccountingPeriod(formData: FormData) {
  const access = await requireRecentBusinessPage("finance:reverse"); await guard("period.lock", access.session.userId);
  const parsed = z.object({ startsAt: z.string().date(), endsAt: z.string().date() }).parse(Object.fromEntries(formData)); const unit = resolveMutationUnit(access, formData.get("businessUnitId"));
  const startsAt = new Date(`${parsed.startsAt}T00:00:00+03:00`); const endsAt = new Date(`${parsed.endsAt}T23:59:59.999+03:00`); if (endsAt < startsAt) throw new Error("INVALID_PERIOD");
  const overlap = await prisma.accountingPeriod.findFirst({ where: { businessUnitId: unit.id, NOT: { startsAt, endsAt }, startsAt: { lte: endsAt }, endsAt: { gte: startsAt } } }); if (overlap) throw new Error("ACCOUNTING_PERIOD_OVERLAP");
  const period = await prisma.accountingPeriod.upsert({ where: { businessUnitId_startsAt_endsAt: { businessUnitId: unit.id, startsAt, endsAt } }, update: { status: "LOCKED", lockedAt: new Date(), lockedById: access.session.userId }, create: { businessUnitId: unit.id, startsAt, endsAt, status: "LOCKED", lockedAt: new Date(), lockedById: access.session.userId } });
  void logAudit({ actorUserId: access.session.userId, entityType: "AccountingPeriod", entityId: period.id, action: "ACCOUNTING_PERIOD_LOCKED" }); revalidateBusiness();
  redirectToSection("vergiler");
}

export async function runReconciliation() {
  const access = await requireBusinessPage("finance:write"); await guard("reconciliation.run", access.session.userId);
  for (const unit of access.units) await reconcileBusinessUnit(unit.id);
  void logAudit({ actorUserId: access.session.userId, entityType: "ReconciliationRecord", entityId: "batch", action: "RECONCILIATION_RUN" }); revalidateBusiness();
  redirectToSection("mutabakat");
}

export async function resolveReconciliation(formData: FormData) {
  const access = await requireBusinessPage("finance:write"); await guard("reconciliation.resolve", access.session.userId);
  const parsed = z.object({ id: z.string().cuid(), status: z.enum(["MANUALLY_MATCHED", "CORRECTED"]) }).parse(Object.fromEntries(formData));
  await prisma.reconciliationRecord.updateMany({ where: { id: parsed.id, businessUnitId: { in: scopedUnitIds(access) } }, data: { status: parsed.status, resolvedAt: new Date(), resolvedById: access.session.userId } });
  void logAudit({ actorUserId: access.session.userId, entityType: "ReconciliationRecord", entityId: parsed.id, action: "RECONCILIATION_RESOLVED", payload: { status: parsed.status } }); revalidateBusiness();
  redirectToSection("mutabakat");
}

export async function syncMetaAds() {
  const access = await requireBusinessPage("integration:write"); await guard("meta-ads.sync", access.session.userId); const result = await getAdPlatformProvider().syncCampaigns();
  void logAudit({ actorUserId: access.session.userId, entityType: "IntegrationConnection", entityId: "META_ADS", action: "META_ADS_SYNCED", payload: result }); revalidateBusiness();
}

export async function setManualAttribution(formData: FormData) {
  const access = await requireBusinessPage("campaign:write"); await guard("attribution.manual", access.session.userId);
  const parsed = z.object({ leadId: z.string().cuid(), campaignId: z.string().cuid().or(z.literal("")), advertisementId: z.string().cuid().or(z.literal("")) }).parse(Object.fromEntries(formData));
  const lead = await prisma.businessLead.findFirst({ where: { id: parsed.leadId, businessUnitId: { in: scopedUnitIds(access) } } }); if (!lead) throw new Error("LEAD_NOT_FOUND");
  if (parsed.campaignId) { const valid = await prisma.businessCampaign.count({ where: { id: parsed.campaignId, businessUnitId: lead.businessUnitId } }); if (!valid) throw new Error("CAMPAIGN_NOT_FOUND"); }
  if (parsed.advertisementId) { const valid = await prisma.businessAdvertisement.count({ where: { id: parsed.advertisementId, adSet: { campaign: { businessUnitId: lead.businessUnitId } } } }); if (!valid) throw new Error("ADVERTISEMENT_NOT_FOUND"); }
  await prisma.attribution.create({ data: { leadId: lead.id, campaignId: parsed.campaignId || null, advertisementId: parsed.advertisementId || null, model: "MANUAL", confidence: 1, isManual: true } });
  void logAudit({ actorUserId: access.session.userId, entityType: "BusinessLead", entityId: lead.id, action: "ATTRIBUTION_MANUALLY_SET", payload: { campaignId: parsed.campaignId || null, advertisementId: parsed.advertisementId || null } }); revalidateBusiness();
}

export async function updateRetentionSettings(formData: FormData) {
  const access = await requireBusinessPage("settings:write"); await guard("retention.update", access.session.userId);
  const days = z.coerce.number().int().min(30).max(3650).parse(formData.get("retentionDays"));
  await prisma.businessUnit.updateMany({ where: { id: { in: scopedUnitIds(access) } }, data: { retentionDays: days } });
  void logAudit({ actorUserId: access.session.userId, entityType: "BusinessUnit", entityId: "all", action: "RETENTION_SETTINGS_UPDATED", payload: { retentionDays: days } }); revalidateBusiness();
  redirectToSection("ayarlar");
}

export async function mergeSuggestedLead(formData: FormData) {
  const access = await requireBusinessPage("lead:write"); await guard("lead.merge", access.session.userId);
  const parsed = z.object({ sourceId: z.string().cuid(), targetId: z.string().cuid() }).parse(Object.fromEntries(formData));
  const [source, target] = await Promise.all([prisma.businessLead.findFirst({ where: { id: parsed.sourceId, businessUnitId: { in: scopedUnitIds(access) } } }), prisma.businessLead.findFirst({ where: { id: parsed.targetId, businessUnitId: { in: scopedUnitIds(access) } } })]);
  if (!source || !target || source.businessUnitId !== target.businessUnitId || source.id === target.id) throw new Error("INVALID_LEAD_MERGE");
  await prisma.$transaction(async (tx) => {
    if (source.conversationId && !target.conversationId) await tx.businessLead.update({ where: { id: source.id }, data: { conversationId: null } });
    await tx.businessLead.update({ where: { id: target.id }, data: { conversationId: target.conversationId || source.conversationId, firstName: target.firstName || source.firstName, lastName: target.lastName || source.lastName, phone: target.phone || source.phone, normalizedPhone: target.normalizedPhone || source.normalizedPhone, email: target.email || source.email, normalizedEmail: target.normalizedEmail || source.normalizedEmail, studentName: target.studentName || source.studentName, parentName: target.parentName || source.parentName, productInterest: target.productInterest === "UNKNOWN" ? source.productInterest : target.productInterest, tags: [...new Set([...target.tags, ...source.tags])], lastContactAt: source.lastContactAt > target.lastContactAt ? source.lastContactAt : target.lastContactAt } });
    await tx.businessLead.update({ where: { id: source.id }, data: { stage: "SPAM", lostReason: `MERGED_INTO:${target.id}`, matchSuggestion: Prisma.JsonNull } });
    await tx.leadActivity.createMany({ data: [{ leadId: target.id, type: "LEAD_MERGED", fromValue: source.id, actorUserId: access.session.userId }, { leadId: source.id, type: "MERGED_INTO", toValue: target.id, actorUserId: access.session.userId }] });
  });
  void logAudit({ actorUserId: access.session.userId, entityType: "BusinessLead", entityId: source.id, action: "LEAD_MERGED", payload: { targetId: target.id } }); revalidateBusiness();
  redirectToSection("adaylar");
}

export async function assignBusinessRole(formData: FormData) {
  const access = await requireRecentBusinessPage("role:write"); await guard("role.assign", access.session.userId);
  const parsed = z.object({ userId: z.string().min(1), businessUnitId: z.string().cuid(), role: z.enum(["SUPER_ADMIN", "ADMIN", "SALES", "SUPPORT", "ACCOUNTING", "VIEWER"]) }).parse(Object.fromEntries(formData));
  // Formdan gelen birim, kullanıcının role:write yetkisi olan birimleri
  // arasından doğrulanır — form değeri tek başına asla yeterli değildir.
  resolveMutationUnit(access, parsed.businessUnitId);
  const user = await prisma.user.findFirst({ where: { id: parsed.userId, status: "ACTIVE" }, select: { id: true } }); if (!user) throw new Error("USER_NOT_FOUND");
  const assignment = await prisma.businessRoleAssignment.upsert({ where: { userId_businessUnitId_role: parsed }, update: {}, create: parsed });
  await revokeAllUserSessions(parsed.userId);
  void logAudit({ actorUserId: access.session.userId, entityType: "BusinessRoleAssignment", entityId: assignment.id, action: "BUSINESS_ROLE_ASSIGNED", payload: { userId: parsed.userId, businessUnitId: parsed.businessUnitId, role: parsed.role } }); revalidateBusiness();
  redirectToSection("ayarlar");
}

/**
 * Rol geri alma. Sistemde en az bir aktif SUPER_ADMIN kalmasını garanti eder;
 * yönetici kendi son süper yöneticiliğini kaldırarak paneli kilitleyemez.
 */
export async function revokeBusinessRole(formData: FormData) {
  const access = await requireRecentBusinessPage("role:write"); await guard("role.revoke", access.session.userId);
  const id = z.string().cuid().parse(formData.get("id"));
  const assignment = await prisma.businessRoleAssignment.findFirst({ where: { id, businessUnitId: { in: scopedUnitIds(access) } } });
  if (!assignment) throw new Error("ROLE_ASSIGNMENT_NOT_FOUND");
  if (assignment.role === "SUPER_ADMIN") {
    const remaining = await prisma.businessRoleAssignment.count({ where: { role: "SUPER_ADMIN", businessUnit: { isActive: true }, user: { status: "ACTIVE" }, NOT: { id: assignment.id } } });
    if (remaining === 0) throw new Error("LAST_SUPER_ADMIN_PROTECTED");
  }
  await prisma.businessRoleAssignment.delete({ where: { id: assignment.id } });
  await revokeAllUserSessions(assignment.userId);
  void logAudit({ actorUserId: access.session.userId, entityType: "BusinessRoleAssignment", entityId: assignment.id, action: "BUSINESS_ROLE_REVOKED", payload: { userId: assignment.userId, businessUnitId: assignment.businessUnitId, role: assignment.role } }); revalidateBusiness();
  redirectToSection("ayarlar");
}
