import { NextResponse } from "next/server";
import { requireApiRecentStaffStepUp, requireApiStaffPermission } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { answerKeyRevisionCommitSchema, answerKeyRevisionPreviewSchema } from "@/lib/odk/admin-schemas";
import { commitAnswerKeyRevision, previewAnswerKeyRevision } from "@/lib/odk/answer-key-revision-server";

/**
 * Kilitli denemede cevap anahtarı revizyonu (soru düzeltme / iptal).
 * POST: etki önizlemesi (yazmaz). PUT: onaylı revizyon + gerekiyorsa yeniden puanlama (step-up).
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiStaffPermission("odk:key:revise"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.answer_key.revision_preview", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:akr-preview:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const parsed = answerKeyRevisionPreviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revizyon değişiklikleri geçersiz." }, { status: 400 });
  return previewAnswerKeyRevision(params.data.id, parsed.data);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentStaffStepUp("odk:key:revise"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.answer_key.revision_commit", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:akr-commit:${auth.session.userId}`, rateLimit: { max: 10, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const parsed = answerKeyRevisionCommitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revizyon için değişiklik, en az 10 karakterlik gerekçe ve önizleme hash'i gerekli." }, { status: 400 });
  return commitAnswerKeyRevision(params.data.id, parsed.data, { userId: auth.session.userId, role: auth.session.role });
}
