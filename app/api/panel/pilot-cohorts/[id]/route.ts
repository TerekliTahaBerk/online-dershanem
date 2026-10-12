import { NextResponse } from "next/server";
import { z } from "zod";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { adminJson, PRIVATE_NO_STORE, requireAdminApi } from "@/lib/panel/admin-api";
import { PilotCohortError, transitionPilotCohortService } from "@/lib/panel/pilot-cohort-service";
import { guardMutation } from "@/lib/security/mutation-guard";

const schema = z.object({ action: z.enum(["ACTIVATE", "PAUSE", "RESUME", "COMPLETE", "ROLLBACK"]), expectedVersion: z.number().int().positive(), stopReason: z.enum(["GUARDRAIL_BREACH", "SECURITY_INCIDENT", "DATA_QUALITY", "OPERATIONAL", "MANUAL_COMPLETION"]).optional(), idempotencyKey: z.string().uuid().optional() }).strict();

/**
 * Pilot yaşam döngüsü geçişi — web ve mobil aynı uç. Taze step-up,
 * `expectedVersion` (eski görünüm 409), Bearer isteklerinde zorunlu
 * `idempotencyKey`; durum ve audit makbuzu tek transaction'da.
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi({ stepUp: true });
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.pilot.transition", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:pilot-transition:${auth.session.userId}`, rateLimit: { max: 30, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403, headers: PRIVATE_NO_STORE });
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return adminJson({ error: "Pilot geçişini kontrol edin.", code: "VALIDATION" }, { status: 400 });
  if (/^Bearer\s+/i.test(request.headers.get("authorization") ?? "") && !parsed.data.idempotencyKey) return adminJson({ error: "Güvenli işlem bilgisi eksik. Görünümü yenileyin.", code: "PRECONDITION_REQUIRED" }, { status: 400 });
  try {
    const result = await transitionPilotCohortService({ actorUserId: auth.session.userId, actorRole: auth.session.role, cohortId: params.data.id, ...parsed.data });
    return adminJson(result);
  } catch (error) {
    if (error instanceof PilotCohortError) return adminJson({ error: error.message, code: error.code, ...(error.checks ? { checks: error.checks } : {}) }, { status: error.status });
    throw error;
  }
}
