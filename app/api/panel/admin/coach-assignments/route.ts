import { NextResponse } from "next/server";
import { z } from "zod";
import { adminJson, PRIVATE_NO_STORE, requireAdminApi } from "@/lib/panel/admin-api";
import { ASSIGN_COACH_ERROR_MESSAGE, assignCoachService } from "@/lib/panel/coach-assignment-service";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";

const schema = z.object({
  studentId: z.string().min(1).max(191),
  coachId: z.string().min(1).max(191),
  cadenceDays: z.string().trim().max(4).optional(),
  overrideReason: z.string().max(500).optional(),
});

/**
 * Koç ata / devret (mobil, Faz 2.2) — web Server Action'ı
 * (`app/panel/yonetim/kocluk/actions.ts`) ile AYNI servis
 * (`assignCoachService`), AYNI yetki (ADMIN) ve hız sınırı. Kural hatası 422
 * + kararlı `code` (`student` | `coach` | `membership` | `capacity`).
 */
export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "coaching.assign", userId: auth.session.userId, requireSameOrigin: true, headers: request.headers, rateLimit: { max: 60, windowMs: 60_000 } });
  if (!guard.ok) return mutationGuardResponse(guard);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Öğrenci ve koç seçin.", code: "VALIDATION" }, { status: 400, headers: PRIVATE_NO_STORE });
  const result = await assignCoachService({ actorUserId: auth.session.userId, ...parsed.data });
  if (!result.ok) return NextResponse.json({ error: ASSIGN_COACH_ERROR_MESSAGE[result.code], code: result.code.toUpperCase() }, { status: 422, headers: PRIVATE_NO_STORE });
  return adminJson({ ok: true });
}
