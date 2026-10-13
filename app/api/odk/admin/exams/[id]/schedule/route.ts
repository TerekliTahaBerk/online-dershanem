import { NextResponse } from "next/server";
import { scheduleOdkExam } from "@/lib/odk/exam-commands-server";
import { requireApiStaffPermission } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiStaffPermission("odk:exam:schedule"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.exam.schedule", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:exam-schedule:${auth.session.userId}`, rateLimit: { max: 30, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const { id } = params.data;
  return scheduleOdkExam(id, auth.session.userId);
}
