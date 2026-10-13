import { NextResponse } from "next/server";
import { requireApiRecentStaffStepUp } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { rescoreSchema } from "@/lib/odk/admin-schemas";
import { rescoreOdkExamCommand } from "@/lib/odk/exam-results-commands";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentStaffStepUp("odk:key:revise"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.exam.rescore", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:rescore:${auth.session.userId}`, rateLimit: { max: 10, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const { id } = await context.params;
  const parsed = rescoreSchema.safeParse(await request.json().catch(() => ({})));
  return rescoreOdkExamCommand(id, parsed.success ? parsed.data : null, { userId: auth.session.userId, role: auth.session.role });
}
