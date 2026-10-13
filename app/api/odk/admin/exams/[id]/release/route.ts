import { NextResponse } from "next/server";
import { requireApiRecentStaffStepUp } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { releaseCommitSchema } from "@/lib/odk/admin-schemas";
import { releaseOdkExam } from "@/lib/odk/exam-results-commands";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentStaffStepUp("odk:result:release"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.exam.release", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:release:${auth.session.userId}`, rateLimit: { max: 10, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const { id } = await context.params;
  const parsed = releaseCommitSchema.safeParse(await request.json().catch(() => ({})));
  return releaseOdkExam(id, parsed.success ? parsed.data : null, { userId: auth.session.userId, role: auth.session.role });
}
