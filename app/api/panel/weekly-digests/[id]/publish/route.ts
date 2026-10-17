import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { publishTeacherDigest } from "@/lib/panel/teacher-digests-server";
import { GroupMutationError } from "@/lib/panel/group-mutation-core";

const schema = z.object({ expectedVersion: z.number().int().min(1) });
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOdRole("TEACHER"); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().parentWeeklyDigest) return NextResponse.json({ error: "Haftalık özet şu an kullanıma kapalı, çok yakında açılacak." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.weekly_digest.publish", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:digest-publish:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } }); if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Özet sürümü geçerli görünmüyor." }, { status: 400 }); const { id } = await context.params;
  try { return NextResponse.json(await publishTeacherDigest(id, parsed.data.expectedVersion, auth.session.userId)); }
  catch (error) { if (error instanceof GroupMutationError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status }); throw error; }
}
