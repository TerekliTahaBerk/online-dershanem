import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";

const schema = z.object({ inAppEnabled: z.boolean(), emailEnabled: z.boolean(), whatsappEnabled: z.boolean(), lessonSummary: z.boolean(), absence: z.boolean(), assignment: z.boolean(), payment: z.boolean() });

export async function PATCH(request: Request) {
  const auth = await requireApiRole("PARENT", "STUDENT"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.notification_preferences", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:notification-prefs:${auth.session.userId}`, rateLimit: { max: 30, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Tercihleri kontrol edin." }, { status: 400 });
  await prisma.notificationPreference.upsert({ where: { userId: auth.session.userId }, create: { userId: auth.session.userId, ...parsed.data }, update: parsed.data });
  return NextResponse.json({ ok: true });
}
