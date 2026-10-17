import { NextResponse } from "next/server";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { createOdkPilotSchema, createOdkPilot, replayOdkPilot } from "@/lib/odk/pilot-commands-server";
import { GroupMutationError } from "@/lib/panel/group-mutation-core";
export async function POST(request: Request) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.pilot.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:pilot:${auth.session.userId}`, rateLimit: { max: 10, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = createOdkPilotSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Lütfen pilot adı ve katılımcı seçimini bir kez daha kontrol eder misiniz?" }, { status: 400 });
  try { return await createOdkPilot(parsed.data, auth.session.userId); }
  catch (error) {
    if (error instanceof GroupMutationError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (typeof error === "object" && error && "code" in error && ["P2002", "P2034"].includes(String(error.code))) {
      try { const replay = await replayOdkPilot(parsed.data, auth.session.userId); if (replay) return replay; } catch (conflict) { if (conflict instanceof GroupMutationError) return NextResponse.json({ error: conflict.message }, { status: conflict.status }); throw conflict; }
      return NextResponse.json({ error: "Pilot durumu bu arada değişmiş. Sayfayı yenileyip tekrar deneyebilirsiniz." }, { status: 409 });
    }
    throw error;
  }
}
