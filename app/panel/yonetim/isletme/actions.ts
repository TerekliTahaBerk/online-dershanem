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
import { reconcileBusinessUnit } from "@/lib/business/reconciliation";
import { getAdPlatformProvider } from "@/lib/business/providers";
import { validateStageTransition } from "@/lib/business/leads";

const basePath = "/panel/yonetim/isletme";
const leadStageEnum = z.enum([
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "MEETING_PLANNED",
  "TRIAL_PLANNED",
  "OFFER_SENT",
  "PAYMENT_PENDING",
  "WON",
  "LOST",
  "SPAM",
]);
const lostReasonEnum = z.enum([
  "PRICE",
  "UNREACHABLE",
  "COMPETITOR",
  "DECISION_POSTPONED",
  "PRODUCT_MISMATCH",
  "WRONG_LEAD",
  "OTHER",
]);

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

type StageMutationResult =
  | {
      ok: true;
      lead: {
        id: string;
        stage: z.infer<typeof leadStageEnum>;
        lostReasonCode: z.infer<typeof lostReasonEnum> | null;
        lostReason: string | null;
        wonAt: string | null;
        lostAt: string | null;
      };
    }
  | { ok: false; error: string };

async function applyLeadStageChange(input: {
  leadId: string;
  stage: z.infer<typeof leadStageEnum>;
  lostReasonCode?: z.infer<typeof lostReasonEnum>;
  lostReasonDetail?: string;
  actorUserId: string;
  unitIds: string[];
}): Promise<StageMutationResult> {
  const lead = await prisma.businessLead.findFirst({
    where: { id: input.leadId, businessUnitId: { in: input.unitIds }, anonymizedAt: null },
  });
  if (!lead) return { ok: false, error: "LEAD_NOT_FOUND" };

  const validated = validateStageTransition({
    from: lead.stage,
    to: input.stage,
    lostReasonCode: input.lostReasonCode,
    lostReasonDetail: input.lostReasonDetail,
  });
  if (!validated.ok) return { ok: false, error: validated.error };

  const data = validated.data;

  // WON: e-posta/telefon ile mevcut STUDENT yüksek güvendeyse bağla (duplicate yok).
  let relatedUserPatch: { relatedOdUserId?: string; relatedOdkUserId?: string } = {};
  if (data.stage === "WON" && !lead.relatedOdUserId && !lead.relatedOdkUserId) {
    const { evaluateLeadUserMatch } = await import("@/lib/lifecycle/identity");
    const candidates = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        status: "ACTIVE",
        OR: [
          ...(lead.normalizedEmail ? [{ email: lead.normalizedEmail }] : []),
          ...(lead.email ? [{ email: lead.email.toLowerCase() }] : []),
          ...(lead.normalizedPhone ? [{ phone: lead.normalizedPhone }] : []),
          ...(lead.phone ? [{ phone: lead.phone }] : []),
        ],
      },
      select: { id: true, role: true, status: true, email: true, phone: true, fullName: true },
      take: 8,
    });
    const match = evaluateLeadUserMatch(
      { email: lead.email, phone: lead.phone },
      candidates.map((c) => ({
        userId: c.id,
        role: c.role,
        status: c.status,
        email: c.email,
        phone: c.phone,
        fullName: c.fullName,
      })),
    );
    if (match.decision === "LINK" && match.candidate) {
      if (lead.productInterest === "ONLINE_DENEME_KULUBU") relatedUserPatch = { relatedOdkUserId: match.candidate.userId };
      else relatedUserPatch = { relatedOdUserId: match.candidate.userId };
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.businessLead.update({
      where: { id: lead.id },
      data: {
        stage: data.stage,
        lostReasonCode: data.stage === "LOST" ? data.lostReasonCode : null,
        lostReason: data.stage === "LOST" ? data.lostReason : data.clearLost ? null : lead.lostReason,
        wonAt: data.stage === "WON" ? data.wonAt : data.stage === "LOST" || data.clearLost ? null : lead.wonAt,
        lostAt: data.stage === "LOST" ? data.lostAt : data.stage === "WON" || data.clearLost ? null : lead.lostAt,
        ...(data.stage === "WON" || data.stage === "CONTACTED" ? { lastContactAt: new Date() } : {}),
        ...relatedUserPatch,
      },
    });
    await tx.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "STAGE_CHANGED",
        fromValue: lead.stage,
        toValue: data.stage,
        actorUserId: input.actorUserId,
        metadata:
          data.stage === "LOST"
            ? { lostReasonCode: data.lostReasonCode, lostReason: data.lostReason }
            : relatedUserPatch.relatedOdUserId || relatedUserPatch.relatedOdkUserId
              ? { linkedUserId: relatedUserPatch.relatedOdUserId || relatedUserPatch.relatedOdkUserId }
              : undefined,
      },
    });
    return row;
  });

  void logAudit({
    actorUserId: input.actorUserId,
    entityType: "BusinessLead",
    entityId: lead.id,
    action: data.stage === "WON" ? "lead.lifecycle.won" : "LEAD_STAGE_CHANGED",
    payload: {
      from: lead.stage,
      to: data.stage,
      lostReasonCode: data.lostReasonCode,
      ...relatedUserPatch,
    },
  });

  const { emitAutomationEvent } = await import("@/lib/automation/engine");
  void emitAutomationEvent("lead_stage_changed", {
    businessUnitId: lead.businessUnitId,
    entityType: "lead",
    entityId: lead.id,
    leadId: lead.id,
    source: lead.source,
    product: lead.productInterest === "ONLINE_DENEME_KULUBU" ? "ODK" : lead.productInterest === "ONLINE_DERSHANEM" ? "OD" : null,
    stage: data.stage,
    ownerId: lead.assignedUserId,
    temperature: lead.temperature,
    eventId: `lead_stage_changed:lead:${lead.id}:${lead.stage}->${data.stage}`,
  });

  return {
    ok: true,
    lead: {
      id: updated.id,
      stage: updated.stage,
      lostReasonCode: updated.lostReasonCode,
      lostReason: updated.lostReason,
      wonAt: updated.wonAt?.toISOString() ?? null,
      lostAt: updated.lostAt?.toISOString() ?? null,
    },
  };
}

/** Form POST (PRG). Lost için lostReasonCode zorunlu. */
export async function updateLeadStage(formData: FormData) {
  const access = await requireBusinessPage("lead:write");
  await guard("lead.stage", access.session.userId);
  const parsed = z
    .object({
      id: z.string().cuid(),
      stage: leadStageEnum,
      lostReasonCode: lostReasonEnum.optional(),
      lostReasonDetail: z.string().trim().max(500).optional(),
      redirectTo: z.string().optional(),
    })
    .parse(Object.fromEntries(formData));

  const result = await applyLeadStageChange({
    leadId: parsed.id,
    stage: parsed.stage,
    lostReasonCode: parsed.lostReasonCode,
    lostReasonDetail: parsed.lostReasonDetail,
    actorUserId: access.session.userId,
    unitIds: scopedUnitIds(access),
  });
  if (!result.ok) throw new Error(result.error);
  revalidateBusiness();
  if (parsed.redirectTo === "adaylar") {
    redirect(`${basePath}/adaylar?lead=${parsed.id}&focus=all`);
  }
  redirectToSection("satis-hunisi");
}

/**
 * Client Kanban / optimistic UI. Yanıt authoritative — istemci bu payload ile
 * yerel state'i hizalar; hata durumunda önceki stage'e döner.
 */
export async function transitionLeadStageAction(input: {
  id: string;
  stage: z.infer<typeof leadStageEnum>;
  lostReasonCode?: z.infer<typeof lostReasonEnum>;
  lostReasonDetail?: string;
}): Promise<StageMutationResult> {
  const access = await requireBusinessPage("lead:write");
  await guard("lead.stage", access.session.userId);
  const parsed = z
    .object({
      id: z.string().cuid(),
      stage: leadStageEnum,
      lostReasonCode: lostReasonEnum.optional(),
      lostReasonDetail: z.string().trim().max(500).optional(),
    })
    .parse(input);
  const result = await applyLeadStageChange({
    leadId: parsed.id,
    stage: parsed.stage,
    lostReasonCode: parsed.lostReasonCode,
    lostReasonDetail: parsed.lostReasonDetail,
    actorUserId: access.session.userId,
    unitIds: scopedUnitIds(access),
  });
  if (result.ok) revalidateBusiness();
  return result;
}

/** Lead → sipariş / öğrenci hesabı manuel bağlama (WON handoff). */
export async function linkLeadLifecycle(formData: FormData) {
  const access = await requireBusinessPage("lead:write");
  await guard("lead.link", access.session.userId);
  const parsed = z
    .object({
      leadId: z.string().cuid(),
      userId: z.string().optional(),
      odOrderId: z.string().optional(),
      odkOrderId: z.string().optional(),
      force: z.string().optional(),
    })
    .parse(Object.fromEntries(formData));
  const lead = await prisma.businessLead.findFirst({
    where: { id: parsed.leadId, businessUnitId: { in: scopedUnitIds(access) }, anonymizedAt: null },
    select: { id: true },
  });
  if (!lead) throw new Error("LEAD_NOT_FOUND");
  const cuid = z.string().cuid();
  const userId = parsed.userId && cuid.safeParse(parsed.userId).success ? parsed.userId : null;
  const odOrderId = parsed.odOrderId && cuid.safeParse(parsed.odOrderId).success ? parsed.odOrderId : null;
  const odkOrderId = parsed.odkOrderId && cuid.safeParse(parsed.odkOrderId).success ? parsed.odkOrderId : null;
  const { linkLeadLifecycleEntities } = await import("@/lib/lifecycle/link");
  await linkLeadLifecycleEntities({
    leadId: lead.id,
    actorUserId: access.session.userId,
    userId,
    odOrderId,
    odkOrderId,
    force: parsed.force === "1",
  });
  revalidateBusiness();
  redirect(`${basePath}/adaylar?lead=${lead.id}`);
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
  await prisma.leadActivity.create({ data: { leadId: row.id, type: "LEAD_CREATED", toValue: "NEW", actorUserId: access.session.userId } });
  void logAudit({ actorUserId: access.session.userId, entityType: "BusinessLead", entityId: row.id, action: "LEAD_CREATED" });
  const { emitAutomationEvent } = await import("@/lib/automation/engine");
  void emitAutomationEvent("lead_created", {
    businessUnitId: row.businessUnitId,
    entityType: "lead",
    entityId: row.id,
    leadId: row.id,
    source: row.source,
    product: row.productInterest === "ONLINE_DENEME_KULUBU" ? "ODK" : row.productInterest === "ONLINE_DERSHANEM" ? "OD" : null,
    stage: row.stage,
    ownerId: row.assignedUserId,
    temperature: row.temperature,
  });
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
  void logAudit({
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
  void logAudit({
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

  void logAudit({
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
  await prisma.$transaction([
    prisma.leadActivity.create({ data: { leadId: lead.id, type: "NOTE", actorUserId: access.session.userId, metadata: { note: parsed.note } } }),
    prisma.businessLead.update({ where: { id: lead.id }, data: { lastContactAt: new Date() } }),
  ]);
  void logAudit({ actorUserId: access.session.userId, entityType: "BusinessLead", entityId: lead.id, action: "LEAD_NOTE_ADDED" }); revalidateBusiness();
}

export async function createLeadTask(formData: FormData) {
  const access = await requireBusinessPage("lead:write"); await guard("lead.task", access.session.userId);
  const parsed = z.object({
    leadId: z.string().cuid(),
    title: z.string().trim().min(2).max(160),
    note: z.string().trim().max(2000).optional(),
    dueAt: z.string().optional(),
    assignedUserId: z.string().cuid().or(z.literal("")).optional(),
    setFollowUp: z.enum(["1", "true"]).optional(),
  }).parse(Object.fromEntries(formData));
  const lead = await prisma.businessLead.findFirst({ where: { id: parsed.leadId, businessUnitId: { in: scopedUnitIds(access) } } }); if (!lead) throw new Error("LEAD_NOT_FOUND");
  const dueAt = parsed.dueAt ? new Date(parsed.dueAt) : null;
  const assignedUserId = parsed.assignedUserId || access.session.userId;
  await prisma.$transaction([
    prisma.leadTask.create({
      data: {
        leadId: lead.id,
        title: parsed.title,
        note: parsed.note || null,
        dueAt,
        assignedUserId,
      },
    }),
    prisma.businessLead.update({
      where: { id: lead.id },
      data: {
        ...(dueAt && (parsed.setFollowUp || !lead.nextFollowUpAt || (lead.nextFollowUpAt && dueAt < lead.nextFollowUpAt))
          ? { nextFollowUpAt: dueAt }
          : {}),
        ...(assignedUserId && !lead.assignedUserId ? { assignedUserId } : {}),
      },
    }),
  ]);
  void logAudit({ actorUserId: access.session.userId, entityType: "BusinessLead", entityId: lead.id, action: "LEAD_TASK_CREATED", payload: { dueAt: dueAt?.toISOString() ?? null } });
  revalidateBusiness();
}

export async function scheduleLeadFollowUp(formData: FormData) {
  const access = await requireBusinessPage("lead:write");
  await guard("lead.follow-up", access.session.userId);
  const parsed = z
    .object({
      leadId: z.string().cuid(),
      nextFollowUpAt: z.string().min(1),
      note: z.string().trim().max(2000).optional(),
      taskTitle: z.string().trim().max(160).optional(),
      assignedUserId: z.string().cuid().or(z.literal("")).optional(),
    })
    .parse(Object.fromEntries(formData));
  const lead = await prisma.businessLead.findFirst({
    where: { id: parsed.leadId, businessUnitId: { in: scopedUnitIds(access) }, anonymizedAt: null },
  });
  if (!lead) throw new Error("LEAD_NOT_FOUND");
  const nextFollowUpAt = new Date(parsed.nextFollowUpAt);
  if (Number.isNaN(nextFollowUpAt.getTime())) throw new Error("INVALID_FOLLOW_UP");
  const assignedUserId = parsed.assignedUserId || lead.assignedUserId || access.session.userId;
  await prisma.$transaction(async (tx) => {
    await tx.businessLead.update({
      where: { id: lead.id },
      data: { nextFollowUpAt, assignedUserId },
    });
    if (parsed.note?.trim()) {
      await tx.leadActivity.create({
        data: {
          leadId: lead.id,
          type: "NOTE",
          actorUserId: access.session.userId,
          metadata: { note: parsed.note.trim(), kind: "FOLLOW_UP" },
        },
      });
    }
    await tx.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "FOLLOW_UP_SCHEDULED",
        toValue: nextFollowUpAt.toISOString(),
        actorUserId: access.session.userId,
      },
    });
    if (parsed.taskTitle?.trim()) {
      await tx.leadTask.create({
        data: {
          leadId: lead.id,
          title: parsed.taskTitle.trim(),
          note: parsed.note?.trim() || null,
          dueAt: nextFollowUpAt,
          assignedUserId,
        },
      });
    }
  });
  void logAudit({
    actorUserId: access.session.userId,
    entityType: "BusinessLead",
    entityId: lead.id,
    action: "LEAD_FOLLOW_UP_SCHEDULED",
    payload: { nextFollowUpAt: nextFollowUpAt.toISOString(), assignedUserId },
  });
  revalidateBusiness();
}

export async function assignLeadOwner(formData: FormData) {
  const access = await requireBusinessPage("lead:write");
  await guard("lead.assign", access.session.userId);
  const parsed = z
    .object({
      leadId: z.string().cuid(),
      assignedUserId: z.string().cuid().or(z.literal("")),
    })
    .parse(Object.fromEntries(formData));
  const lead = await prisma.businessLead.findFirst({
    where: { id: parsed.leadId, businessUnitId: { in: scopedUnitIds(access) } },
  });
  if (!lead) throw new Error("LEAD_NOT_FOUND");
  await prisma.$transaction([
    prisma.businessLead.update({
      where: { id: lead.id },
      data: { assignedUserId: parsed.assignedUserId || null },
    }),
    prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "OWNER_CHANGED",
        fromValue: lead.assignedUserId,
        toValue: parsed.assignedUserId || null,
        actorUserId: access.session.userId,
      },
    }),
  ]);
  void logAudit({
    actorUserId: access.session.userId,
    entityType: "BusinessLead",
    entityId: lead.id,
    action: "LEAD_OWNER_ASSIGNED",
    payload: { assignedUserId: parsed.assignedUserId || null },
  });
  revalidateBusiness();
}

export async function completeLeadTask(formData: FormData) {
  const access = await requireBusinessPage("lead:write");
  await guard("lead.task.complete", access.session.userId);
  const parsed = z.object({ taskId: z.string().cuid() }).parse(Object.fromEntries(formData));
  const task = await prisma.leadTask.findFirst({
    where: { id: parsed.taskId, lead: { businessUnitId: { in: scopedUnitIds(access) } } },
  });
  if (!task) throw new Error("TASK_NOT_FOUND");
  await prisma.leadTask.update({ where: { id: task.id }, data: { completedAt: new Date() } });
  void logAudit({
    actorUserId: access.session.userId,
    entityType: "LeadTask",
    entityId: task.id,
    action: "LEAD_TASK_COMPLETED",
    payload: { leadId: task.leadId },
  });
  revalidateBusiness();
}

export async function linkLeadOrder(formData: FormData) {
  const access = await requireBusinessPage("lead:write");
  await guard("lead.link-order", access.session.userId);
  const parsed = z
    .object({
      leadId: z.string().cuid(),
      product: z.enum(["OD", "ODK"]),
      orderId: z.string().cuid(),
    })
    .parse(Object.fromEntries(formData));
  const lead = await prisma.businessLead.findFirst({
    where: { id: parsed.leadId, businessUnitId: { in: scopedUnitIds(access) } },
  });
  if (!lead) throw new Error("LEAD_NOT_FOUND");
  if (parsed.product === "OD") {
    const order = await prisma.odOrder.findFirst({
      where: { id: parsed.orderId },
      select: { id: true, userId: true, provisioningStatus: true },
    });
    if (!order) throw new Error("ORDER_NOT_FOUND");
    await prisma.businessLead.update({
      where: { id: lead.id },
      data: {
        relatedOdOrderId: order.id,
        relatedOdUserId: order.userId ?? lead.relatedOdUserId,
        stage: lead.stage === "LOST" || lead.stage === "SPAM" ? lead.stage : "WON",
        wonAt: lead.wonAt ?? new Date(),
        productInterest:
          lead.productInterest === "UNKNOWN" ? "ONLINE_DERSHANEM" : lead.productInterest,
      },
    });
  } else {
    const order = await prisma.odkOrder.findFirst({
      where: { id: parsed.orderId },
      select: { id: true, studentUserId: true, provisioningStatus: true },
    });
    if (!order) throw new Error("ORDER_NOT_FOUND");
    await prisma.businessLead.update({
      where: { id: lead.id },
      data: {
        relatedOdkOrderId: order.id,
        relatedOdkUserId: order.studentUserId ?? lead.relatedOdkUserId,
        stage: lead.stage === "LOST" || lead.stage === "SPAM" ? lead.stage : "WON",
        wonAt: lead.wonAt ?? new Date(),
        productInterest:
          lead.productInterest === "UNKNOWN" ? "ONLINE_DENEME_KULUBU" : lead.productInterest,
      },
    });
  }
  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      type: "ORDER_LINKED",
      toValue: parsed.orderId,
      actorUserId: access.session.userId,
      metadata: { product: parsed.product },
    },
  });
  void logAudit({
    actorUserId: access.session.userId,
    entityType: "BusinessLead",
    entityId: lead.id,
    action: "LEAD_ORDER_LINKED",
    payload: { product: parsed.product, orderId: parsed.orderId },
  });
  revalidateBusiness();
}

export async function updateLeadPriority(formData: FormData) {
  const access = await requireBusinessPage("lead:write");
  await guard("lead.priority", access.session.userId);
  const parsed = z
    .object({
      leadId: z.string().cuid(),
      priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
    })
    .parse(Object.fromEntries(formData));
  await prisma.businessLead.updateMany({
    where: { id: parsed.leadId, businessUnitId: { in: scopedUnitIds(access) } },
    data: { priority: parsed.priority },
  });
  revalidateBusiness();
}

export async function dismissLeadDuplicate(formData: FormData) {
  const access = await requireBusinessPage("lead:write");
  await guard("lead.duplicate.dismiss", access.session.userId);
  const leadId = z.string().cuid().parse(formData.get("leadId"));
  await prisma.businessLead.updateMany({
    where: { id: leadId, businessUnitId: { in: scopedUnitIds(access) } },
    data: { matchSuggestion: Prisma.JsonNull },
  });
  void logAudit({
    actorUserId: access.session.userId,
    entityType: "BusinessLead",
    entityId: leadId,
    action: "LEAD_DUPLICATE_DISMISSED",
  });
  revalidateBusiness();
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
