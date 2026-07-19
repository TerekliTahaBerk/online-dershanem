import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { generateInterventionCases } from "@/lib/intervention-server";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

export async function POST(request: Request) {
  const auth = await requireApiRole("ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().interventionInbox) return NextResponse.json({ error: "Müdahale kutusu henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.interventions.generate", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:interventions-generate:${auth.session.userId}`, rateLimit: { max: 20, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const result = await generateInterventionCases(auth.session.role === "TEACHER" ? { teacherId: auth.session.userId } : {});
  for (const row of result.created) await recordPanelProductEvent({ name: "case_rule_triggered", properties: { ruleVersion: "intervention-v1", reasonCode: row.reasonCode } }, auth.session.role);
  return NextResponse.json({ createdCount: result.created.length, reactivatedCount: result.reactivatedCount, evaluatedStudentCount: result.evaluatedStudentCount });
}
