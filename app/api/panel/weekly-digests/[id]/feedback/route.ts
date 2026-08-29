import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

const schema = z.object({ helpful: z.boolean().nullable(), anxietyPulse: z.number().int().min(1).max(5).nullable() }).refine((value) => value.helpful !== null || value.anxietyPulse !== null);
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOdRole("STUDENT", "PARENT"); if (!auth.ok) return auth.response;
  const viewerRole = auth.session.role === "STUDENT" ? "STUDENT" as const : "PARENT" as const;
  if (!getPanelFeatureFlags().parentWeeklyDigest) return NextResponse.json({ error: "Haftalık özet henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.weekly_digest.feedback", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:digest-feedback:${auth.session.userId}`, rateLimit: { max: 30, windowMs: 15 * 60 * 1000 } }); if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Geri bildirimi kontrol edin." }, { status: 400 }); const { id } = await context.params;
  const digest = await prisma.weeklyDigest.findFirst({ where: { id, status: "PUBLISHED", student: auth.session.role === "STUDENT" ? { userId: auth.session.userId } : { parents: { some: { parentId: auth.session.userId } } } }, select: { id: true } }); if (!digest) return NextResponse.json({ error: "Özet bulunamadı." }, { status: 404 });
  await prisma.weeklyDigestFeedback.upsert({ where: { digestId_userId: { digestId: id, userId: auth.session.userId } }, create: { digestId: id, userId: auth.session.userId, viewerRole, ...parsed.data }, update: parsed.data });
  await recordPanelProductEvent({ name: "weekly_digest_feedback", properties: { actorRole: viewerRole, ...parsed.data } }, auth.session.role); return NextResponse.json({ saved: true });
}
