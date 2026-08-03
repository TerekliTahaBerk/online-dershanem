import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeBusinessRequest } from "@/lib/business/permissions";
import { sendConversationMessage } from "@/lib/business/jobs";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const schema = z.object({ conversationId: z.string().cuid(), text: z.string().trim().min(1).max(1500), idempotencyKey: z.string().min(8).max(120) });
export async function POST(request: Request) {
  const access = await authorizeBusinessRequest("conversation:reply");
  if (!access) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const rate = await checkRateLimit(`ig-send:${access.session.userId}`, 30, 60_000);
  if (!rate.allowed) return NextResponse.json({ error: "Çok fazla istek." }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz mesaj." }, { status: 400 });
  try {
    const id = await sendConversationMessage({ ...parsed.data, senderType: "HUMAN" });
    void logAudit({ actorUserId: access.session.userId, entityType: "BusinessConversation", entityId: parsed.data.conversationId, action: "INSTAGRAM_MESSAGE_SENT", payload: { messageId: id } });
    return NextResponse.json({ id }, { status: 201 });
  } catch { return NextResponse.json({ error: "Mesaj gönderilemedi." }, { status: 502 }); }
}

