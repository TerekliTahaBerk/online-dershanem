import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/lib/business/ai";
import { getInstagramProvider, type NormalizedInstagramEvent, webhookIdempotencyKey } from "@/lib/business/instagram";
import { attributeLeadFromReferral, extractReferralAttribution } from "@/lib/business/attribution";
import { executeAutomations, runUnansweredHotLeadAutomations } from "@/lib/business/automation";
import { buildKnowledgeContext } from "@/lib/business/knowledge";
import { normalizeEmail, normalizePhone } from "@/lib/business/normalization";
import { reconcileAllBusinessUnits } from "@/lib/business/reconciliation";
import { applyBusinessRetention } from "@/lib/business/retention";
import { getAdPlatformProvider } from "@/lib/business/providers";
import { log } from "@/lib/logger";
import { formatIstanbulDateInput } from "@/lib/istanbul-time";

async function ensureAccount(tx: Prisma.TransactionClient, externalId: string) {
  const existing = await tx.instagramAccount.findUnique({ where: { externalId } });
  if (existing) return existing;
  const unit = await tx.businessUnit.upsert({ where: { code: "OD" }, update: { isActive: true }, create: { code: "OD", name: "OnlineDershanem", product: "OD" } });
  const connection = await tx.integrationConnection.upsert({
    where: { businessUnitId_provider_displayName: { businessUnitId: unit.id, provider: "INSTAGRAM", displayName: "Instagram" } },
    update: {}, create: { businessUnitId: unit.id, provider: "INSTAGRAM", displayName: "Instagram", status: process.env.META_INSTAGRAM_ACCESS_TOKEN ? "CONNECTED" : "DISCONNECTED" },
  });
  return tx.instagramAccount.upsert({ where: { externalId }, update: {}, create: { businessUnitId: unit.id, connectionId: connection.id, externalId, username: process.env.META_INSTAGRAM_USERNAME || "development", aiMode: (process.env.INSTAGRAM_AI_MODE?.toUpperCase().replace("-", "_") as "OFF" | "SUGGESTION" | "AUTO_SAFE" | "AUTO") || "SUGGESTION" } });
}

export async function persistInstagramEvent(event: NormalizedInstagramEvent, rawPayload: Prisma.InputJsonValue) {
  return prisma.$transaction(async (tx) => {
    const account = await ensureAccount(tx, event.accountExternalId);
    const key = webhookIdempotencyKey(event);
    const webhook = await tx.instagramWebhookEvent.upsert({
      where: { providerEventId: event.providerEventId }, update: {},
      create: { instagramAccountId: account.id, providerEventId: event.providerEventId, idempotencyKey: key, eventType: event.eventKind, occurredAt: event.occurredAt, payload: rawPayload },
    });
    await tx.backgroundJob.upsert({
      where: { idempotencyKey: `instagram-event:${key}` }, update: {},
      create: { businessUnitId: account.businessUnitId, type: "PROCESS_INSTAGRAM_MESSAGE", idempotencyKey: `instagram-event:${key}`, payload: { webhookEventId: webhook.id } },
    });
    return webhook.id;
  });
}

async function processInstagramMessage(webhookEventId: string) {
  const webhook = await prisma.instagramWebhookEvent.findUnique({ where: { id: webhookEventId }, include: { instagramAccount: true } });
  if (!webhook || webhook.processedAt || !webhook.instagramAccount) return;
  const stored = webhook.payload as unknown as NormalizedInstagramEvent;
  const payload: NormalizedInstagramEvent = { ...stored, eventKind: stored.eventKind ?? "MESSAGE", occurredAt: stored.occurredAt instanceof Date ? stored.occurredAt : new Date(stored.occurredAt), relatedMessageIds: stored.relatedMessageIds ?? [] };
  const account = webhook.instagramAccount;
  if (payload.eventKind === "DELIVERY" || payload.eventKind === "READ") {
    const status = payload.eventKind === "DELIVERY" ? "DELIVERED" : "READ";
    const messages = payload.relatedMessageIds.length ? await prisma.businessMessage.findMany({ where: { externalId: { in: payload.relatedMessageIds } }, select: { id: true } }) : [];
    for (const item of messages) await prisma.$transaction([prisma.businessMessage.update({ where: { id: item.id }, data: { status } }), prisma.messageDelivery.create({ data: { messageId: item.id, status, providerResponse: { eventId: payload.providerEventId } } })]);
    await prisma.instagramWebhookEvent.update({ where: { id: webhook.id }, data: { processedAt: new Date() } }); return;
  }
  const customerId = payload.isEcho ? payload.recipientId : payload.senderId;
  const body = payload.text ?? null;
  const attribution = extractReferralAttribution(payload.referral);
  const conversation = await prisma.businessConversation.upsert({
    where: { instagramAccountId_instagramScopedUserId: { instagramAccountId: account.id, instagramScopedUserId: customerId } },
    update: { lastMessageAt: payload.occurredAt, unreadCount: payload.isEcho ? undefined : { increment: 1 }, sourceCampaignExternalId: attribution.campaignExternalId ?? undefined, sourceAdExternalId: attribution.adExternalId ?? undefined },
    create: { businessUnitId: account.businessUnitId, instagramAccountId: account.id, instagramScopedUserId: customerId, lastMessageAt: payload.occurredAt, unreadCount: payload.isEcho ? 0 : 1, aiMode: account.aiMode, sourceCampaignExternalId: attribution.campaignExternalId, sourceAdExternalId: attribution.adExternalId },
  });
  const message = await prisma.businessMessage.upsert({
    where: { idempotencyKey: `instagram:${webhook.id}` }, update: {},
    create: { conversationId: conversation.id, externalId: payload.providerEventId, direction: payload.isEcho ? "OUTBOUND" : "INBOUND", senderType: payload.isEcho ? "HUMAN" : "CUSTOMER", body, type: payload.mediaMetadata ? "MEDIA" : "TEXT", mediaMetadata: payload.mediaMetadata as Prisma.InputJsonValue | undefined, providerMetadata: { referral: payload.referral } as Prisma.InputJsonValue, status: payload.isEcho ? "SENT" : "RECEIVED", idempotencyKey: `instagram:${webhook.id}`, occurredAt: payload.occurredAt },
  });
  const lead = await prisma.businessLead.upsert({
    where: { conversationId: conversation.id },
    update: { lastContactAt: payload.occurredAt },
    create: { businessUnitId: account.businessUnitId, conversationId: conversation.id, instagramScopedId: customerId, source: payload.referral ? "INSTAGRAM_AD" : "INSTAGRAM_ORGANIC", lastContactAt: payload.occurredAt },
  });
  if (payload.referral) await attributeLeadFromReferral(lead.id, account.businessUnitId, payload.referral);
  if (!payload.isEcho) {
    await executeAutomations("NEW_MESSAGE", { businessUnitId: account.businessUnitId, entityType: "conversation", entityId: conversation.id, conversationId: conversation.id, leadId: lead.id, temperature: conversation.temperature, campaignExternalId: attribution.campaignExternalId });
  }
  if (!payload.isEcho && body && account.aiMode !== "OFF" && process.env.INSTAGRAM_AI_ENABLED === "true") {
    const bucket = Math.floor(payload.occurredAt.getTime() / 10_000);
    await prisma.backgroundJob.upsert({ where: { idempotencyKey: `ai-debounce:${conversation.id}:${bucket}` }, update: { runAfter: new Date(Date.now() + 8_000), payload: { conversationId: conversation.id, inputMessageId: message.id } }, create: { businessUnitId: account.businessUnitId, type: "GENERATE_AI_REPLY", idempotencyKey: `ai-debounce:${conversation.id}:${bucket}`, payload: { conversationId: conversation.id, inputMessageId: message.id }, runAfter: new Date(Date.now() + 8_000) } });
  }
  await prisma.instagramWebhookEvent.update({ where: { id: webhook.id }, data: { processedAt: new Date() } });
}

export async function generateAIReply(conversationId: string, inputMessageId?: string) {
  const conversation = await prisma.businessConversation.findUnique({ where: { id: conversationId }, include: { instagramAccount: true, lead: true, messages: { where: { direction: "INBOUND", body: { not: null } }, orderBy: { occurredAt: "desc" }, take: 4 } } });
  if (!conversation || conversation.aiMode === "OFF" || !conversation.messages.length) return;
  const input = [...conversation.messages].reverse().map((item) => item.body).filter(Boolean).join("\n");
  const context = await buildKnowledgeContext({ businessUnitId: conversation.businessUnitId, message: input, productInterest: conversation.productInterest });
  const prompt = await prisma.aIPromptVersion.findFirst({ where: { OR: [{ businessUnitId: conversation.businessUnitId }, { businessUnitId: null }], isActive: true }, orderBy: { version: "desc" } });
  const started = Date.now();
  try {
    const decision = await getAIProvider().decide({ message: input, context: `${prompt?.systemPrompt ? `YÖNETİLEN EK KURALLAR:\n${prompt.systemPrompt}\n` : ""}${context}`, safetyIdentifier: createHash("sha256").update(conversation.instagramScopedUserId).digest("hex") });
    await prisma.aIExecution.create({ data: { conversationId, inputMessageId, promptVersionId: prompt?.id, provider: process.env.NODE_ENV === "production" ? "OPENAI" : "MOCK", model: process.env.OPENAI_MODEL || "gpt-5.6-luna", decision: decision as Prisma.InputJsonValue, confidence: decision.confidence, status: "SUCCEEDED", latencyMs: Date.now() - started } });
    await prisma.$transaction(async (tx) => {
      await tx.businessConversation.update({ where: { id: conversationId }, data: { summary: decision.internalSummary, temperature: decision.leadTemperature, productInterest: decision.productInterest, tags: { push: decision.suggestedTags }, ...(decision.requiresHuman ? { status: "WAITING_HUMAN", aiMode: "OFF" } : {}) } });
      if (conversation.lead) await tx.businessLead.update({ where: { id: conversation.lead.id }, data: { temperature: decision.leadTemperature, productInterest: decision.productInterest, firstName: decision.extractedData.name, studentName: decision.extractedData.studentName, parentName: decision.extractedData.parentName, phone: decision.extractedData.phone, normalizedPhone: normalizePhone(decision.extractedData.phone), email: decision.extractedData.email, normalizedEmail: normalizeEmail(decision.extractedData.email), grade: decision.extractedData.grade, examType: decision.extractedData.examType, city: decision.extractedData.city, tags: { push: decision.suggestedTags } } });
    });
    if (conversation.lead && decision.leadTemperature === "HOT") await executeAutomations("HOT_LEAD", { businessUnitId: conversation.businessUnitId, entityType: "lead", entityId: conversation.lead.id, leadId: conversation.lead.id, conversationId, temperature: "HOT", intent: decision.intent, campaignExternalId: conversation.sourceCampaignExternalId });
    if (decision.requiresHuman) await executeAutomations(decision.intent === "COMPLAINT" ? "COMPLAINT" : "NEW_MESSAGE", { businessUnitId: conversation.businessUnitId, entityType: "conversation", entityId: conversationId, conversationId, leadId: conversation.lead?.id, temperature: decision.leadTemperature, intent: decision.intent, campaignExternalId: conversation.sourceCampaignExternalId });
    const mayAuto = decision.reply && decision.shouldReplyAutomatically && (conversation.aiMode === "AUTO" || conversation.aiMode === "AUTO_SAFE");
    if (mayAuto) await sendConversationMessage({ conversationId, text: decision.reply!, senderType: "AI", idempotencyKey: `ai:${inputMessageId ?? conversation.messages[0].id}` });
  } catch (error) {
    await prisma.aIExecution.create({ data: { conversationId, inputMessageId, promptVersionId: prompt?.id, provider: "OPENAI", model: process.env.OPENAI_MODEL || "gpt-5.6-luna", status: "FAILED", errorCode: error instanceof Error ? error.message.slice(0, 80) : "UNKNOWN", latencyMs: Date.now() - started } });
    await prisma.businessConversation.update({ where: { id: conversationId }, data: { status: "WAITING_HUMAN", aiMode: "OFF" } });
  }
}

export async function sendConversationMessage(input: { conversationId: string; text: string; senderType: "AI" | "HUMAN"; idempotencyKey: string }) {
  const conversation = await prisma.businessConversation.findUnique({ where: { id: input.conversationId }, include: { instagramAccount: true } });
  if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");
  const message = await prisma.businessMessage.upsert({
    where: { idempotencyKey: input.idempotencyKey }, update: {},
    create: { conversationId: conversation.id, direction: "OUTBOUND", senderType: input.senderType, body: input.text, status: "QUEUED", idempotencyKey: input.idempotencyKey, occurredAt: new Date() },
  });
  try {
    const result = await getInstagramProvider().sendText({ accountId: conversation.instagramAccount.externalId, recipientId: conversation.instagramScopedUserId, text: input.text, idempotencyKey: input.idempotencyKey });
    await prisma.$transaction([
      prisma.businessMessage.update({ where: { id: message.id }, data: { externalId: result.externalId, status: "SENT" } }),
      prisma.messageDelivery.create({ data: { messageId: message.id, status: "SENT", providerResponse: result.raw as Prisma.InputJsonValue } }),
      prisma.businessConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date(), lastReplyBy: input.senderType } }),
    ]);
  } catch (error) {
    await prisma.businessMessage.update({ where: { id: message.id }, data: { status: "FAILED", failureCode: error instanceof Error ? error.message.slice(0, 80) : "UNKNOWN" } });
    await prisma.backgroundJob.upsert({ where: { idempotencyKey: `message-delivery:${message.id}` }, update: { status: "FAILED", runAfter: new Date(Date.now() + 60_000) }, create: { businessUnitId: conversation.businessUnitId, type: "DELIVER_INSTAGRAM_MESSAGE", idempotencyKey: `message-delivery:${message.id}`, payload: { messageId: message.id }, runAfter: new Date(Date.now() + 60_000) } });
  }
  return message.id;
}

async function retryMessageDelivery(messageId: string) {
  const message = await prisma.businessMessage.findUnique({ where: { id: messageId }, include: { conversation: { include: { instagramAccount: true } } } });
  if (!message || message.status === "SENT" || !message.body) return;
  const result = await getInstagramProvider().sendText({ accountId: message.conversation.instagramAccount.externalId, recipientId: message.conversation.instagramScopedUserId, text: message.body, idempotencyKey: message.idempotencyKey });
  await prisma.$transaction([prisma.businessMessage.update({ where: { id: message.id }, data: { externalId: result.externalId, status: "SENT", failureCode: null } }), prisma.messageDelivery.create({ data: { messageId: message.id, status: "SENT", providerResponse: result.raw as Prisma.InputJsonValue } })]);
}

export async function processBackgroundJobs(limit = 10) {
  await prisma.backgroundJob.updateMany({ where: { status: "PROCESSING", lockedAt: { lt: new Date(Date.now() - 15 * 60_000) } }, data: { status: "FAILED", lockedAt: null, lockedBy: null, lastErrorCode: "STALE_LOCK_RECOVERED" } });
  let processed = 0;
  let failed = 0;
  for (let index = 0; index < Math.min(limit, 50); index++) {
    const candidate = await prisma.backgroundJob.findFirst({ where: { status: { in: ["PENDING", "FAILED"] }, runAfter: { lte: new Date() }, attempts: { lt: 5 } }, orderBy: [{ priority: "asc" }, { createdAt: "asc" }] });
    if (!candidate) break;
    const claimed = await prisma.backgroundJob.updateMany({ where: { id: candidate.id, status: candidate.status }, data: { status: "PROCESSING", lockedAt: new Date(), lockedBy: process.env.VERCEL_REGION || "local", attempts: { increment: 1 } } });
    if (!claimed.count) continue;
    try {
      const payload = candidate.payload as Record<string, unknown>;
      if (candidate.type === "PROCESS_INSTAGRAM_MESSAGE") await processInstagramMessage(String(payload.webhookEventId));
      else if (candidate.type === "GENERATE_AI_REPLY") await generateAIReply(String(payload.conversationId), payload.inputMessageId ? String(payload.inputMessageId) : undefined);
      else if (candidate.type === "DELIVER_INSTAGRAM_MESSAGE") await retryMessageDelivery(String(payload.messageId));
      else if (candidate.type === "RECONCILE_FINANCE") await reconcileAllBusinessUnits();
      else if (candidate.type === "APPLY_BUSINESS_RETENTION") await applyBusinessRetention();
      else if (candidate.type === "SYNC_META_ADS") await getAdPlatformProvider().syncCampaigns();
      else if (candidate.type === "CHECK_UNANSWERED_HOT_LEADS") await runUnansweredHotLeadAutomations();
      else if (candidate.type === "RUN_AUTOMATION_SCANS") {
        const { runAutomationScans } = await import("@/lib/automation/scans");
        await runAutomationScans();
      }
      else if (candidate.type === "AUTOMATE_PAYMENT_COMPLETED") {
        const lead = await prisma.businessLead.findUnique({ where: { id: String(payload.leadId) } });
        if (lead) {
          await executeAutomations("order_paid", {
            businessUnitId: lead.businessUnitId,
            entityType: "payment",
            entityId: String(payload.orderId),
            leadId: lead.id,
            temperature: lead.temperature,
            product: lead.productInterest === "ONLINE_DENEME_KULUBU" ? "ODK" : lead.productInterest === "ONLINE_DERSHANEM" ? "OD" : null,
            source: lead.source,
            stage: lead.stage,
            ownerId: lead.assignedUserId,
            eventId: `order_paid:payment:${payload.orderId}:once`,
          });
        }
      }
      else throw new Error("UNKNOWN_JOB_TYPE");
      await prisma.backgroundJob.update({ where: { id: candidate.id }, data: { status: "SUCCEEDED", completedAt: new Date(), lockedAt: null, lockedBy: null } });
      log.info("business.job.succeeded", { jobId: candidate.id, type: candidate.type, retryCount: candidate.attempts, latency: Date.now() - candidate.updatedAt.getTime() });
      processed++;
    } catch (error) {
      failed++;
      const attempts = candidate.attempts + 1;
      const code = error instanceof Error ? error.message.slice(0, 100) : "UNKNOWN";
      await prisma.backgroundJob.update({ where: { id: candidate.id }, data: { status: attempts >= candidate.maxAttempts ? "DEAD" : "FAILED", lastErrorCode: code, runAfter: new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000), lockedAt: null, lockedBy: null } });
      log.error("business.job.failed", error, { jobId: candidate.id, type: candidate.type, retryCount: attempts });
    }
  }
  return { processed, failed };
}

export async function scheduleBusinessMaintenanceJobs(now = new Date()) {
  const hourly = now.toISOString().slice(0, 13);
  const daily = formatIstanbulDateInput(now);
  const jobs = [
    { type: "RECONCILE_FINANCE", key: `maintenance:reconcile:${hourly}`, enabled: true },
    { type: "CHECK_UNANSWERED_HOT_LEADS", key: `maintenance:unanswered:${hourly}`, enabled: true },
    { type: "RUN_AUTOMATION_SCANS", key: `maintenance:automation-scans:${hourly}`, enabled: true },
    { type: "APPLY_BUSINESS_RETENTION", key: `maintenance:retention:${daily}`, enabled: true },
    { type: "SYNC_META_ADS", key: `maintenance:meta-ads:${hourly}`, enabled: process.env.META_ADS_INTEGRATION_ENABLED === "true" },
  ];
  for (const job of jobs.filter((item) => item.enabled)) await prisma.backgroundJob.upsert({ where: { idempotencyKey: job.key }, update: {}, create: { type: job.type, idempotencyKey: job.key, payload: {} } });
}
