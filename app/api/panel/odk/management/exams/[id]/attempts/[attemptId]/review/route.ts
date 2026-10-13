import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiStaffPermission } from "@/lib/auth/api-guards";
import { invalidApiInput } from "@/lib/api/input-validation";
import { integrityReviewSchema } from "@/lib/odk/admin-schemas";
import { reviewAttemptIntegrity } from "@/lib/odk/integrity-review-service";
import { loadOdkOpsAttempt } from "@/lib/odk/ops-console-server";
import { CommandError } from "@/lib/panel/command-receipt";
import { staffJson, PRIVATE_NO_STORE } from "@/lib/panel/staff-api";
import { guardMutation } from "@/lib/security/mutation-guard";

/** K03 bütünlük sekmesi — inceleme (K04 ile aynı servis; yalnız bu denemenin kaydı). */
const paramsSchema = z.object({ id: z.string().regex(/^[\w-]{1,64}$/), attemptId: z.string().regex(/^[\w-]{1,64}$/) });
const schema = integrityReviewSchema.extend({ idempotencyKey: z.string().uuid(), expectedRevision: z.string().regex(/^[a-f0-9]{64}$/) }).strict();

export async function POST(request: Request, context: { params: Promise<{ id: string; attemptId: string }> }) {
  const auth = await requireApiStaffPermission("odk:integrity:review"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.attempt.integrity_review", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:integrity:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403, headers: PRIVATE_NO_STORE });
  const params = paramsSchema.safeParse(await context.params); if (!params.success) return invalidApiInput();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "İnceleme işlemi, anahtar veya sürüm geçersiz.", code: "INVALID_INPUT" }, { status: 400, headers: PRIVATE_NO_STORE });
  if (!(await loadOdkOpsAttempt(params.data.attemptId, new Date(), { examId: params.data.id }))) return NextResponse.json({ error: "Kayıt bulunamadı.", code: "NOT_FOUND" }, { status: 404, headers: PRIVATE_NO_STORE });
  const { idempotencyKey, expectedRevision, ...input } = parsed.data;
  try {
    const { result, replayed } = await reviewAttemptIntegrity(auth.session.userId, params.data.attemptId, input, { idempotencyKey, expectedRevision });
    return staffJson({ ok: true, ...result, replayed });
  } catch (error) {
    if (error instanceof CommandError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers: PRIVATE_NO_STORE });
    throw error;
  }
}
