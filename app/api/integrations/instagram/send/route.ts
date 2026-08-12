import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeBusinessRequest } from "@/lib/business/permissions";
import { sendConversationMessage } from "@/lib/business/jobs";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRateLimitKeyFromUser, rateLimitResponseHeaders } from "@/lib/security/rate-limit";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { guardMutation } from "@/lib/security/mutation-guard";
import { businessFlags } from "@/lib/business/flags";

const schema = z.object({ conversationId: z.string().cuid(), text: z.string().trim().min(1).max(1500), idempotencyKey: z.string().min(8).max(120) });
export async function POST(request: Request) {
  if (!businessFlags.instagram && process.env.NODE_ENV === "production") return NextResponse.json({ error: "Instagram entegrasyonu kapalı." }, { status: 503 });
  const access = await authorizeBusinessRequest("conversation:reply");
  if (!access) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const guard = await guardMutation({ action: "business.instagram.send", userId: access.session.userId, headers: request.headers, requireSameOrigin: true });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "ORIGIN" ? 403 : 429 });
  const rate = await checkRateLimit(getRateLimitKeyFromUser(access.session.userId, "instagram.send"), 30, 60_000);
  if (!rate.allowed) return NextResponse.json({ error: "Çok fazla istek.", code: "RATE_LIMIT" }, { status: 429, headers: rateLimitResponseHeaders(rate.retryAfterMs) });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz mesaj." }, { status: 400 });
  const conversation = await prisma.businessConversation.findFirst({ where: { id: parsed.data.conversationId, businessUnitId: { in: access.units.map((unit) => unit.id) } }, select: { id: true } });
  if (!conversation) return NextResponse.json({ error: "Konuşma bulunamadı." }, { status: 404 });
  try {
    const id = await sendConversationMessage({ ...parsed.data, senderType: "HUMAN" });
    void logAudit({ actorUserId: access.session.userId, entityType: "BusinessConversation", entityId: parsed.data.conversationId, action: "INSTAGRAM_MESSAGE_SENT", payload: { messageId: id } });
    return NextResponse.json({ id }, { status: 201 });
  } catch { return NextResponse.json({ error: "Mesaj gönderilemedi." }, { status: 502 }); }
}
