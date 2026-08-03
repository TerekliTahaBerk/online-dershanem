import { createHmac, timingSafeEqual, createHash } from "node:crypto";
import { z } from "zod";

export interface InstagramMessagingProvider {
  sendText(input: { accountId: string; recipientId: string; text: string; idempotencyKey: string }): Promise<{ externalId: string; raw: unknown }>;
  health(): Promise<{ ok: boolean; code: string }>;
}

export function verifyMetaSignature(rawBody: string, header: string | null, secret = process.env.META_APP_SECRET || process.env.META_WEBHOOK_SECRET) {
  if (!secret || !header?.startsWith("sha256=")) return false;
  const actual = Buffer.from(header.slice(7), "hex");
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"), "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const attachmentSchema = z.object({ type: z.string().optional(), payload: z.record(z.string(), z.unknown()).optional() }).passthrough();
export const metaWebhookSchema = z.object({
  object: z.string(), entry: z.array(z.object({ id: z.string(), time: z.number().optional(), messaging: z.array(z.object({
    sender: z.object({ id: z.string() }), recipient: z.object({ id: z.string() }), timestamp: z.number().optional(),
    message: z.object({ mid: z.string(), text: z.string().optional(), is_echo: z.boolean().optional(), attachments: z.array(attachmentSchema).optional(), reply_to: z.unknown().optional() }).optional(),
    referral: z.record(z.string(), z.unknown()).optional(), read: z.unknown().optional(), delivery: z.unknown().optional(),
  }).passthrough()).default([]) }).passthrough())
});

export type NormalizedInstagramEvent = { providerEventId: string; accountExternalId: string; senderId: string; recipientId: string; occurredAt: Date; text: string | null; mediaMetadata: unknown; referral: unknown; isEcho: boolean };

export function normalizeMetaEvents(raw: unknown): NormalizedInstagramEvent[] {
  const parsed = metaWebhookSchema.parse(raw);
  return parsed.entry.flatMap((entry) => entry.messaging.flatMap((event) => {
    if (!event.message?.mid) return [];
    return [{ providerEventId: event.message.mid, accountExternalId: entry.id, senderId: event.sender.id, recipientId: event.recipient.id, occurredAt: new Date(event.timestamp ?? entry.time ?? Date.now()), text: event.message.text ?? null, mediaMetadata: event.message.attachments ?? event.message.reply_to ?? null, referral: event.referral ?? null, isEcho: event.message.is_echo === true }];
  }));
}

export function webhookIdempotencyKey(event: NormalizedInstagramEvent) {
  return createHash("sha256").update(`${event.accountExternalId}:${event.providerEventId}`).digest("hex");
}

export class MetaInstagramProvider implements InstagramMessagingProvider {
  async sendText(input: { accountId: string; recipientId: string; text: string }) {
    const token = process.env.META_INSTAGRAM_ACCESS_TOKEN;
    if (!token) throw new Error("META_TOKEN_MISSING");
    const version = process.env.META_GRAPH_API_VERSION;
    if (!version) throw new Error("META_GRAPH_API_VERSION_MISSING");
    const response = await fetch(`https://graph.instagram.com/${version}/${encodeURIComponent(input.accountId)}/messages`, {
      method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ recipient: { id: input.recipientId }, message: { text: input.text } }), signal: AbortSignal.timeout(15_000),
    });
    const raw = await response.json() as { message_id?: string; error?: { code?: number } };
    if (!response.ok || !raw.message_id) throw new Error(`META_SEND_${raw.error?.code ?? response.status}`);
    return { externalId: raw.message_id, raw };
  }
  async health() { return { ok: Boolean(process.env.META_INSTAGRAM_ACCESS_TOKEN && process.env.META_INSTAGRAM_ACCOUNT_ID), code: process.env.META_INSTAGRAM_ACCESS_TOKEN ? "CONFIGURED" : "TOKEN_MISSING" }; }
}

export class MockInstagramProvider implements InstagramMessagingProvider {
  async sendText(input: { idempotencyKey: string }) { return { externalId: `mock_${input.idempotencyKey.slice(0, 20)}`, raw: { mock: true } }; }
  async health() { return { ok: true, code: "MOCK" }; }
}

export function getInstagramProvider() { return process.env.NODE_ENV === "production" ? new MetaInstagramProvider() : new MockInstagramProvider(); }
