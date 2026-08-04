import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { normalizeMetaEvents, verifyMetaSignature } from "@/lib/business/instagram";
import { persistInstagramEvent } from "@/lib/business/jobs";
import { log } from "@/lib/logger";
import { businessFlags } from "@/lib/business/flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode") || "";
  const token = url.searchParams.get("hub.verify_token") || "";
  const challenge = url.searchParams.get("hub.challenge") || "";
  const expected = process.env.META_VERIFY_TOKEN || "";
  if (mode !== "subscribe" || !expected || !safeEqual(token, expected)) return new NextResponse("Forbidden", { status: 403 });
  return new NextResponse(challenge, { status: 200, headers: { "content-type": "text/plain" } });
}

export async function POST(request: Request) {
  if (!businessFlags.instagram) return NextResponse.json({ error: "Entegrasyon kapalı." }, { status: 503 });
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID(); const started = Date.now();
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 1_000_000) return NextResponse.json({ error: "İstek çok büyük." }, { status: 413 });
  const raw = await request.text();
  if (raw.length > 1_000_000) return NextResponse.json({ error: "İstek çok büyük." }, { status: 413 });
  if (!verifyMetaSignature(raw, request.headers.get("x-hub-signature-256"))) return NextResponse.json({ error: "Geçersiz imza." }, { status: 401 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Geçersiz JSON." }, { status: 400 }); }
  try {
    const events = normalizeMetaEvents(body);
    if (events.some((event) => event.occurredAt.getTime() > Date.now() + 5 * 60_000)) return NextResponse.json({ error: "Geçersiz olay zamanı." }, { status: 400 });
    await Promise.all(events.map((event) => persistInstagramEvent(event, event as unknown as Prisma.InputJsonValue)));
    log.info("instagram.webhook.persisted", { requestId, eventCount: events.length, latency: Date.now() - started });
    return new NextResponse("EVENT_RECEIVED", { status: 200, headers: { "x-request-id": requestId } });
  } catch (error) {
    log.error("instagram.webhook.invalid", error, { requestId, latency: Date.now() - started });
    return NextResponse.json({ error: "Webhook işlenemedi." }, { status: 400 });
  }
}
