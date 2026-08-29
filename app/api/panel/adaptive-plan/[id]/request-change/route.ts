import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

const schema = z.object({ category: z.enum(["TOO_MUCH", "WRONG_DAYS", "PRIORITY", "OTHER"]), expectedVersion: z.number().int().min(1) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("OK", "STUDENT");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().adaptivePlan) return NextResponse.json({ error: "Haftalık plan henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.adaptive_plan.request_change", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:plan-change:${auth.session.userId}`, rateLimit: { max: 20, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Değişiklik nedenini kontrol edin." }, { status: 400 });
  const { id } = await context.params;
  const updated = await prisma.weeklyPlan.updateMany({ where: { id, version: parsed.data.expectedVersion, status: "APPROVED", student: { userId: auth.session.userId } }, data: { status: "CHANGE_REQUESTED", changeRequestCategory: parsed.data.category, version: { increment: 1 } } });
  if (updated.count !== 1) return NextResponse.json({ error: "Onaylı plan bulunamadı veya plan değişti." }, { status: 409 });
  await recordPanelProductEvent({ name: "plan_change_requested", properties: { category: parsed.data.category } }, auth.session.role);
  return NextResponse.json({ requested: true });
}
