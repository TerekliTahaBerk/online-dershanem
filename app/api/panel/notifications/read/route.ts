import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";

const schema = z.object({ id: z.string().min(1).optional() });

export async function POST(request: Request) {
  const auth = await requireApiRole("ADMIN", "TEACHER", "PARENT", "STUDENT"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.notifications.read", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:notifications:read:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Bildirim bilgisi geçersiz." }, { status: 400 });
  const result = await prisma.notification.updateMany({
    where: { userId: auth.session.userId, readAt: null, ...(parsed.data.id ? { id: parsed.data.id } : {}) },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true, count: result.count });
}
