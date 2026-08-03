import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/lib/business/ai";
import { getInstagramProvider, type NormalizedInstagramEvent, webhookIdempotencyKey } from "@/lib/business/instagram";
import { log } from "@/lib/logger";

async function ensureAccount(tx: Prisma.TransactionClient, externalId: string) {
  const existing = await tx.instagramAccount.findUnique({ where: { externalId } });
  if (existing) return existing;
  const unit = await tx.businessUnit.upsert({ where: { product: "OD" }, update: { isActive: true }, create: { code: "OD", name: "OnlineDershanem", product: "OD" } });
  const connection = await tx.integrationConnection.upsert({
    where: { businessUnitId_provider_displayName: { businessUnitId: unit.id, provider: "INSTAGRAM", displayName: "Instagram" } },
    update: {}, create: { businessUnitId: unit.id, provider: "INSTAGRAM", displayName: "Instagram", status: process.env.META_INSTAGRAM_ACCESS_TOKEN ? "CONNECTED" : "DISCONNECTED" },
  });
  return tx.instagramAccount.create({ data: { businessUnitId: unit.id, connectionId: connection.id, externalId, username: process.env.META_INSTAGRAM_USERNAME || "development", aiMode: (process.env.INSTAGRAM_AI_MODE?.toUpperCase().replace("-", "_") as "OFF" | "SUGGESTION" | "AUTO_SAFE" | "AUTO") || "SUGGESTION" } });
}

export async function persistInstagramEvent(event: NormalizedInstagramEvent, rawPayload: Prisma.InputJsonValue) {
  return prisma.$transaction(async (tx) => {
    const account = await ensureAccount(tx, event.accountExternalId);
    const key = webhookIdempotencyKey(event);
    const webhook = await tx.instagramWebhookEvent.upsert({
      where: { providerEventId: event.providerEventId }, update: {},
      create: { instagramAccountId: account.id, providerEventId: event.providerEventId, idempotencyKey: key, eventType: "messages", occurredAt: event.occurredAt, payload: rawPayload },
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
  const payload = webhook.payload as unknown as NormalizedInstagramEvent;
  const account = webhook.instagramAccount;
  const customerId = payload.isEcho ? payload.recipientId : payload.senderId;
  const body = payload.text ?? null;
  const conversation = await prisma.businessConversation.upsert({
    where: { instagramAccountId_instagramScopedUserId: { instagramAccountId: account.id, instagramScopedUserId: customerId } },
    update: { lastMessageAt: payload.occurredAt, unreadCount: payload.isEcho ? undefined : { increment: 1 } },
    create: { businessUnitId: account.businessUnitId, instagramAccountId: account.id, instagramScopedUserId: customerId, lastMessageAt: payload.occurredAt, unreadCount: payload.isEcho ? 0 : 1, aiMode: account.aiMode },
  });
  const message = await prisma.businessMessage.upsert({
    where: { idempotencyKey: `instagram:${webhook.id}` }, update: {},
    create: { conversationId: conversation.id, externalId: payload.providerEventId, direction: payload.isEcho ? "OUTBOUND" : "INBOUND", senderType: payload.isEcho ? "HUMAN" : "CUSTOMER", body, type: payload.mediaMetadata ? "MEDIA" : "TEXT", mediaMetadata: payload.mediaMetadata as Prisma.InputJsonValue | undefined, providerMetadata: { referral: payload.referral } as Prisma.InputJsonValue, status: payload.isEcho ? "SENT" : "RECEIVED", idempotencyKey: `instagram:${webhook.id}`, occurredAt: payload.occurredAt },
  });
  await prisma.businessLead.upsert({
    where: { conversationId: conversation.id },
    update: { lastContactAt: payload.occurredAt },
    create: { businessUnitId: account.businessUnitId, conversationId: conversation.id, instagramScopedId: customerId, source: payload.referral ? "INSTAGRAM_AD" : "INSTAGRAM_ORGANIC", lastContactAt: payload.occurredAt },
  });

  if (!payload.isEcho && body && account.aiMode !== "OFF" && process.env.INSTAGRAM_AI_ENABLED === "true") {
    const entries = await prisma.knowledgeBaseEntry.findMany({ where: { businessUnitId: account.businessUnitId, isActive: true, OR: [{ validFrom: null }, { validFrom: { lte: new Date() } }], AND: [{ OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }] }] }, orderBy: { updatedAt: "desc" }, take: 12 });
    const started = Date.now();
    try {
      const decision = await getAIProvider().decide({ message: body, context: entries.map((item) => `${item.title}: ${item.content}`).join("\n"), safetyIdentifier: createHash("sha256").update(customerId).digest("hex") });
      await prisma.aIExecution.create({ data: { conversationId: conversation.id, inputMessageId: message.id, provider: process.env.NODE_ENV === "production" ? "OPENAI" : "MOCK", model: process.env.OPENAI_MODEL || "gpt-5.6-luna", decision: decision as Prisma.InputJsonValue, confidence: decision.confidence, status: "SUCCEEDED", latencyMs: Date.now() - started } });
      await prisma.businessConversation.update({ where: { id: conversation.id }, data: { temperature: decision.leadTemperature, productInterest: decision.productInterest, tags: { push: decision.suggestedTags }, ...(decision.requiresHuman ? { status: "WAITING_HUMAN", aiMode: "OFF" } : {}) } });
      const mayAuto = decision.reply && decision.shouldReplyAutomatically && (account.aiMode === "AUTO" || account.aiMode === "AUTO_SAFE");
      if (mayAuto) await sendConversationMessage({ conversationId: conversation.id, text: decision.reply!, senderType: "AI", idempotencyKey: `ai:${message.id}` });
    } catch (error) {
      await prisma.aIExecution.create({ data: { conversationId: conversation.id, inputMessageId: message.id, provider: "OPENAI", model: process.env.OPENAI_MODEL || "gpt-5.6-luna", status: "FAILED", errorCode: error instanceof Error ? error.message.slice(0, 80) : "UNKNOWN", latencyMs: Date.now() - started } });
      await prisma.businessConversation.update({ where: { id: conversation.id }, data: { status: "WAITING_HUMAN", aiMode: "OFF" } });
    }
  }
  await prisma.instagramWebhookEvent.update({ where: { id: webhook.id }, data: { processedAt: new Date() } });
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
    throw error;
  }
  return message.id;
}

export async function processBackgroundJobs(limit = 10) {
  let processed = 0;
  for (let index = 0; index < Math.min(limit, 50); index++) {
    const candidate = await prisma.backgroundJob.findFirst({ where: { status: { in: ["PENDING", "FAILED"] }, runAfter: { lte: new Date() }, attempts: { lt: 5 } }, orderBy: [{ priority: "asc" }, { createdAt: "asc" }] });
    if (!candidate) break;
    const claimed = await prisma.backgroundJob.updateMany({ where: { id: candidate.id, status: candidate.status }, data: { status: "PROCESSING", lockedAt: new Date(), lockedBy: process.env.VERCEL_REGION || "local", attempts: { increment: 1 } } });
    if (!claimed.count) continue;
    try {
      if (candidate.type === "PROCESS_INSTAGRAM_MESSAGE") await processInstagramMessage(String((candidate.payload as { webhookEventId?: string }).webhookEventId));
      await prisma.backgroundJob.update({ where: { id: candidate.id }, data: { status: "SUCCEEDED", completedAt: new Date(), lockedAt: null, lockedBy: null } });
      processed++;
    } catch (error) {
      const attempts = candidate.attempts + 1;
      const code = error instanceof Error ? error.message.slice(0, 100) : "UNKNOWN";
      await prisma.backgroundJob.update({ where: { id: candidate.id }, data: { status: attempts >= candidate.maxAttempts ? "DEAD" : "FAILED", lastErrorCode: code, runAfter: new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000), lockedAt: null, lockedBy: null } });
      log.error("business.job.failed", error, { jobId: candidate.id, type: candidate.type, retryCount: attempts });
    }
  }
  return processed;
}

