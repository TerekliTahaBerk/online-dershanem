import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiStaffPermission } from "@/lib/auth/api-guards";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { integrityReviewSchema } from "@/lib/odk/admin-schemas";
import { reviewAttemptIntegrity } from "@/lib/odk/integrity-review-service";
import { loadOdkOpsAttempt } from "@/lib/odk/ops-console-server";
import { CommandError } from "@/lib/panel/command-receipt";
import { staffJson, PRIVATE_NO_STORE } from "@/lib/panel/staff-api";
import { guardMutation } from "@/lib/security/mutation-guard";

/**
 * K04 · Mobil bütünlük incelemesi — web `PATCH /api/odk/admin/attempts/[id]`
 * ile AYNI servis (`reviewAttemptIntegrity`) ve izin (`odk:integrity:review`).
 * Yalnız konsolun izlediği kayıtlar; işlem anahtarı ve okunan `expectedRevision`
 * zorunlu (eski görünüm 409, aynı anahtar ilk sonucu döndürür).
 */
const schema = integrityReviewSchema.extend({ idempotencyKey: z.string().uuid(), expectedRevision: z.string().regex(/^[a-f0-9]{64}$/) }).strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiStaffPermission("odk:integrity:review"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.attempt.integrity_review", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:integrity:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403, headers: PRIVATE_NO_STORE });
  const params = idParamsSchema.safeParse(await context.params); if (!params.success) return invalidApiInput();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "İnceleme işlemi, anahtar veya sürüm geçersiz.", code: "INVALID_INPUT" }, { status: 400, headers: PRIVATE_NO_STORE });
  if (!(await loadOdkOpsAttempt(params.data.id))) return NextResponse.json({ error: "Aradığınız kaydı bulamadık.", code: "NOT_FOUND" }, { status: 404, headers: PRIVATE_NO_STORE });
  const { idempotencyKey, expectedRevision, ...input } = parsed.data;
  try {
    const { result, replayed } = await reviewAttemptIntegrity(auth.session.userId, params.data.id, input, { idempotencyKey, expectedRevision });
    return staffJson({ ok: true, ...result, replayed });
  } catch (error) {
    if (error instanceof CommandError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers: PRIVATE_NO_STORE });
    throw error;
  }
}
