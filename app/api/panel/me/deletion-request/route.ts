import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiActiveUser } from "@/lib/auth/api-guards";
import { loadDeletionRequestStatus, requestAccountDeletion } from "@/lib/account/deletion-request";
import { CommandError } from "@/lib/panel/command-receipt";
import { PRIVATE_NO_STORE } from "@/lib/panel/parent-api";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";

/**
 * Uygulama içi hesap silme talebi (P5.3) — durum okuma ve talep oluşturma.
 * Talep hesabı silmez; DSR süreci insan onayıyla başlatılır
 * (`lib/account/deletion-request.ts`). Parola yeniden doğrulanır; Bearer
 * isteği işlem anahtarı taşır.
 */
const json = (body: unknown, init: ResponseInit = {}) => NextResponse.json(body, { ...init, headers: PRIVATE_NO_STORE });
const schema = z.object({ password: z.string().min(1).max(200), idempotencyKey: z.string().uuid().optional() }).strict();

export async function GET() {
  const auth = await requireApiActiveUser();
  if (!auth.ok) return auth.response;
  return json({ contractVersion: 1, ...(await loadDeletionRequestStatus(auth.session.userId)) });
}

export async function POST(request: Request) {
  const auth = await requireApiActiveUser();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "account.deletion.request", userId: auth.session.userId, requireSameOrigin: true, headers: request.headers, rateLimitKey: `account:deletion:${auth.session.userId}`, rateLimit: { max: 5, windowMs: 60 * 60_000 } });
  if (!guard.ok) {
    const response = mutationGuardResponse(guard);
    response.headers.set("Cache-Control", PRIVATE_NO_STORE["Cache-Control"]);
    return response;
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Parolanızı girin.", code: "INVALID_INPUT" }, { status: 400 });
  if (/^Bearer\s+/i.test(request.headers.get("authorization") ?? "") && !parsed.data.idempotencyKey) {
    return json({ error: "Güvenli işlem bilgisi eksik görünüyor. Sayfayı yenileyip tekrar dener misiniz?", code: "PRECONDITION_REQUIRED" }, { status: 400 });
  }
  try {
    const { result, replayed } = await requestAccountDeletion(auth.session, parsed.data);
    return json({ ...result, replayed });
  } catch (error) {
    if (error instanceof CommandError) return json({ error: error.message, code: error.code }, { status: error.status });
    throw error;
  }
}
