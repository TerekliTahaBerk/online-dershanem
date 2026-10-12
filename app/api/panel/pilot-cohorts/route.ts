import { NextResponse } from "next/server";
import { z } from "zod";
import { adminJson, PRIVATE_NO_STORE, requireAdminApi } from "@/lib/panel/admin-api";
import { createPilotCohortService, PilotCohortError } from "@/lib/panel/pilot-cohort-service";
import { guardMutation } from "@/lib/security/mutation-guard";

const schema = z.object({ groupId: z.string().min(1).max(80), requestKey: z.string().uuid() }).strict();

/**
 * Pilot kohortu oluştur — web kontrolü ve mobil yönetim ekranı aynı uç.
 * Taze step-up; `requestKey` aktöre bağlı işlem anahtarı; kohort ve audit
 * makbuzu tek transaction'da (`createPilotCohortService`).
 */
export async function POST(request: Request) {
  const auth = await requireAdminApi({ stepUp: true });
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.pilot.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:pilot:${auth.session.userId}`, rateLimit: { max: 20, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403, headers: PRIVATE_NO_STORE });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return adminJson({ error: "Pilot grubu seçimini kontrol edin.", code: "VALIDATION" }, { status: 400 });
  try {
    return adminJson(await createPilotCohortService({ actorUserId: auth.session.userId, actorRole: auth.session.role, ...parsed.data }));
  } catch (error) {
    if (error instanceof PilotCohortError) return adminJson({ error: error.message, code: error.code }, { status: error.status });
    throw error;
  }
}
