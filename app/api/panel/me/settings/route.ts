import { NextResponse } from "next/server";
import { requireApiActiveUser } from "@/lib/auth/api-guards";
import { firstIssueMessage } from "@/lib/auth/register-schema";
import { SETTINGS_REVISIONED, settingsRequestSchema } from "@/lib/account/settings-commands";
import { loadAccountSettings, runSettingsCommand } from "@/lib/account/settings-service";
import { CommandError } from "@/lib/panel/command-receipt";
import { PRIVATE_NO_STORE } from "@/lib/panel/parent-api";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";

/**
 * Hesap ayarları (P5.2 · C07/C08/C10/C11 okuma) — web `/panel/ayarlar`,
 * `/panel/erisilebilirlik`, `/panel/veri-kullanimi` ile AYNI kaynaklar.
 * Yazma: web Server Action'larıyla AYNI servis (`runSettingsCommand`).
 * Bearer istekleri işlem anahtarı, formu yeniden yazan komutlarda ayrıca
 * `expectedRevision` taşır. Erişilebilirlik / düşük veri tercihleri mevcut
 * PATCH uçlarıyla (`expectedVersion`) yazılır.
 */
const json = (body: unknown, init: ResponseInit = {}) => NextResponse.json(body, { ...init, headers: PRIVATE_NO_STORE });

export async function GET() {
  const auth = await requireApiActiveUser();
  if (!auth.ok) return auth.response;
  return json(await loadAccountSettings(auth.session));
}

export async function POST(request: Request) {
  const auth = await requireApiActiveUser();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "account.settings.native", userId: auth.session.userId, requireSameOrigin: true, headers: request.headers, rateLimitKey: `account:settings:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60_000 } });
  if (!guard.ok) {
    const response = mutationGuardResponse(guard);
    response.headers.set("Cache-Control", PRIVATE_NO_STORE["Cache-Control"]);
    return response;
  }
  const parsed = settingsRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: firstIssueMessage(parsed.error), code: "INVALID_INPUT" }, { status: 400 });
  const { command, idempotencyKey, expectedRevision } = parsed.data;
  if (/^Bearer\s+/i.test(request.headers.get("authorization") ?? "") && (!idempotencyKey || (SETTINGS_REVISIONED.has(command.type) && !expectedRevision))) {
    return json({ error: "Güvenli işlem bilgisi eksik. Görünümü yenileyin.", code: "PRECONDITION_REQUIRED" }, { status: 400 });
  }
  try {
    const { result, replayed } = await runSettingsCommand(auth.session, command, { idempotencyKey, expectedRevision });
    return json({ ...result, replayed });
  } catch (error) {
    if (error instanceof CommandError) return json({ error: error.message, code: error.code }, { status: error.status });
    throw error;
  }
}
