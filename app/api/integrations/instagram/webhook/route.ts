import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { normalizeMetaEvents, verifyMetaSignature } from "@/lib/business/instagram";
import { persistInstagramEvent } from "@/lib/business/jobs";
import { log } from "@/lib/logger";

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
  const raw = await request.text();
  if (!verifyMetaSignature(raw, request.headers.get("x-hub-signature-256"))) return NextResponse.json({ error: "Geçersiz imza." }, { status: 401 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Geçersiz JSON." }, { status: 400 }); }
  try {
    const events = normalizeMetaEvents(body);
    await Promise.all(events.map((event) => persistInstagramEvent(event, event as unknown as Prisma.InputJsonValue)));
    log.info("instagram.webhook.persisted", { eventCount: events.length });
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    log.error("instagram.webhook.invalid", error);
    return NextResponse.json({ error: "Webhook işlenemedi." }, { status: 400 });
  }
}

