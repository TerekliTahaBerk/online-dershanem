import { NextResponse } from "next/server";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { generateInterventionCases } from "@/lib/intervention-server";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { INTERVENTION_RULE_VERSION } from "@/lib/intervention-rules";

export async function POST(request: Request) {
  const auth = await requireApiOdRole("ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().interventionInbox) return NextResponse.json({ error: "Müdahale kutusu henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.interventions.generate", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:interventions-generate:${auth.session.userId}`, rateLimit: { max: 20, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const result = await generateInterventionCases(auth.session.role === "TEACHER" ? { teacherId: auth.session.userId } : {});
  for (const signal of result.triggered) await recordPanelProductEvent({ name: "case_rule_triggered", properties: { ruleVersion: INTERVENTION_RULE_VERSION, reasonCode: signal.reasonCode } }, auth.session.role);
  return NextResponse.json({ createdCount: result.created.length, reactivatedCount: result.reactivatedCount, evaluatedStudentCount: result.evaluatedStudentCount });
}
