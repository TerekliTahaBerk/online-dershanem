import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { generateCalmDigest } from "@/lib/calm-weekly-digest-server";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

const schema = z.object({ studentId: z.string().min(1) });
export async function POST(request: Request) {
  const auth = await requireApiOdRole("TEACHER"); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().parentWeeklyDigest) return NextResponse.json({ error: "Haftalık özet henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.weekly_digest.generate", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:digest-generate:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } }); if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Öğrenci seçimini kontrol edin." }, { status: 400 });
  const allowed = await prisma.studentProfile.findFirst({ where: { id: parsed.data.studentId, enrollments: { some: { endedAt: null, group: { isActive: true, teacherId: auth.session.userId } } } }, select: { id: true } }); if (!allowed) return NextResponse.json({ error: "Öğrenci bulunamadı." }, { status: 404 });
  const result = await generateCalmDigest(allowed.id, auth.session.userId);
  await recordPanelProductEvent({ name: "weekly_digest_generated", properties: { ruleVersion: "calm-digest-v1", trendBand: result.digest.trendBand as "IMPROVING" | "STEADY" | "BUILDING" | "LIMITED_DATA", reused: result.reused } }, auth.session.role);
  return NextResponse.json({ id: result.digest.id, reused: result.reused });
}
