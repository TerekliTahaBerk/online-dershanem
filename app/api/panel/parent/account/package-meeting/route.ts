import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAccountRole } from "@/lib/auth/api-guards";
import { CommandError } from "@/lib/panel/command-receipt";
import { PRIVATE_NO_STORE } from "@/lib/panel/parent-api";
import { requestParentPackageMeeting } from "@/lib/panel/parent-package-meeting";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";

/**
 * Veli · paket değişikliği görüşme talebi (V10) — web Server Action'ıyla
 * AYNI servis ve hız sınırı. Bearer istekleri işlem anahtarı taşır; aynı
 * anahtar ikinci talep açmaz.
 */
const json = (body: unknown, init: ResponseInit = {}) => NextResponse.json(body, { ...init, headers: PRIVATE_NO_STORE });
const schema = z.object({ studentId: z.string().regex(/^[\w-]{1,64}$/), idempotencyKey: z.string().uuid().optional() }).strict();

export async function POST(request: Request) {
  const auth = await requireApiAccountRole("PARENT");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "parent.package.meeting", userId: auth.session.userId, requireSameOrigin: true, headers: request.headers, rateLimit: { max: 5, windowMs: 60 * 60_000 } });
  if (!guard.ok) {
    const response = mutationGuardResponse(guard);
    response.headers.set("Cache-Control", PRIVATE_NO_STORE["Cache-Control"]);
    return response;
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Talep bilgisi geçerli görünmüyor.", code: "INVALID_INPUT" }, { status: 400 });
  if (/^Bearer\s+/i.test(request.headers.get("authorization") ?? "") && !parsed.data.idempotencyKey) {
    return json({ error: "Güvenli işlem bilgisi eksik görünüyor. Sayfayı yenileyip tekrar dener misiniz?", code: "PRECONDITION_REQUIRED" }, { status: 400 });
  }
  try {
    const { result, replayed } = await requestParentPackageMeeting(auth.session, parsed.data.studentId, parsed.data.idempotencyKey);
    return json({ ...result, replayed });
  } catch (error) {
    if (error instanceof CommandError) return json({ error: error.message, code: error.code }, { status: error.status });
    throw error;
  }
}
