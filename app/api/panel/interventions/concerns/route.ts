import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { INTERVENTION_RULE_VERSION } from "@/lib/intervention-rules";
import { raiseHumanConcern } from "@/lib/intervention-server";
import { guardMutation } from "@/lib/security/mutation-guard";

const schema = z.object({ studentId: z.string().trim().min(1).max(100) }).strict();

export async function POST(request: Request) {
  const auth = await requireApiOdRole("ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().interventionInbox) return NextResponse.json({ error: "Müdahale kutusu henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.interventions.raise-concern", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:intervention-concern:${auth.session.userId}`, rateLimit: { max: 30, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Öğrenci seçimi geçersiz." }, { status: 400 });

  const result = await raiseHumanConcern({ studentId: parsed.data.studentId, actorId: auth.session.userId, ...(auth.session.role === "TEACHER" ? { teacherId: auth.session.userId } : {}) });
  if (result.kind === "NOT_FOUND") return NextResponse.json({ error: "Öğrenci bulunamadı." }, { status: 404 });
  if (result.kind === "EXISTS") return NextResponse.json({ error: "Bu öğrenci için bu hafta insan tarafından verilen destek sinyali zaten var." }, { status: 409 });
  await recordPanelProductEvent({ name: "case_rule_triggered", properties: { ruleVersion: INTERVENTION_RULE_VERSION, reasonCode: result.reasonCode } }, auth.session.role);
  return NextResponse.json({ created: result.kind === "CREATED", caseId: result.caseId }, { status: result.kind === "CREATED" ? 201 : 200 });
}
