import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { purchaseWebhookSchema } from "@/lib/validators";

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
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Yetkisiz istek." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = purchaseWebhookSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz webhook verisi." }, { status: 400 });
    }

    const existingEvent = parsed.data.providerReference
      ? await prisma.purchaseEvent.findFirst({
          where: { providerReference: parsed.data.providerReference },
          orderBy: { createdAt: "desc" }
        })
      : null;

    const purchase = parsed.data.purchaseId
      ? await prisma.purchaseIntent.findUnique({
          where: { id: parsed.data.purchaseId }
        })
      : existingEvent
        ? await prisma.purchaseIntent.findUnique({
            where: { id: existingEvent.purchaseIntentId }
          })
        : null;

    if (!purchase) {
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

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Webhook işlenemedi." }, { status: 500 });
  }
}
