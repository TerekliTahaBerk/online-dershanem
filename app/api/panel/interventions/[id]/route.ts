import { z } from "zod";
import { NextResponse } from "next/server";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { updateInterventionRecord, interventionUpdateSchema } from "@/lib/panel/intervention-write-server";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOdRole("ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().interventionInbox) return NextResponse.json({ error: "Müdahale kutusu henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.interventions.update", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:intervention-update:${auth.session.userId}`, rateLimit: { max: 100, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = interventionUpdateSchema.safeParse(await request.json().catch(() => null));
  const params = z.object({ id: z.string().min(1).max(100) }).safeParse(await context.params);
  if (!parsed.success || !params.success) return NextResponse.json({ error: "Müdahale işlemi geçersiz." }, { status: 400 });
  return updateInterventionRecord(params.data.id, parsed.data, { userId: auth.session.userId, role: auth.session.role as "ADMIN" | "TEACHER" });
}
