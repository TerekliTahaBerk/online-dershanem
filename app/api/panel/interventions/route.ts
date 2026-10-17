import { NextResponse } from "next/server";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { createInterventionRecord, interventionCreateSchema } from "@/lib/panel/intervention-write-server";

export async function POST(request: Request) {
  const auth = await requireApiOdRole("ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().interventionInbox) {
    return NextResponse.json({ error: "Müdahale kutusu şu an kullanıma kapalı, çok yakında açılacak." }, { status: 404 });
  }

  const guard = await guardMutation({
    action: "panel.interventions.create",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:intervention-create:${auth.session.userId}`,
    rateLimit: { max: 40, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  }

  const parsed = interventionCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Müdahale kaydı geçerli görünmüyor." }, { status: 400 });
  return createInterventionRecord(parsed.data, { userId: auth.session.userId, role: auth.session.role as "ADMIN" | "TEACHER" });
}
