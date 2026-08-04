import { createHmac, timingSafeEqual, createHash } from "node:crypto";
import { z } from "zod";

export interface InstagramMessagingProvider {
  sendText(input: { accountId: string; recipientId: string; text: string; idempotencyKey: string }): Promise<{ externalId: string; raw: unknown }>;
  health(): Promise<{ ok: boolean; code: string; accountId?: string; username?: string }>;
  refreshToken?(): Promise<{ ok: boolean; expiresIn?: number }>;
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
    referral: z.record(z.string(), z.unknown()).optional(),
    read: z.object({ mid: z.string().optional(), watermark: z.number().optional() }).passthrough().optional(),
    delivery: z.object({ mids: z.array(z.string()).optional(), watermark: z.number().optional() }).passthrough().optional(),
  }).passthrough()).default([]) }).passthrough())
});

export type NormalizedInstagramEvent = { eventKind: "MESSAGE" | "DELIVERY" | "READ"; providerEventId: string; accountExternalId: string; senderId: string; recipientId: string; occurredAt: Date; text: string | null; mediaMetadata: unknown; referral: unknown; isEcho: boolean; relatedMessageIds: string[] };

export function normalizeMetaEvents(raw: unknown): NormalizedInstagramEvent[] {
  const parsed = metaWebhookSchema.parse(raw);
  return parsed.entry.flatMap((entry) => entry.messaging.flatMap((event): NormalizedInstagramEvent[] => {
    const occurredAt = new Date(event.timestamp ?? entry.time ?? Date.now());
    if (event.message?.mid) return [{ eventKind: "MESSAGE" as const, providerEventId: event.message.mid, accountExternalId: entry.id, senderId: event.sender.id, recipientId: event.recipient.id, occurredAt, text: event.message.text ?? null, mediaMetadata: event.message.attachments ?? event.message.reply_to ?? null, referral: event.referral ?? null, isEcho: event.message.is_echo === true, relatedMessageIds: [] }];
    if (event.delivery) { const mids = event.delivery.mids ?? []; return [{ eventKind: "DELIVERY" as const, providerEventId: `delivery:${entry.id}:${event.delivery.watermark ?? occurredAt.getTime()}:${mids.join(",")}`, accountExternalId: entry.id, senderId: event.sender.id, recipientId: event.recipient.id, occurredAt, text: null, mediaMetadata: null, referral: null, isEcho: false, relatedMessageIds: mids }]; }
    if (event.read) return [{ eventKind: "READ" as const, providerEventId: `read:${entry.id}:${event.read.mid ?? event.read.watermark ?? occurredAt.getTime()}`, accountExternalId: entry.id, senderId: event.sender.id, recipientId: event.recipient.id, occurredAt, text: null, mediaMetadata: null, referral: null, isEcho: false, relatedMessageIds: event.read.mid ? [event.read.mid] : [] }];
    return [];
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
    if (!response.ok || !raw.message_id) {
      const retryAfter = response.headers.get("retry-after");
      throw new Error(`META_SEND_${raw.error?.code ?? response.status}${retryAfter ? `_RETRY_${retryAfter}` : ""}`);
    }
    return { externalId: raw.message_id, raw };
  }
  async health() {
    const token = process.env.META_INSTAGRAM_ACCESS_TOKEN; const version = process.env.META_GRAPH_API_VERSION;
    if (!token) return { ok: false, code: "TOKEN_MISSING" };
    if (!version) return { ok: false, code: "GRAPH_VERSION_MISSING" };
    try {
      const response = await fetch(`https://graph.instagram.com/${version}/me?fields=id,username`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000), cache: "no-store" });
      const body = await response.json() as { id?: string; username?: string; error?: { code?: number } };
      return response.ok && body.id ? { ok: true, code: "CONNECTED", accountId: body.id, username: body.username } : { ok: false, code: `TOKEN_${body.error?.code ?? response.status}` };
    } catch { return { ok: false, code: "HEALTH_REQUEST_FAILED" }; }
  }
  async refreshToken() {
    const token = process.env.META_INSTAGRAM_ACCESS_TOKEN;
    if (!token) return { ok: false };
    const url = new URL("https://graph.instagram.com/refresh_access_token"); url.searchParams.set("grant_type", "ig_refresh_token"); url.searchParams.set("access_token", token);
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
    const body = await response.json() as { access_token?: string; expires_in?: number };
    // Environment secrets cannot safely be mutated by application code. Return status; an operator rotates the value in Vercel.
    return { ok: response.ok && Boolean(body.access_token), expiresIn: body.expires_in };
  }
}

export class MockInstagramProvider implements InstagramMessagingProvider {
  async sendText(input: { idempotencyKey: string }) { return { externalId: `mock_${createHash("sha256").update(input.idempotencyKey).digest("hex").slice(0, 28)}`, raw: { mock: true } }; }
  async health() { return { ok: true, code: "MOCK" }; }
}

export function getInstagramProvider(): InstagramMessagingProvider { return process.env.NODE_ENV === "production" ? new MetaInstagramProvider() : new MockInstagramProvider(); }
