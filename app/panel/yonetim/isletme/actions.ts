"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireBusinessPage, requireRecentBusinessPage, resolveMutationUnit, scopedUnitIds } from "@/lib/business/permissions";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { assertAccountingPeriodOpen, reverseLedgerTransaction } from "@/lib/business/finance";
import { prisma } from "@/lib/prisma";
import { queueAudit } from "@/lib/audit";
import { enforceMutation } from "@/lib/security/mutation-guard";
import { reconcileBusinessUnit } from "@/lib/business/reconciliation";
import { getAdPlatformProvider } from "@/lib/business/providers";
import { crmCommandSchema, crmPermission, type LEAD_STAGE_VALUES, type LOST_REASON_VALUES } from "@/lib/business/crm-commands";
import { CrmError, runCrmCommand } from "@/lib/business/crm-service";

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

type LeadStageValue = (typeof LEAD_STAGE_VALUES)[number];
type LostReasonValue = (typeof LOST_REASON_VALUES)[number];

type StageMutationResult =
  | { ok: true; lead: { id: string; stage: LeadStageValue; lostReasonCode: LostReasonValue | null; lostReason: string | null; wonAt: string | null; lostAt: string | null } }
  | { ok: false; error: string };

/** Form alanını açıkça okur (Next.js'in gizli `$ACTION_*` alanları komuta karışmaz). */
function field(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}

/**
 * CRM komutunu ortak servisle çalıştırır (P2.7b): web ve mobil aynı kurallar,
 * aynı audit makbuzu. Yetki ve hız sınırı web Server Action'larıyla aynı.
 */
async function runCrm(guardName: string, input: unknown) {
  const command = crmCommandSchema.parse(input);
  const access = await requireBusinessPage(crmPermission(command.type));
  await guard(guardName, access.session.userId);
  const outcome = await runCrmCommand(access, command);
  revalidateBusiness();
  return outcome.result;
}

/** Form POST (PRG). Lost için lostReasonCode zorunlu. */
export async function updateLeadStage(formData: FormData) {
  const id = field(formData, "id");
  await runCrm("lead.stage", { type: "lead.stage", leadId: id, stage: field(formData, "stage"), lostReasonCode: field(formData, "lostReasonCode") || undefined, lostReasonDetail: field(formData, "lostReasonDetail") || undefined });
  if (field(formData, "redirectTo") === "adaylar") {
    redirect(`${basePath}/adaylar?lead=${id}&focus=all`);
  }
  redirectToSection("satis-hunisi");
}

/**
 * Client Kanban / optimistic UI. Yanıt authoritative — istemci bu payload ile
 * yerel state'i hizalar; hata durumunda önceki stage'e döner.
 */
export async function transitionLeadStageAction(input: {
  id: string;
  stage: LeadStageValue;
  lostReasonCode?: LostReasonValue;
  lostReasonDetail?: string;
}): Promise<StageMutationResult> {
  try {
    const result = await runCrm("lead.stage", { type: "lead.stage", leadId: input.id, stage: input.stage, lostReasonCode: input.lostReasonCode, lostReasonDetail: input.lostReasonDetail });
    return { ok: true, lead: result.lead as Extract<StageMutationResult, { ok: true }>["lead"] };
  } catch (error) {
    if (error instanceof CrmError) return { ok: false, error: error.code };
    throw error;
  }
}

/** Lead → sipariş / öğrenci hesabı manuel bağlama (WON handoff). */
export async function linkLeadLifecycle(formData: FormData) {
  const leadId = field(formData, "leadId");
  await runCrm("lead.link", { type: "lead.link_lifecycle", leadId, userId: field(formData, "userId") || undefined, odOrderId: field(formData, "odOrderId") || undefined, odkOrderId: field(formData, "odkOrderId") || undefined, force: field(formData, "force") === "1" });
  redirect(`${basePath}/adaylar?lead=${leadId}`);
}

export async function createManualLead(formData: FormData) {
  await runCrm("lead.create", { type: "lead.create", businessUnitId: field(formData, "businessUnitId") || undefined, firstName: field(formData, "firstName"), phone: field(formData, "phone"), email: field(formData, "email"), productInterest: field(formData, "productInterest") });
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
  queueAudit({ actorUserId: access.session.userId, entityType: "FinancialTransaction", entityId: row.id, action: "FINANCIAL_TRANSACTION_CREATED", payload: { kind: row.kind, netCents: row.netCents } });
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
  queueAudit({ actorUserId: access.session.userId, entityType: "FinancialTransaction", entityId: original.id, action: "FINANCIAL_TRANSACTION_REVERSED" });
  revalidateBusiness();
  redirectToSection(original.kind === "EXPENSE" ? "giderler" : "gelirler");
}

export async function setConversationControl(formData: FormData) {
  await runCrm("conversation.control", { type: "conversation.control", conversationId: field(formData, "id"), aiMode: field(formData, "aiMode"), status: field(formData, "status") });
}

export async function createKnowledgeEntry(formData: FormData) {
  const access = await requireBusinessPage("knowledge:write");
  await guard("knowledge.create", access.session.userId);
  const parsed = z.object({ title: z.string().trim().min(2).max(160), category: z.string().trim().min(2).max(80), content: z.string().trim().min(10).max(10_000), productInterest: z.enum(["ONLINE_DERSHANEM", "ONLINE_DENEME_KULUBU", "UNKNOWN"]), validFrom: z.string().optional(), validUntil: z.string().optional() }).parse(Object.fromEntries(formData));
  const unit = resolveMutationUnit(access, formData.get("businessUnitId"));
  const row = await prisma.knowledgeBaseEntry.create({ data: { businessUnitId: unit.id, title: parsed.title, category: parsed.category, content: parsed.content, productInterest: parsed.productInterest, validFrom: parsed.validFrom ? new Date(parsed.validFrom) : null, validUntil: parsed.validUntil ? new Date(parsed.validUntil) : null, source: "Admin paneli", updatedById: access.session.userId } });
  queueAudit({ actorUserId: access.session.userId, entityType: "KnowledgeBaseEntry", entityId: row.id, action: "KNOWLEDGE_ENTRY_CREATED" });
  revalidateBusiness();
  redirectToSection("ai-bilgi-merkezi");
}

export async function versionKnowledgeEntry(formData: FormData) {
  const access = await requireBusinessPage("knowledge:write"); await guard("knowledge.version", access.session.userId);
  const parsed = z.object({ id: z.string().cuid(), content: z.string().trim().min(10).max(10_000), isActive: z.enum(["true", "false"]) }).parse(Object.fromEntries(formData));
  const current = await prisma.knowledgeBaseEntry.findFirst({ where: { id: parsed.id, businessUnitId: { in: scopedUnitIds(access) } } }); if (!current) throw new Error("KNOWLEDGE_NOT_FOUND");
  await prisma.knowledgeBaseEntry.update({ where: { id: current.id }, data: { content: parsed.content, isActive: parsed.isActive === "true", version: { increment: 1 }, updatedById: access.session.userId } });
  queueAudit({ actorUserId: access.session.userId, entityType: "KnowledgeBaseEntry", entityId: current.id, action: "KNOWLEDGE_ENTRY_VERSIONED", payload: { fromVersion: current.version, toVersion: current.version + 1 } }); revalidateBusiness();
  redirectToSection("ai-bilgi-merkezi");
}

export async function createCampaign(formData: FormData) {
  const access = await requireBusinessPage("campaign:write");
  await guard("campaign.create", access.session.userId);
  const parsed = z.object({ name: z.string().trim().min(2).max(160), platform: z.string().trim().min(2).max(40), budgetTl: z.coerce.number().min(0).max(100_000_000), productInterest: z.enum(["ONLINE_DERSHANEM", "ONLINE_DENEME_KULUBU", "UNKNOWN"]) }).parse(Object.fromEntries(formData));
  const unit = resolveMutationUnit(access, formData.get("businessUnitId"));
  const row = await prisma.businessCampaign.create({ data: { businessUnitId: unit.id, name: parsed.name, platform: parsed.platform, budgetCents: Math.round(parsed.budgetTl * 100), productInterest: parsed.productInterest } });
  queueAudit({ actorUserId: access.session.userId, entityType: "BusinessCampaign", entityId: row.id, action: "CAMPAIGN_CREATED" });
  revalidateBusiness();
  redirectToSection("kampanyalar");
}

export async function createAdvertisement(formData: FormData) {
  const access = await requireBusinessPage("campaign:write"); await guard("advertisement.create", access.session.userId);
  const parsed = z.object({ campaignId: z.string().cuid(), adSetName: z.string().trim().min(2).max(160), name: z.string().trim().min(2).max(160), spentTl: z.coerce.number().min(0).max(100_000_000), impressions: z.coerce.number().int().min(0), clicks: z.coerce.number().int().min(0), messageStarts: z.coerce.number().int().min(0), leadCount: z.coerce.number().int().min(0), saleCount: z.coerce.number().int().min(0), revenueTl: z.coerce.number().min(0).max(100_000_000) }).parse(Object.fromEntries(formData));
  const campaign = await prisma.businessCampaign.findFirst({ where: { id: parsed.campaignId, businessUnitId: { in: scopedUnitIds(access) } } }); if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");
  const adSet = await prisma.businessAdSet.create({ data: { campaignId: campaign.id, name: parsed.adSetName } });
  const ad = await prisma.businessAdvertisement.create({ data: { adSetId: adSet.id, name: parsed.name, spentCents: Math.round(parsed.spentTl * 100), impressions: parsed.impressions, clicks: parsed.clicks, messageStarts: parsed.messageStarts, leadCount: parsed.leadCount, saleCount: parsed.saleCount, revenueCents: Math.round(parsed.revenueTl * 100) } });
  queueAudit({ actorUserId: access.session.userId, entityType: "BusinessAdvertisement", entityId: ad.id, action: "ADVERTISEMENT_CREATED" }); revalidateBusiness();
  redirectToSection("reklamlar");
}

export async function createAutomationRule(formData: FormData) {
  const access = await requireBusinessPage("automation:write");
  await guard("automation.create", access.session.userId);
  const {
    automationTriggerSchema,
    automationConditionSchema,
    automationActionSchema,
    automationActionsSchema,
  } = await import("@/lib/automation/schemas");
  const { APPROVED_EMAIL_TEMPLATES } = await import("@/lib/automation/definitions");

  const raw = Object.fromEntries(formData);
  const triggerType = automationTriggerSchema.parse(raw.triggerType);
  const name = z.string().trim().min(2).max(160).parse(raw.name);
  const isActive = raw.isActive === "true" || raw.isActive === "on";

  const conditions = automationConditionSchema.parse({
    ...(raw.source ? { source: String(raw.source) } : {}),
    ...(raw.product ? { product: String(raw.product) } : {}),
    ...(raw.severity ? { severity: String(raw.severity) } : {}),
    ...(raw.ownerEmpty === "true" ? { ownerEmpty: true } : {}),
    ...(raw.stage ? { stage: String(raw.stage) } : {}),
    ...(raw.temperature ? { temperature: String(raw.temperature) } : {}),
  });

  const actionType = z.string().parse(raw.actionType);
  const actionPayload =
    actionType === "add_tag" || actionType === "ADD_TAG"
      ? { type: actionType, tag: String(raw.tag || "otomasyon") }
      : actionType === "create_task" || actionType === "CREATE_TASK"
        ? { type: actionType, title: String(raw.taskTitle || "Otomasyon görevi") }
        : actionType === "send_internal_notification"
          ? {
              type: actionType,
              title: String(raw.notificationTitle || "Otomasyon bildirimi"),
              body: String(raw.notificationBody || "Bir otomasyon kuralı tetiklendi."),
            }
          : actionType === "send_approved_template_email"
            ? {
                type: actionType,
                templateKey: z.enum(APPROVED_EMAIL_TEMPLATES).parse(raw.templateKey || "automation_ops_alert"),
              }
            : actionType === "create_intervention"
              ? {
                  type: actionType,
                  reasonCode: String(raw.reasonCode || "TEACHER_OBSERVED"),
                  suggestedAction: String(raw.suggestedAction || "Otomasyon sinyali — inceleme gerekli."),
                }
              : actionType === "assign_owner"
                ? { type: actionType, ...(raw.ownerUserId ? { userId: String(raw.ownerUserId) } : {}) }
                : { type: actionType };

  const actions = automationActionsSchema.parse([automationActionSchema.parse(actionPayload)]);
  const unit = resolveMutationUnit(access, formData.get("businessUnitId"));
  const row = await prisma.automationRule.create({
    data: {
      businessUnitId: unit.id,
      name,
      triggerType,
      conditions,
      actions,
      isActive,
      createdByUserId: access.session.userId,
    },
  });
  queueAudit({
    actorUserId: access.session.userId,
    entityType: "AutomationRule",
    entityId: row.id,
    action: "AUTOMATION_RULE_CREATED",
    payload: { triggerType, isActive },
  });
  revalidateBusiness();
  redirectToSection("otomasyon-kurallari");
}

export async function toggleAutomationRule(formData: FormData) {
  const access = await requireBusinessPage("automation:write");
  await guard("automation.toggle", access.session.userId);
  const parsed = z.object({ id: z.string().cuid(), isActive: z.enum(["true", "false"]) }).parse(Object.fromEntries(formData));
  const updated = await prisma.automationRule.updateMany({
    where: { id: parsed.id, businessUnitId: { in: scopedUnitIds(access) } },
    data: { isActive: parsed.isActive === "true" },
  });
  if (!updated.count) throw new Error("RULE_NOT_FOUND");
  queueAudit({
    actorUserId: access.session.userId,
    entityType: "AutomationRule",
    entityId: parsed.id,
    action: parsed.isActive === "true" ? "AUTOMATION_RULE_ENABLED" : "AUTOMATION_RULE_DISABLED",
  });
  revalidateBusiness();
  redirectToSection("otomasyon-kurallari");
}

export async function dryRunAutomationRuleAction(formData: FormData) {
  const access = await requireBusinessPage("automation:write");
  await guard("automation.dry-run", access.session.userId);
  const { automationTriggerSchema } = await import("@/lib/automation/schemas");
  const { dryRunAutomationRule } = await import("@/lib/automation/engine");
  const parsed = z
    .object({
      id: z.string().cuid(),
      triggerType: automationTriggerSchema,
      entityType: z.string().min(2).max(40).default("lead"),
      entityId: z.string().min(2).max(80).default("dry-run-sample"),
      source: z.string().optional(),
      product: z.string().optional(),
      severity: z.string().optional(),
      stage: z.string().optional(),
      ownerEmpty: z.enum(["", "true", "false"]).optional(),
    })
    .parse(Object.fromEntries(formData));

  const outcome = await dryRunAutomationRule({
    ruleId: parsed.id,
    businessUnitIds: scopedUnitIds(access),
    trigger: parsed.triggerType,
    context: {
      entityType: parsed.entityType as "lead",
      entityId: parsed.entityId,
      source: parsed.source || null,
      product: parsed.product || null,
      severity: parsed.severity || null,
      stage: parsed.stage || null,
      ownerId: parsed.ownerEmpty === "true" ? null : parsed.ownerEmpty === "false" ? "sample-owner" : null,
    },
  });

  queueAudit({
    actorUserId: access.session.userId,
    entityType: "AutomationRule",
    entityId: parsed.id,
    action: "AUTOMATION_RULE_DRY_RUN",
    payload: { result: outcome.result, matched: outcome.matched, planned: outcome.planned },
  });
  revalidateBusiness();
  redirect(`${basePath}/otomasyon-kurallari?dryRun=${outcome.result}&matched=${outcome.matched ? "1" : "0"}&rule=${parsed.id}`);
}

export async function requestAISuggestion(formData: FormData) {
  await runCrm("conversation.ai-suggest", { type: "conversation.ai_suggest", conversationId: field(formData, "id") });
}

export async function assignConversation(formData: FormData) {
  await runCrm("conversation.assign", { type: "conversation.assign", conversationId: field(formData, "id"), assignedUserId: field(formData, "assignedUserId") ?? "" });
}

export async function addConversationTag(formData: FormData) {
  await runCrm("conversation.tag", { type: "conversation.tag", conversationId: field(formData, "id"), tag: field(formData, "tag") });
}

export async function addLeadNote(formData: FormData) {
  await runCrm("lead.note", { type: "lead.note", leadId: field(formData, "leadId"), note: field(formData, "note") });
}

export async function createLeadTask(formData: FormData) {
  const setFollowUp = field(formData, "setFollowUp");
  await runCrm("lead.task", { type: "lead.task", leadId: field(formData, "leadId"), title: field(formData, "title"), note: field(formData, "note"), dueAt: field(formData, "dueAt") || undefined, assignedUserId: field(formData, "assignedUserId"), setFollowUp: setFollowUp === "1" || setFollowUp === "true" ? true : undefined });
}

export async function scheduleLeadFollowUp(formData: FormData) {
  await runCrm("lead.follow-up", { type: "lead.follow_up", leadId: field(formData, "leadId"), nextFollowUpAt: field(formData, "nextFollowUpAt"), note: field(formData, "note"), taskTitle: field(formData, "taskTitle"), assignedUserId: field(formData, "assignedUserId") });
}

export async function assignLeadOwner(formData: FormData) {
  await runCrm("lead.assign", { type: "lead.owner", leadId: field(formData, "leadId"), assignedUserId: field(formData, "assignedUserId") ?? "" });
}

export async function completeLeadTask(formData: FormData) {
  await runCrm("lead.task.complete", { type: "lead.task_complete", taskId: field(formData, "taskId") });
}

export async function linkLeadOrder(formData: FormData) {
  await runCrm("lead.link-order", { type: "lead.link_order", leadId: field(formData, "leadId"), product: field(formData, "product"), orderId: field(formData, "orderId") });
}

export async function updateLeadPriority(formData: FormData) {
  await runCrm("lead.priority", { type: "lead.priority", leadId: field(formData, "leadId"), priority: field(formData, "priority") });
}

export async function dismissLeadDuplicate(formData: FormData) {
  await runCrm("lead.duplicate.dismiss", { type: "lead.duplicate_dismiss", leadId: field(formData, "leadId") });
}

export async function markConversationRead(formData: FormData) {
  await runCrm("conversation.read", { type: "conversation.read", conversationId: field(formData, "id") });
}

export async function createPromptVersion(formData: FormData) {
  const access = await requireBusinessPage("knowledge:write"); await guard("prompt.create", access.session.userId);
  const parsed = z.object({ name: z.string().trim().min(2).max(80), systemPrompt: z.string().trim().min(20).max(8000) }).parse(Object.fromEntries(formData));
  const unit = resolveMutationUnit(access, formData.get("businessUnitId"));
  const latest = await prisma.aIPromptVersion.findFirst({ where: { businessUnitId: unit.id, name: parsed.name }, orderBy: { version: "desc" } });
  await prisma.$transaction(async (tx) => { await tx.aIPromptVersion.updateMany({ where: { businessUnitId: unit.id, name: parsed.name, isActive: true }, data: { isActive: false } }); await tx.aIPromptVersion.create({ data: { businessUnitId: unit.id, name: parsed.name, version: (latest?.version ?? 0) + 1, systemPrompt: parsed.systemPrompt, isActive: true } }); });
  queueAudit({ actorUserId: access.session.userId, entityType: "AIPromptVersion", entityId: parsed.name, action: "AI_PROMPT_VERSION_CREATED" }); revalidateBusiness();
  redirectToSection("ai-bilgi-merkezi");
}

export async function lockAccountingPeriod(formData: FormData) {
  const access = await requireRecentBusinessPage("finance:reverse"); await guard("period.lock", access.session.userId);
  const parsed = z.object({ startsAt: z.string().date(), endsAt: z.string().date() }).parse(Object.fromEntries(formData)); const unit = resolveMutationUnit(access, formData.get("businessUnitId"));
  const startsAt = new Date(`${parsed.startsAt}T00:00:00+03:00`); const endsAt = new Date(`${parsed.endsAt}T23:59:59.999+03:00`); if (endsAt < startsAt) throw new Error("INVALID_PERIOD");
  const overlap = await prisma.accountingPeriod.findFirst({ where: { businessUnitId: unit.id, NOT: { startsAt, endsAt }, startsAt: { lte: endsAt }, endsAt: { gte: startsAt } } }); if (overlap) throw new Error("ACCOUNTING_PERIOD_OVERLAP");
  const period = await prisma.accountingPeriod.upsert({ where: { businessUnitId_startsAt_endsAt: { businessUnitId: unit.id, startsAt, endsAt } }, update: { status: "LOCKED", lockedAt: new Date(), lockedById: access.session.userId }, create: { businessUnitId: unit.id, startsAt, endsAt, status: "LOCKED", lockedAt: new Date(), lockedById: access.session.userId } });
  queueAudit({ actorUserId: access.session.userId, entityType: "AccountingPeriod", entityId: period.id, action: "ACCOUNTING_PERIOD_LOCKED" }); revalidateBusiness();
  redirectToSection("vergiler");
}

export async function runReconciliation() {
  const access = await requireBusinessPage("finance:write"); await guard("reconciliation.run", access.session.userId);
  for (const unit of access.units) await reconcileBusinessUnit(unit.id);
  queueAudit({ actorUserId: access.session.userId, entityType: "ReconciliationRecord", entityId: "batch", action: "RECONCILIATION_RUN" }); revalidateBusiness();
  redirectToSection("mutabakat");
}

export async function resolveReconciliation(formData: FormData) {
  const access = await requireBusinessPage("finance:write"); await guard("reconciliation.resolve", access.session.userId);
  const parsed = z.object({ id: z.string().cuid(), status: z.enum(["MANUALLY_MATCHED", "CORRECTED"]) }).parse(Object.fromEntries(formData));
  await prisma.reconciliationRecord.updateMany({ where: { id: parsed.id, businessUnitId: { in: scopedUnitIds(access) } }, data: { status: parsed.status, resolvedAt: new Date(), resolvedById: access.session.userId } });
  queueAudit({ actorUserId: access.session.userId, entityType: "ReconciliationRecord", entityId: parsed.id, action: "RECONCILIATION_RESOLVED", payload: { status: parsed.status } }); revalidateBusiness();
  redirectToSection("mutabakat");
}

export async function syncMetaAds() {
  const access = await requireBusinessPage("integration:write"); await guard("meta-ads.sync", access.session.userId); const result = await getAdPlatformProvider().syncCampaigns();
  queueAudit({ actorUserId: access.session.userId, entityType: "IntegrationConnection", entityId: "META_ADS", action: "META_ADS_SYNCED", payload: result }); revalidateBusiness();
}

export async function setManualAttribution(formData: FormData) {
  const access = await requireBusinessPage("campaign:write"); await guard("attribution.manual", access.session.userId);
  const parsed = z.object({ leadId: z.string().cuid(), campaignId: z.string().cuid().or(z.literal("")), advertisementId: z.string().cuid().or(z.literal("")) }).parse(Object.fromEntries(formData));
  const lead = await prisma.businessLead.findFirst({ where: { id: parsed.leadId, businessUnitId: { in: scopedUnitIds(access) } } }); if (!lead) throw new Error("LEAD_NOT_FOUND");
  if (parsed.campaignId) { const valid = await prisma.businessCampaign.count({ where: { id: parsed.campaignId, businessUnitId: lead.businessUnitId } }); if (!valid) throw new Error("CAMPAIGN_NOT_FOUND"); }
  if (parsed.advertisementId) { const valid = await prisma.businessAdvertisement.count({ where: { id: parsed.advertisementId, adSet: { campaign: { businessUnitId: lead.businessUnitId } } } }); if (!valid) throw new Error("ADVERTISEMENT_NOT_FOUND"); }
  await prisma.attribution.create({ data: { leadId: lead.id, campaignId: parsed.campaignId || null, advertisementId: parsed.advertisementId || null, model: "MANUAL", confidence: 1, isManual: true } });
  queueAudit({ actorUserId: access.session.userId, entityType: "BusinessLead", entityId: lead.id, action: "ATTRIBUTION_MANUALLY_SET", payload: { campaignId: parsed.campaignId || null, advertisementId: parsed.advertisementId || null } }); revalidateBusiness();
}

export async function updateRetentionSettings(formData: FormData) {
  const access = await requireBusinessPage("settings:write"); await guard("retention.update", access.session.userId);
  const days = z.coerce.number().int().min(30).max(3650).parse(formData.get("retentionDays"));
  await prisma.businessUnit.updateMany({ where: { id: { in: scopedUnitIds(access) } }, data: { retentionDays: days } });
  queueAudit({ actorUserId: access.session.userId, entityType: "BusinessUnit", entityId: "all", action: "RETENTION_SETTINGS_UPDATED", payload: { retentionDays: days } }); revalidateBusiness();
  redirectToSection("ayarlar");
}

export async function mergeSuggestedLead(formData: FormData) {
  await runCrm("lead.merge", { type: "lead.merge", sourceId: field(formData, "sourceId"), targetId: field(formData, "targetId") });
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
  queueAudit({ actorUserId: access.session.userId, entityType: "BusinessRoleAssignment", entityId: assignment.id, action: "BUSINESS_ROLE_ASSIGNED", payload: { userId: parsed.userId, businessUnitId: parsed.businessUnitId, role: parsed.role } }); revalidateBusiness();
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
  queueAudit({ actorUserId: access.session.userId, entityType: "BusinessRoleAssignment", entityId: assignment.id, action: "BUSINESS_ROLE_REVOKED", payload: { userId: assignment.userId, businessUnitId: assignment.businessUnitId, role: assignment.role } }); revalidateBusiness();
  redirectToSection("ayarlar");
}
