import { invalidApiInput } from "@/lib/api/input-validation";
import { businessJson, requireBusinessApi } from "@/lib/business/api-guard";
import { CRM_REVISIONED, crmPermission, crmRequestSchema } from "@/lib/business/crm-commands";
import { CrmError, runCrmCommand } from "@/lib/business/crm-service";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";
import { PRIVATE_NO_STORE } from "@/lib/panel/parent-api";

/**
 * İşletme CRM komutu (P2.7b) — web Server Action'larıyla AYNI servis
 * (`runCrmCommand`), AYNI izin (`crmPermission`) ve iş birimi kapsamı.
 * Bearer istekleri işlem anahtarı, kaydı değiştiren komutlarda ayrıca
 * `expectedRevision` taşır. Kural hataları kararlı `code` ile döner.
 */
export async function POST(request: Request) {
  const parsed = crmRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidApiInput();
  const { command, idempotencyKey, expectedRevision } = parsed.data;
  const auth = await requireBusinessApi(crmPermission(command.type));
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: `business.crm.${command.type}`, userId: auth.access.session.userId, requireSameOrigin: true, headers: request.headers, rateLimit: { max: 60, windowMs: 60_000 } });
  if (!guard.ok) {
    const response = mutationGuardResponse(guard);
    response.headers.set("Cache-Control", PRIVATE_NO_STORE["Cache-Control"]);
    return response;
  }
  if (/^Bearer\s+/i.test(request.headers.get("authorization") ?? "") && (!idempotencyKey || (CRM_REVISIONED.has(command.type) && !expectedRevision))) {
    return businessJson({ error: "Güvenli işlem bilgisi eksik görünüyor. Sayfayı yenileyip tekrar dener misiniz?", code: "PRECONDITION_REQUIRED" }, { status: 400 });
  }
  try {
    return businessJson(await runCrmCommand(auth.access, command, { idempotencyKey, expectedRevision }));
  } catch (error) {
    if (error instanceof CrmError) return businessJson({ error: error.message, code: error.code }, { status: error.status });
    throw error;
  }
}
