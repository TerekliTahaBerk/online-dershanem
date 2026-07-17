import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";

export async function POST(request: Request) {
  const auth = await requireApiRole("PARENT", "STUDENT"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.notifications.read", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:notifications:read:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  await prisma.notification.updateMany({ where: { userId: auth.session.userId, readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
