import { NextResponse } from "next/server";
import { z } from "zod";
import { generateTeacherDigest } from "@/lib/panel/teacher-digests-server";
import { GroupMutationError } from "@/lib/panel/group-mutation-core";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";

const schema = z.object({ studentId: z.string().min(1) });
export async function POST(request: Request) {
  const auth = await requireApiOdRole("TEACHER"); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().parentWeeklyDigest) return NextResponse.json({ error: "Haftalık özet henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.weekly_digest.generate", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:digest-generate:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } }); if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Öğrenci seçimini kontrol edin." }, { status: 400 });
  try {
    const result = await generateTeacherDigest(parsed.data.studentId, auth.session.userId);
    return NextResponse.json({ id: result.digest.id, processedCount: 1, failedCount: 0 });
  } catch (error) {
    if (error instanceof GroupMutationError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    throw error;
  }
}
