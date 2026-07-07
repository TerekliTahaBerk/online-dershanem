import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { purchaseWebhookSchema } from "@/lib/validators";
import { logAudit } from "@/lib/audit";
import { log } from "@/lib/logger";

/**
 * @deprecated Sprint 5 (FAZ 1) itibarıyla — OD/ODK PayTR akışı **artık** unified
 * `/api/paytr/callback` üzerinden yürür. Bu endpoint sadece eski entegrasyonlar
 * (lead-style PurchaseIntent) için backward-compat amacıyla tutuluyor.
 *
 * Yeni satın alma akışlarında:
 *   - OD  → /api/od/checkout/start  → /api/paytr/callback (handleOd)
 *   - ODK → /api/odk/checkout/...   → /api/paytr/callback (handleOdk)
 *
 * Her çağrıda WARN log atılır. İlerideki sprintlerde bu endpoint kaldırılacaktır.
 * Source of truth: `app/api/paytr/callback/route.ts`.
 */

function isAuthorized(request: Request) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;

  if (!secret) {
    return false;
  }

  const headerValue =
    request.headers.get("x-payment-webhook-secret") ??
    request.headers.get("authorization")?.replace("Bearer ", "");

  return headerValue === secret;
}

export async function POST(request: Request) {
  log.warn("webhook.purchase.deprecated_call", {
    ua: request.headers.get("user-agent") ?? null,
    referer: request.headers.get("referer") ?? null,
    hint: "Use /api/paytr/callback instead. This endpoint will be removed in a future sprint.",
  });

  if (!isAuthorized(request)) {
    log.warn("webhook.purchase.unauthorized", { ua: request.headers.get("user-agent") ?? null });
    return NextResponse.json({ error: "Yetkisiz istek." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = purchaseWebhookSchema.safeParse(body);

    if (!parsed.success) {
      log.warn("webhook.purchase.invalid_payload", { issues: parsed.error.issues.slice(0, 5) });
      return NextResponse.json({ error: "Geçersiz webhook verisi." }, { status: 400 });
    }

    const existingEvent = parsed.data.providerReference
      ? await prisma.purchaseEvent.findFirst({
          where: { providerReference: parsed.data.providerReference },
          orderBy: { createdAt: "desc" }
        })
      : null;

    // P0: idempotency guard — PayTR re-delivers the same notification 2-3 times.
    if (existingEvent) {
      log.debug("webhook.purchase.duplicate_ignored", { providerReference: parsed.data.providerReference });
      return NextResponse.json({ ok: true });
    }

    const purchase = parsed.data.purchaseId
      ? await prisma.purchaseIntent.findUnique({
          where: { id: parsed.data.purchaseId }
        })
      : null;

    if (!purchase) {
      log.warn("webhook.purchase.intent_not_found", { purchaseId: parsed.data.purchaseId });
      return NextResponse.json({ error: "Satın alma kaydı bulunamadı." }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.purchaseIntent.update({
        where: { id: purchase.id },
        data: {
          status: parsed.data.status
        }
      }),
      prisma.purchaseEvent.create({
        data: {
          purchaseIntentId: purchase.id,
          eventType: parsed.data.eventType,
          status: parsed.data.status,
          source: purchase.source,
          packageName: purchase.packageName,
          paymentLink: purchase.paymentLink,
          provider: parsed.data.provider,
          providerReference: parsed.data.providerReference,
          payload: parsed.data.payload as Prisma.InputJsonValue | undefined
        }
      })
    ]);

    log.info("webhook.purchase.processed", {
      purchaseId: purchase.id,
      status: parsed.data.status,
      eventType: parsed.data.eventType,
      provider: parsed.data.provider,
    });
    void logAudit({
      actorUserId: null,
      actorType: "SYSTEM",
      entityType: "PurchaseIntent",
      entityId: purchase.id,
      action: `WEBHOOK_${parsed.data.eventType}`,
      summary: `${parsed.data.provider ?? "?"} → ${parsed.data.status}`,
      payload: { providerReference: parsed.data.providerReference },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error("webhook.purchase.unhandled", err);
    return NextResponse.json({ error: "Webhook işlenemedi." }, { status: 500 });
  }
}
