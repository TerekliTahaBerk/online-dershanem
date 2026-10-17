import { NextResponse } from "next/server";
import { z } from "zod";
import { adminJson, PRIVATE_NO_STORE, requireAdminApi } from "@/lib/panel/admin-api";
import { ASSIGN_COACH_ERROR_MESSAGE, assignCoachService, CoachAssignmentConflict } from "@/lib/panel/coach-assignment-service";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";

const schema = z.object({
  studentId: z.string().min(1).max(191),
  coachId: z.string().min(1).max(191),
  cadenceDays: z.string().trim().regex(/^([1-9][0-9]{0,3})?$/).optional(),
  idempotencyKey: z.string().uuid().optional(),
  expectedRevision: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  overrideReason: z.string().max(500).optional(),
});

/**
 * Koç ata / devret (mobil, Faz 2.2) — web Server Action'ı
 * (`app/panel/yonetim/kocluk/actions.ts`) ile AYNI servis
 * (`assignCoachService`), AYNI yetki (ADMIN) ve hız sınırı. Kural hatası 422
 * + kararlı `code` (`student` | `coach` | `membership` | `capacity`).
 */
export async function POST(request: Request) {
  const auth = await requireAdminApi({ stepUp: true });
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "coaching.assign", userId: auth.session.userId, requireSameOrigin: true, headers: request.headers, rateLimit: { max: 60, windowMs: 60_000 } });
  if (!guard.ok) { const response = mutationGuardResponse(guard); response.headers.set("Cache-Control", PRIVATE_NO_STORE["Cache-Control"]); return response; }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Lütfen öğrenci ve koç seçin.", code: "VALIDATION" }, { status: 400, headers: PRIVATE_NO_STORE });
  if (/^Bearer\s+/i.test(request.headers.get("authorization") ?? "") && (!parsed.data.idempotencyKey || !parsed.data.expectedRevision)) return adminJson({ error: "Güvenli işlem bilgisi eksik görünüyor. Sayfayı yenileyip tekrar dener misiniz?", code: "PRECONDITION_REQUIRED" }, { status: 400 });
  try {
    const result = await assignCoachService({ actorUserId: auth.session.userId, ...parsed.data });
    if (!result.ok) return NextResponse.json({ error: ASSIGN_COACH_ERROR_MESSAGE[result.code], code: result.code.toUpperCase() }, { status: 422, headers: PRIVATE_NO_STORE });
    return adminJson(result);
  } catch (error) {
    if (error instanceof CoachAssignmentConflict) return adminJson({ error: error.message, code: error.code }, { status: 409 });
    throw error;
  }
}
