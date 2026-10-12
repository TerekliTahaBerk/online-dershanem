import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { orderRetryRevision, OrderRetryConflict } from "@/lib/panel/order-retry-core";
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
  const auth = await requireAdminApi({ stepUp: true });
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "order.provisioning.retry", userId: auth.session.userId, requireSameOrigin: true, headers: request.headers, rateLimit: { max: 20, windowMs: 60_000 } });
  if (!guard.ok) return mutationGuardResponse(guard);
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const body = z.object({ idempotencyKey: z.string().uuid(), expectedRevision: z.string().regex(/^[a-f0-9]{64}$/) }).safeParse(await request.json().catch(() => null));
  if (!body.success) return invalidApiInput();
  try {
    const result = await retryOrderProvisioningService({ actorUserId: auth.session.userId, orderId: params.data.id, ...body.data });
    if (!result.found) return NextResponse.json({ error: "Sipariş bulunamadı.", code: "NOT_FOUND" }, { status: 404, headers: PRIVATE_NO_STORE });
    return adminJson({ ok: true, outcome: result.outcome, ...describeProvisioningOutcome(result.outcome) });
  } catch (error) {
    if (error instanceof OrderRetryConflict) return adminJson({ error: error.message, code: error.code }, { status: 409 });
    throw error;
  }
}

/** Öğrenci 360'ın OD ve ODK siparişleri için ortak, dar sürüm okuması. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(); if (!auth.ok) return auth.response;
  const params = idParamsSchema.safeParse(await context.params); if (!params.success) return invalidApiInput();
  const select = { id: true, updatedAt: true };
  const [od, odk] = await Promise.all([prisma.odOrder.findUnique({ where: { id: params.data.id }, select }), prisma.odkOrder.findUnique({ where: { id: params.data.id }, select })]);
  return od || odk ? adminJson({ revision: orderRetryRevision((od ?? odk)!) }) : adminJson({ error: "Sipariş bulunamadı.", code: "NOT_FOUND" }, { status: 404 });
}
