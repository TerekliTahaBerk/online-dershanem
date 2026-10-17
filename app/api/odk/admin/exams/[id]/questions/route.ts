import { NextResponse } from "next/server";
import { requireApiStaffPermission } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { updateQuestionsSchema } from "@/lib/odk/admin-schemas";
import { updateOdkExamQuestions } from "@/lib/odk/exam-commands-server";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiStaffPermission("odk:exam:edit"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.exam.questions.update", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:questions:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = updateQuestionsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Lütfen soru alanlarını bir kez daha kontrol eder misiniz?" }, { status: 400 });
  const { id } = await context.params;
  return updateOdkExamQuestions(id, parsed.data.questions, auth.session.userId, undefined, { expectedRevision: parsed.data.expectedRevision });
}
