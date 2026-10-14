import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseIstanbulInstant } from "@/lib/istanbul-time";
import { detached } from "@/lib/after-response";
import { generateAIReply } from "@/lib/business/jobs";
import { validateStageTransition } from "@/lib/business/leads";
import { normalizeEmail, normalizePhone } from "@/lib/business/normalization";
import { resolveMutationUnit, scopedUnitIds, type BusinessAccess } from "@/lib/business/access";
import { BusinessCommandError, runWithReceipt, type CommandExecution } from "./command-receipt";
import { CRM_REVISIONED, type CrmCommand } from "./crm-commands";

/**
 * İŞLETME CRM SERVİSİ (P2.7b). `app/panel/yonetim/isletme/actions.ts`
 * içindeki konuşma / aday Server Action'larının iş kuralları buraya OLDUĞU
 * GİBİ taşındı; web eylemleri ve mobil `POST /api/panel/business/crm` aynı
 * fonksiyonu çağırır. Ek olarak:
 *
 *  - İşlem anahtarı aktöre bağlıdır (`AuditLog.idempotencyKey` makbuzu): aynı
 *    anahtar aynı komutla ilk sonucu döndürür, farklı komutta 409
 *    `IDEMPOTENCY_REUSE`.
 *  - Kaydın tamamını değiştiren komutlarda `expectedRevision` (kaydın
 *    `updatedAt` değeri) transaction içinde karşılaştırılır; eski görünüm 409.
 *  - Kayıt + etkinlik + audit tek Serializable transaction'dadır. Otomasyon
 *    olayı ve AI önerisi commit sonrası çalışır; tekrarda çalışmaz.
 *  - Yaşam döngüsü bağı mevcut `linkLeadLifecycleEntities` ile (kendi
 *    transaction'ı ve audit'i var); makbuz bağdan sonra yazılır.
 *  - İş birimi kapsamı her sorguda `access.units` ile.
 */

/** CRM hatası — ortak `BusinessCommandError` (kararlı `code` + HTTP durumu). */
export { BusinessCommandError as CrmError };
const CrmError = BusinessCommandError;

export type CrmResult = { entityId: string; lead?: { id: string; stage: string; lostReasonCode: string | null; lostReason: string | null; wonAt: string | null; lostAt: string | null } };

const NOT_FOUND = { conversation: "Konuşma bulunamadı.", lead: "Aday bulunamadı.", task: "Görev bulunamadı.", order: "Sipariş bulunamadı." } as const;
const STAGE_ERRORS: Record<string, string> = {
  LOST_REASON_REQUIRED: "Kaybedildi aşaması için kayıp nedeni seçilmelidir.",
  INVALID_STAGE: "Geçersiz aşama.",
  SAME_STAGE: "Aday zaten bu aşamada.",
};

type Tx = Prisma.TransactionClient;
type Executed = CommandExecution<CrmResult>;

export const crmRevision = (row: { updatedAt: Date }) => row.updatedAt.toISOString();

function checkRevision(command: CrmCommand, row: { updatedAt: Date }, expected: string | undefined) {
  if (expected !== undefined && CRM_REVISIONED.has(command.type) && crmRevision(row) !== expected) {
    throw new CrmError(409, "CRM_CONFLICT", "Kayıt başka bir yerde güncellendi. Görünümü yenileyin.");
  }
}

const productOf = (interest: string) => (interest === "ONLINE_DENEME_KULUBU" ? "ODK" : interest === "ONLINE_DERSHANEM" ? "OD" : null);

async function emit(event: "lead_created" | "lead_stage_changed", payload: Record<string, unknown>) {
  const { emitAutomationEvent } = await import("@/lib/automation/engine");
  detached("business.automation_emit_failed", emitAutomationEvent(event, payload as never), { event, leadId: payload.leadId });
}

async function execute(tx: Tx, access: BusinessAccess, command: CrmCommand, expected: string | undefined): Promise<Executed> {
  const actor = access.session.userId;
  const unitIds = scopedUnitIds(access);
  const conversation = async (id: string) => {
    const row = await tx.businessConversation.findFirst({ where: { id, businessUnitId: { in: unitIds } } });
    if (!row) throw new CrmError(404, "CONVERSATION_NOT_FOUND", NOT_FOUND.conversation);
    checkRevision(command, row, expected);
    return row;
  };
  const lead = async (id: string, extra: Prisma.BusinessLeadWhereInput = {}) => {
    const row = await tx.businessLead.findFirst({ where: { id, businessUnitId: { in: unitIds }, ...extra } });
    if (!row) throw new CrmError(404, "LEAD_NOT_FOUND", NOT_FOUND.lead);
    checkRevision(command, row, expected);
    return row;
  };

  switch (command.type) {
    case "conversation.control": {
      const row = await conversation(command.conversationId);
      await tx.businessConversation.update({ where: { id: row.id }, data: { aiMode: command.aiMode, status: command.status, assignedUserId: actor } });
      return { entityType: "BusinessConversation", entityId: row.id, action: "CONVERSATION_CONTROL_CHANGED", payload: { aiMode: command.aiMode, status: command.status }, result: { entityId: row.id } };
    }
    case "conversation.read": {
      const row = await conversation(command.conversationId);
      await tx.businessConversation.update({ where: { id: row.id }, data: { unreadCount: 0 } });
      return { entityType: "BusinessConversation", entityId: row.id, action: "CONVERSATION_MARKED_READ", result: { entityId: row.id } };
    }
    case "conversation.assign": {
      const row = await conversation(command.conversationId);
      await tx.businessConversation.update({ where: { id: row.id }, data: { assignedUserId: command.assignedUserId || null } });
      return { entityType: "BusinessConversation", entityId: row.id, action: "CONVERSATION_ASSIGNED", payload: { assignedUserId: command.assignedUserId || null }, result: { entityId: row.id } };
    }
    case "conversation.tag": {
      const row = await conversation(command.conversationId);
      await tx.businessConversation.update({ where: { id: row.id }, data: { tags: { push: command.tag } } });
      return { entityType: "BusinessConversation", entityId: row.id, action: "CONVERSATION_TAG_ADDED", payload: { tag: command.tag }, result: { entityId: row.id } };
    }
    case "conversation.ai_suggest": {
      const row = await conversation(command.conversationId);
      return { entityType: "BusinessConversation", entityId: row.id, action: "AI_SUGGESTION_REQUESTED", result: { entityId: row.id }, after: () => generateAIReply(row.id) };
    }
    case "lead.create": {
      let unit;
      try {
        unit = resolveMutationUnit(access, command.businessUnitId);
      } catch (error) {
        throw new CrmError(422, error instanceof Error ? error.message : "BUSINESS_UNIT_REQUIRED", "İş birimi seçin.");
      }
      const normalizedPhone = normalizePhone(command.phone);
      const normalizedEmail = normalizeEmail(command.email);
      // Boş normalize alanlar `OR: [{}, {}]` üretip rastgele bir adayı "aynı kişi" önermesin.
      const duplicateFilters = [...(normalizedPhone ? [{ normalizedPhone }] : []), ...(normalizedEmail ? [{ normalizedEmail }] : [])];
      const possible = duplicateFilters.length ? await tx.businessLead.findFirst({ where: { businessUnitId: unit.id, OR: duplicateFilters }, select: { id: true, firstName: true } }) : null;
      const row = await tx.businessLead.create({ data: { businessUnitId: unit.id, source: "MANUAL", firstName: command.firstName, phone: command.phone || null, normalizedPhone, email: command.email || null, normalizedEmail, productInterest: command.productInterest, matchSuggestion: possible ? { leadId: possible.id, name: possible.firstName, confidence: 0.78 } : undefined } });
      await tx.leadActivity.create({ data: { leadId: row.id, type: "LEAD_CREATED", toValue: "NEW", actorUserId: actor } });
      return {
        entityType: "BusinessLead",
        entityId: row.id,
        action: "LEAD_CREATED",
        result: { entityId: row.id },
        after: () => emit("lead_created", { businessUnitId: row.businessUnitId, entityType: "lead", entityId: row.id, leadId: row.id, source: row.source, product: productOf(row.productInterest), stage: row.stage, ownerId: row.assignedUserId, temperature: row.temperature }),
      };
    }
    case "lead.stage": {
      const row = await lead(command.leadId, { anonymizedAt: null });
      const validated = validateStageTransition({ from: row.stage, to: command.stage, lostReasonCode: command.lostReasonCode, lostReasonDetail: command.lostReasonDetail });
      if (!validated.ok) throw new CrmError(422, validated.error, STAGE_ERRORS[validated.error] ?? "Aşama değiştirilemedi.");
      const data = validated.data;
      // WON: e-posta/telefon ile mevcut STUDENT yüksek güvendeyse bağla (duplicate yok).
      let relatedUserPatch: { relatedOdUserId?: string; relatedOdkUserId?: string } = {};
      if (data.stage === "WON" && !row.relatedOdUserId && !row.relatedOdkUserId) {
        const { evaluateLeadUserMatch } = await import("@/lib/lifecycle/identity");
        const candidates = await tx.user.findMany({
          where: { role: "STUDENT", status: "ACTIVE", OR: [...(row.normalizedEmail ? [{ email: row.normalizedEmail }] : []), ...(row.email ? [{ email: row.email.toLowerCase() }] : []), ...(row.normalizedPhone ? [{ phone: row.normalizedPhone }] : []), ...(row.phone ? [{ phone: row.phone }] : [])] },
          select: { id: true, role: true, status: true, email: true, phone: true, fullName: true },
          take: 8,
        });
        const match = evaluateLeadUserMatch({ email: row.email, phone: row.phone }, candidates.map((c) => ({ userId: c.id, role: c.role, status: c.status, email: c.email, phone: c.phone, fullName: c.fullName })));
        if (match.decision === "LINK" && match.candidate) relatedUserPatch = row.productInterest === "ONLINE_DENEME_KULUBU" ? { relatedOdkUserId: match.candidate.userId } : { relatedOdUserId: match.candidate.userId };
      }
      const updated = await tx.businessLead.update({
        where: { id: row.id },
        data: {
          stage: data.stage,
          lostReasonCode: data.stage === "LOST" ? data.lostReasonCode : null,
          lostReason: data.stage === "LOST" ? data.lostReason : data.clearLost ? null : row.lostReason,
          wonAt: data.stage === "WON" ? data.wonAt : data.stage === "LOST" || data.clearLost ? null : row.wonAt,
          lostAt: data.stage === "LOST" ? data.lostAt : data.stage === "WON" || data.clearLost ? null : row.lostAt,
          ...(data.stage === "WON" || data.stage === "CONTACTED" ? { lastContactAt: new Date() } : {}),
          ...relatedUserPatch,
        },
      });
      await tx.leadActivity.create({
        data: {
          leadId: row.id,
          type: "STAGE_CHANGED",
          fromValue: row.stage,
          toValue: data.stage,
          actorUserId: actor,
          metadata: data.stage === "LOST" ? { lostReasonCode: data.lostReasonCode, lostReason: data.lostReason } : relatedUserPatch.relatedOdUserId || relatedUserPatch.relatedOdkUserId ? { linkedUserId: relatedUserPatch.relatedOdUserId || relatedUserPatch.relatedOdkUserId } : undefined,
        },
      });
      return {
        entityType: "BusinessLead",
        entityId: row.id,
        action: data.stage === "WON" ? "lead.lifecycle.won" : "LEAD_STAGE_CHANGED",
        payload: { from: row.stage, to: data.stage, lostReasonCode: data.lostReasonCode ?? null, ...relatedUserPatch },
        result: { entityId: row.id, lead: { id: updated.id, stage: updated.stage, lostReasonCode: updated.lostReasonCode, lostReason: updated.lostReason, wonAt: updated.wonAt?.toISOString() ?? null, lostAt: updated.lostAt?.toISOString() ?? null } },
        after: () => emit("lead_stage_changed", { businessUnitId: row.businessUnitId, entityType: "lead", entityId: row.id, leadId: row.id, source: row.source, product: productOf(row.productInterest), stage: data.stage, ownerId: row.assignedUserId, temperature: row.temperature, eventId: `lead_stage_changed:lead:${row.id}:${row.stage}->${data.stage}` }),
      };
    }
    case "lead.note": {
      const row = await lead(command.leadId);
      await tx.leadActivity.create({ data: { leadId: row.id, type: "NOTE", actorUserId: actor, metadata: { note: command.note } } });
      await tx.businessLead.update({ where: { id: row.id }, data: { lastContactAt: new Date() } });
      return { entityType: "BusinessLead", entityId: row.id, action: "LEAD_NOTE_ADDED", result: { entityId: row.id } };
    }
    case "lead.task": {
      const row = await lead(command.leadId);
      const dueAt = command.dueAt ? parseIstanbulInstant(command.dueAt) : null;
      if (command.dueAt && !dueAt) throw new CrmError(400, "INVALID_DATE", "Son tarihi kontrol edin.");
      const assignedUserId = command.assignedUserId || actor;
      await tx.leadTask.create({ data: { leadId: row.id, title: command.title, note: command.note || null, dueAt, assignedUserId } });
      await tx.businessLead.update({
        where: { id: row.id },
        data: {
          ...(dueAt && (command.setFollowUp || !row.nextFollowUpAt || (row.nextFollowUpAt && dueAt < row.nextFollowUpAt)) ? { nextFollowUpAt: dueAt } : {}),
          ...(assignedUserId && !row.assignedUserId ? { assignedUserId } : {}),
        },
      });
      return { entityType: "BusinessLead", entityId: row.id, action: "LEAD_TASK_CREATED", payload: { dueAt: dueAt?.toISOString() ?? null }, result: { entityId: row.id } };
    }
    case "lead.task_complete": {
      const task = await tx.leadTask.findFirst({ where: { id: command.taskId, lead: { businessUnitId: { in: unitIds } } } });
      if (!task) throw new CrmError(404, "TASK_NOT_FOUND", NOT_FOUND.task);
      if (!task.completedAt) await tx.leadTask.update({ where: { id: task.id }, data: { completedAt: new Date() } });
      return { entityType: "LeadTask", entityId: task.id, action: "LEAD_TASK_COMPLETED", payload: { leadId: task.leadId }, result: { entityId: task.id } };
    }
    case "lead.follow_up": {
      const row = await lead(command.leadId, { anonymizedAt: null });
      const nextFollowUpAt = parseIstanbulInstant(command.nextFollowUpAt);
      if (!nextFollowUpAt) throw new CrmError(400, "INVALID_FOLLOW_UP", "Takip tarihini kontrol edin.");
      const assignedUserId = command.assignedUserId || row.assignedUserId || actor;
      await tx.businessLead.update({ where: { id: row.id }, data: { nextFollowUpAt, assignedUserId } });
      if (command.note?.trim()) await tx.leadActivity.create({ data: { leadId: row.id, type: "NOTE", actorUserId: actor, metadata: { note: command.note.trim(), kind: "FOLLOW_UP" } } });
      await tx.leadActivity.create({ data: { leadId: row.id, type: "FOLLOW_UP_SCHEDULED", toValue: nextFollowUpAt.toISOString(), actorUserId: actor } });
      if (command.taskTitle?.trim()) await tx.leadTask.create({ data: { leadId: row.id, title: command.taskTitle.trim(), note: command.note?.trim() || null, dueAt: nextFollowUpAt, assignedUserId } });
      return { entityType: "BusinessLead", entityId: row.id, action: "LEAD_FOLLOW_UP_SCHEDULED", payload: { nextFollowUpAt: nextFollowUpAt.toISOString(), assignedUserId }, result: { entityId: row.id } };
    }
    case "lead.owner": {
      const row = await lead(command.leadId);
      await tx.businessLead.update({ where: { id: row.id }, data: { assignedUserId: command.assignedUserId || null } });
      await tx.leadActivity.create({ data: { leadId: row.id, type: "OWNER_CHANGED", fromValue: row.assignedUserId, toValue: command.assignedUserId || null, actorUserId: actor } });
      return { entityType: "BusinessLead", entityId: row.id, action: "LEAD_OWNER_ASSIGNED", payload: { assignedUserId: command.assignedUserId || null }, result: { entityId: row.id } };
    }
    case "lead.priority": {
      const row = await lead(command.leadId);
      await tx.businessLead.update({ where: { id: row.id }, data: { priority: command.priority } });
      return { entityType: "BusinessLead", entityId: row.id, action: "LEAD_PRIORITY_CHANGED", payload: { from: row.priority, to: command.priority }, result: { entityId: row.id } };
    }
    case "lead.duplicate_dismiss": {
      const row = await lead(command.leadId);
      await tx.businessLead.update({ where: { id: row.id }, data: { matchSuggestion: Prisma.JsonNull } });
      return { entityType: "BusinessLead", entityId: row.id, action: "LEAD_DUPLICATE_DISMISSED", result: { entityId: row.id } };
    }
    case "lead.merge": {
      const target = await lead(command.targetId);
      const source = await tx.businessLead.findFirst({ where: { id: command.sourceId, businessUnitId: { in: unitIds } } });
      if (!source || source.businessUnitId !== target.businessUnitId || source.id === target.id) throw new CrmError(422, "INVALID_LEAD_MERGE", "Bu adaylar birleştirilemez.");
      if (source.conversationId && !target.conversationId) await tx.businessLead.update({ where: { id: source.id }, data: { conversationId: null } });
      await tx.businessLead.update({ where: { id: target.id }, data: { conversationId: target.conversationId || source.conversationId, firstName: target.firstName || source.firstName, lastName: target.lastName || source.lastName, phone: target.phone || source.phone, normalizedPhone: target.normalizedPhone || source.normalizedPhone, email: target.email || source.email, normalizedEmail: target.normalizedEmail || source.normalizedEmail, studentName: target.studentName || source.studentName, parentName: target.parentName || source.parentName, productInterest: target.productInterest === "UNKNOWN" ? source.productInterest : target.productInterest, tags: [...new Set([...target.tags, ...source.tags])], lastContactAt: source.lastContactAt > target.lastContactAt ? source.lastContactAt : target.lastContactAt } });
      await tx.businessLead.update({ where: { id: source.id }, data: { stage: "SPAM", lostReason: `MERGED_INTO:${target.id}`, matchSuggestion: Prisma.JsonNull } });
      await tx.leadActivity.createMany({ data: [{ leadId: target.id, type: "LEAD_MERGED", fromValue: source.id, actorUserId: actor }, { leadId: source.id, type: "MERGED_INTO", toValue: target.id, actorUserId: actor }] });
      return { entityType: "BusinessLead", entityId: source.id, action: "LEAD_MERGED", payload: { targetId: target.id }, result: { entityId: target.id } };
    }
    case "lead.link_order": {
      const row = await lead(command.leadId);
      if (command.product === "OD") {
        const order = await tx.odOrder.findFirst({ where: { id: command.orderId }, select: { id: true, userId: true } });
        if (!order) throw new CrmError(404, "ORDER_NOT_FOUND", NOT_FOUND.order);
        await tx.businessLead.update({ where: { id: row.id }, data: { relatedOdOrderId: order.id, relatedOdUserId: order.userId ?? row.relatedOdUserId, stage: row.stage === "LOST" || row.stage === "SPAM" ? row.stage : "WON", wonAt: row.wonAt ?? new Date(), productInterest: row.productInterest === "UNKNOWN" ? "ONLINE_DERSHANEM" : row.productInterest } });
      } else {
        const order = await tx.odkOrder.findFirst({ where: { id: command.orderId }, select: { id: true, studentUserId: true } });
        if (!order) throw new CrmError(404, "ORDER_NOT_FOUND", NOT_FOUND.order);
        await tx.businessLead.update({ where: { id: row.id }, data: { relatedOdkOrderId: order.id, relatedOdkUserId: order.studentUserId ?? row.relatedOdkUserId, stage: row.stage === "LOST" || row.stage === "SPAM" ? row.stage : "WON", wonAt: row.wonAt ?? new Date(), productInterest: row.productInterest === "UNKNOWN" ? "ONLINE_DENEME_KULUBU" : row.productInterest } });
      }
      await tx.leadActivity.create({ data: { leadId: row.id, type: "ORDER_LINKED", toValue: command.orderId, actorUserId: actor, metadata: { product: command.product } } });
      return { entityType: "BusinessLead", entityId: row.id, action: "LEAD_ORDER_LINKED", payload: { product: command.product, orderId: command.orderId }, result: { entityId: row.id } };
    }
    case "lead.link_lifecycle":
      throw new Error("lead.link_lifecycle transaction dışında çalışır");
  }
}

/** Yaşam döngüsü bağı: mevcut `linkLeadLifecycleEntities` (kendi transaction + audit); makbuz bağdan sonra. */
async function linkLifecycle(access: BusinessAccess, command: Extract<CrmCommand, { type: "lead.link_lifecycle" }>, expected: string | undefined): Promise<Executed> {
  const row = await prisma.businessLead.findFirst({ where: { id: command.leadId, businessUnitId: { in: scopedUnitIds(access) }, anonymizedAt: null } });
  if (!row) throw new CrmError(404, "LEAD_NOT_FOUND", NOT_FOUND.lead);
  checkRevision(command, row, expected);
  const cuid = /^c[a-z0-9]{20,32}$/;
  const pick = (value: string | undefined) => (value && cuid.test(value) ? value : null);
  const { linkLeadLifecycleEntities, LifecycleLinkError } = await import("@/lib/lifecycle/link");
  try {
    await linkLeadLifecycleEntities({ leadId: row.id, actorUserId: access.session.userId, userId: pick(command.userId), odOrderId: pick(command.odOrderId), odkOrderId: pick(command.odkOrderId), force: Boolean(command.force) });
  } catch (error) {
    if (error instanceof LifecycleLinkError) throw new CrmError(422, error.code, error.message);
    throw error;
  }
  return { entityType: "BusinessLead", entityId: row.id, action: "LEAD_LIFECYCLE_LINK_REQUESTED", result: { entityId: row.id } };
}

export async function runCrmCommand(access: BusinessAccess, command: CrmCommand, options: { idempotencyKey?: string; expectedRevision?: string } = {}): Promise<{ result: CrmResult; replayed: boolean }> {
  return runWithReceipt<CrmResult>({
    actorUserId: access.session.userId,
    namespace: "crm",
    idempotencyKey: options.idempotencyKey,
    digestOf: { command, expectedRevision: options.expectedRevision ?? null },
    ...(command.type === "lead.link_lifecycle"
      ? { outside: () => linkLifecycle(access, command, options.expectedRevision) }
      : { transactional: (tx: Prisma.TransactionClient) => execute(tx, access, command, options.expectedRevision) }),
    // Kayıt ve makbuz yazıldı; yalnız AI üretimi başarısız (web'de de hata olarak görünüyordu).
    afterError: () => {
      if (command.type === "conversation.ai_suggest") throw new CrmError(502, "AI_UNAVAILABLE", "AI önerisi şu anda üretilemedi.");
      throw new CrmError(502, "SIDE_EFFECT_FAILED", "İşlem kaydedildi ancak ek adım tamamlanamadı.");
    },
  });
}
