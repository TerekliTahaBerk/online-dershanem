import { NextResponse } from "next/server";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { transitionOdkPilotSchema, transitionOdkPilot } from "@/lib/odk/pilot-commands-server";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.pilot.transition", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:pilot-transition:${auth.session.userId}`, rateLimit: { max: 20, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const params = idParamsSchema.safeParse(await context.params); if (!params.success) return invalidApiInput();
  const parsed = transitionOdkPilotSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Lütfen pilot geçişini bir kez daha kontrol eder misiniz?" }, { status: 400 });
  try { return await transitionOdkPilot(params.data.id, parsed.data, auth.session.userId); }
  catch (error) { if (typeof error === "object" && error && "code" in error && ["P2002", "P2034"].includes(String(error.code))) return NextResponse.json({ error: "Pilot durumu bu arada değişmiş. Sayfayı yenileyip tekrar deneyebilirsiniz." }, { status: 409 }); throw error; }
}
