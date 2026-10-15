import { NextResponse } from "next/server";
import { requireApiStaffPermission } from "@/lib/auth/api-guards";
import { scoreOdkExamCommand } from "@/lib/odk/exam-results-commands";
import { guardMutation } from "@/lib/security/mutation-guard";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";

/** Kalabalık sınıfta (yüzlerce öğrenci × 160 soru) puanlama/yeniden puanlama birkaç saniye sürer (Faz 7 ölçek testi). */
export const maxDuration = 60;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiStaffPermission("odk:result:score"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.exam.score", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:score:${auth.session.userId}`, rateLimit: { max: 10, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  return scoreOdkExamCommand(params.data.id, { userId: auth.session.userId, role: auth.session.role });
}
