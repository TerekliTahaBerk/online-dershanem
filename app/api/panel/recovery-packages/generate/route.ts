import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { generateRecoveryPackage } from "@/lib/recovery-package-server";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

const schema = z.object({ attendanceId: z.string().min(1).max(100) }).strict();
export async function POST(request: Request) {
  const auth = await requireApiOdRole("TEACHER"); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().recoveryPackage) return NextResponse.json({ error: "Telafi paketi henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.recovery.generate", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:recovery-generate:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Devamsızlık kaydı geçersiz." }, { status: 400 });
  const result = await generateRecoveryPackage(parsed.data.attendanceId, auth.session.userId); if (!result) return NextResponse.json({ error: "Uygun devamsızlık kaydı bulunamadı." }, { status: 404 });
  const items = result.package.items;
  await recordPanelProductEvent({ name: "recovery_package_generated", properties: { ruleVersion: "recovery-v1", itemCount: items.length, hasMaterial: items.some((item) => item.kind === "MATERIAL"), hasAssignment: items.some((item) => item.kind === "ASSIGNMENT"), reused: result.reused } }, auth.session.role);
  return NextResponse.json({ id: result.package.id, reused: result.reused });
}
