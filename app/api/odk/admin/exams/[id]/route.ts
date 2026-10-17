import { NextResponse } from "next/server";
import { updateOdkExamSchedule } from "@/lib/odk/exam-commands-server";
import { requireApiStaffPermission } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { updateExamScheduleSchema } from "@/lib/odk/admin-schemas";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiStaffPermission("odk:exam:edit"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.exam.update", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:exam-update:${auth.session.userId}`, rateLimit: { max: 90, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = updateExamScheduleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Lütfen planlama alanlarını bir kez daha kontrol eder misiniz?" }, { status: 400 });
  const { id } = await context.params;
  return updateOdkExamSchedule(id, parsed.data, auth.session.userId);
}
