"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireBusinessPage, requireRecentBusinessPage } from "@/lib/business/permissions";
import { enforceMutation } from "@/lib/security/mutation-guard";
import { crmCommandSchema, crmPermission, type LEAD_STAGE_VALUES, type LOST_REASON_VALUES } from "@/lib/business/crm-commands";
import { CrmError, runCrmCommand } from "@/lib/business/crm-service";
import { OPS_STEP_UP, opsCommandSchema, opsPermission } from "@/lib/business/ops-commands";
import { runOpsCommand } from "@/lib/business/ops-service";

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

/**
 * Pazarlama + finans komutunu ortak servisle çalıştırır (P2.7c). Finans
 * kaydı, ters kayıt ve dönem kilidi web'de olduğu gibi taze step-up ister
 * (`requireRecentBusinessPage`); diğerleri yalnız izin.
 */
async function runOps(guardName: string, input: unknown) {
  const command = opsCommandSchema.parse(input);
  const permission = opsPermission(command.type);
  const access = OPS_STEP_UP.has(command.type) ? await requireRecentBusinessPage(permission) : await requireBusinessPage(permission);
  await guard(guardName, access.session.userId);
  const outcome = await runOpsCommand(access, command);
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
  const result = await runOps("finance.create", { type: "finance.create", businessUnitId: field(formData, "businessUnitId") || undefined, kind: field(formData, "kind"), description: field(formData, "description"), category: field(formData, "category"), amountTl: field(formData, "amountTl"), vatRate: field(formData, "vatRate") || undefined, withholdingRate: field(formData, "withholdingRate") || undefined, commissionTl: field(formData, "commissionTl") || undefined, transactionDate: field(formData, "transactionDate") || undefined });
  redirectToSection(result.section);
}

export async function reverseFinancialTransaction(formData: FormData) {
  const result = await runOps("finance.reverse", { type: "finance.reverse", transactionId: field(formData, "id") });
  redirectToSection(result.section);
}

export async function setConversationControl(formData: FormData) {
  await runCrm("conversation.control", { type: "conversation.control", conversationId: field(formData, "id"), aiMode: field(formData, "aiMode"), status: field(formData, "status") });
}

export async function createKnowledgeEntry(formData: FormData) {
  await runOps("knowledge.create", { type: "knowledge.create", businessUnitId: field(formData, "businessUnitId") || undefined, title: field(formData, "title"), category: field(formData, "category"), content: field(formData, "content"), productInterest: field(formData, "productInterest"), validFrom: field(formData, "validFrom"), validUntil: field(formData, "validUntil") });
  redirectToSection("ai-bilgi-merkezi");
}

export async function versionKnowledgeEntry(formData: FormData) {
  await runOps("knowledge.version", { type: "knowledge.version", id: field(formData, "id"), content: field(formData, "content"), isActive: z.enum(["true", "false"]).parse(field(formData, "isActive")) === "true" });
  redirectToSection("ai-bilgi-merkezi");
}

export async function createCampaign(formData: FormData) {
  await runOps("campaign.create", { type: "campaign.create", businessUnitId: field(formData, "businessUnitId") || undefined, name: field(formData, "name"), platform: field(formData, "platform"), budgetTl: field(formData, "budgetTl"), productInterest: field(formData, "productInterest") });
  redirectToSection("kampanyalar");
}

export async function createAdvertisement(formData: FormData) {
  await runOps("advertisement.create", { type: "advertisement.create", campaignId: field(formData, "campaignId"), adSetName: field(formData, "adSetName"), name: field(formData, "name"), spentTl: field(formData, "spentTl"), impressions: field(formData, "impressions"), clicks: field(formData, "clicks"), messageStarts: field(formData, "messageStarts"), leadCount: field(formData, "leadCount"), saleCount: field(formData, "saleCount"), revenueTl: field(formData, "revenueTl") });
  redirectToSection("reklamlar");
}

export async function createAutomationRule(formData: FormData) {
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
  await runOps("automation.create", { type: "automation.create", businessUnitId: field(formData, "businessUnitId") || undefined, name, triggerType, conditions, actions, isActive });
  redirectToSection("otomasyon-kurallari");
}

export async function toggleAutomationRule(formData: FormData) {
  await runOps("automation.toggle", { type: "automation.toggle", id: field(formData, "id"), isActive: z.enum(["true", "false"]).parse(field(formData, "isActive")) === "true" });
  redirectToSection("otomasyon-kurallari");
}

export async function dryRunAutomationRuleAction(formData: FormData) {
  const outcome = await runOps("automation.dry-run", { type: "automation.dry_run", id: field(formData, "id"), triggerType: field(formData, "triggerType"), entityType: field(formData, "entityType") || "lead", entityId: field(formData, "entityId") || "dry-run-sample", source: field(formData, "source"), product: field(formData, "product"), severity: field(formData, "severity"), stage: field(formData, "stage"), ownerEmpty: field(formData, "ownerEmpty") === "false" ? false : true });
  redirect(`${basePath}/otomasyon-kurallari?dryRun=${outcome.dryRunResult ?? "FAILED"}&matched=${outcome.summary?.matched ? "1" : "0"}&rule=${outcome.entityId}`);
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
  await runOps("prompt.create", { type: "prompt.create", businessUnitId: field(formData, "businessUnitId") || undefined, name: field(formData, "name"), systemPrompt: field(formData, "systemPrompt") });
  redirectToSection("ai-bilgi-merkezi");
}

export async function lockAccountingPeriod(formData: FormData) {
  await runOps("period.lock", { type: "period.lock", businessUnitId: field(formData, "businessUnitId") || undefined, startsAt: field(formData, "startsAt"), endsAt: field(formData, "endsAt") });
  redirectToSection("vergiler");
}

export async function runReconciliation() {
  await runOps("reconciliation.run", { type: "reconciliation.run" });
  redirectToSection("mutabakat");
}

export async function resolveReconciliation(formData: FormData) {
  await runOps("reconciliation.resolve", { type: "reconciliation.resolve", id: field(formData, "id"), status: field(formData, "status") });
  redirectToSection("mutabakat");
}

export async function syncMetaAds() {
  await runOps("meta-ads.sync", { type: "meta_ads.sync" });
}

export async function setManualAttribution(formData: FormData) {
  await runOps("attribution.manual", { type: "attribution.manual", leadId: field(formData, "leadId"), campaignId: field(formData, "campaignId") ?? "", advertisementId: field(formData, "advertisementId") ?? "" });
}

export async function updateRetentionSettings(formData: FormData) {
  await runOps("retention.update", { type: "retention.update", retentionDays: field(formData, "retentionDays") });
  redirectToSection("ayarlar");
}

export async function mergeSuggestedLead(formData: FormData) {
  await runCrm("lead.merge", { type: "lead.merge", sourceId: field(formData, "sourceId"), targetId: field(formData, "targetId") });
  redirectToSection("adaylar");
}

export async function assignBusinessRole(formData: FormData) {
  await runOps("role.assign", { type: "role.assign", userId: field(formData, "userId"), businessUnitId: field(formData, "businessUnitId"), role: field(formData, "role") });
  redirectToSection("ayarlar");
}

export async function revokeBusinessRole(formData: FormData) {
  await runOps("role.revoke", { type: "role.revoke", id: field(formData, "id") });
  redirectToSection("ayarlar");
}
