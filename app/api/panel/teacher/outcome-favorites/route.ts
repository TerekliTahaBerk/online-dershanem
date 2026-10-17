import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { requireStaffApi, staffJson, staffFeatureDisabled } from "@/lib/panel/staff-api";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { guardMutation } from "@/lib/security/mutation-guard";

const schema = z.object({ outcomeId: z.string().min(1), favorite: z.boolean() });

export async function POST(request: Request) {
  const auth = /^Bearer\s+/i.test(request.headers.get("authorization") ?? "") ? await requireStaffApi("OD", "od:lesson:teach") : await requireApiOdRole("ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().learningOutcomes) return staffFeatureDisabled("Kazanım kataloğu şu an kullanıma kapalı, çok yakında açılacak.");
  const guard = await guardMutation({ action: "panel.outcome.favorite", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:outcome-favorite:${auth.session.userId}`, rateLimit: { max: 120, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Kazanım seçimi geçerli görünmüyor." }, { status: 400 });
  const outcome = await prisma.learningOutcome.findFirst({ where: { id: parsed.data.outcomeId, isActive: true, unit: { subject: { version: { status: "ACTIVE" } } } }, select: { id: true } });
  if (!outcome) return NextResponse.json({ error: "Aktif kazanım şu an görünmüyor." }, { status: 404 });
  if (parsed.data.favorite) await prisma.outcomeFavorite.upsert({ where: { userId_outcomeId: { userId: auth.session.userId, outcomeId: outcome.id } }, create: { userId: auth.session.userId, outcomeId: outcome.id }, update: {} });
  else await prisma.outcomeFavorite.deleteMany({ where: { userId: auth.session.userId, outcomeId: outcome.id } });
  return staffJson({ ok: true });
}
