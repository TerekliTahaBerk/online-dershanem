import { NextResponse } from "next/server";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { adminJson, PRIVATE_NO_STORE, requireAdminApi } from "@/lib/panel/admin-api";
import { describeProvisioningOutcome, retryOrderProvisioningService } from "@/lib/panel/order-provisioning-service";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";

/**
 * Erişim açmayı yeniden dene (mobil, Faz 2.2) — web Server Action'ı ile AYNI
 * servis (`retryOrderProvisioningService`; idempotent provisioning, ödemeye
 * dokunmaz), AYNI yetki ve hız sınırı. Sonuç metni denetim kaydıyla aynıdır.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "order.provisioning.retry", userId: auth.session.userId, requireSameOrigin: true, headers: request.headers, rateLimit: { max: 20, windowMs: 60_000 } });
  if (!guard.ok) return mutationGuardResponse(guard);
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const result = await retryOrderProvisioningService({ actorUserId: auth.session.userId, orderId: params.data.id });
  if (!result.found) return NextResponse.json({ error: "Sipariş bulunamadı.", code: "NOT_FOUND" }, { status: 404, headers: PRIVATE_NO_STORE });
  return adminJson({ ok: true, outcome: result.outcome, ...describeProvisioningOutcome(result.outcome) });
}
