import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { publishRecoveryPackage } from "@/lib/recovery-package-server";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

const schema = z.object({ expectedVersion: z.number().int().min(1) }).strict();
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOdRole("TEACHER"); if (!auth.ok) return auth.response;
  const flags = getPanelFeatureFlags(); if (!flags.recoveryPackage) return NextResponse.json({ error: "Telafi paketi henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.recovery.publish", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:recovery-publish:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Paket sürümü geçersiz." }, { status: 400 }); const { id } = await context.params;
  const result = await publishRecoveryPackage({ packageId: id, teacherId: auth.session.userId, expectedVersion: parsed.data.expectedVersion, rebalancePlan: flags.adaptivePlan });
  if (result.kind === "NOT_FOUND") return NextResponse.json({ error: "Telafi paketi bulunamadı." }, { status: 404 });
  if (result.kind === "CONFLICT") return NextResponse.json({ error: "Paket başka bir sekmede değişti." }, { status: 409 });
  if (result.kind === "REPLAYED") return NextResponse.json({ published: true, planRebalanced: false, replayed: true });
  await recordPanelProductEvent({ name: "recovery_package_published", properties: { publishDelayMs: result.publishDelayMs, itemCount: result.itemCount, planRebalanced: result.planRebalanced } }, auth.session.role);
  return NextResponse.json({ published: true, planRebalanced: result.planRebalanced, replayed: false });
}
