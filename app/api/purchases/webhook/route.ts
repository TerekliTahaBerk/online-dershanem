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

    const purchase =
      parsed.data.purchaseId
        ? await prisma.purchaseSubmission.findUnique({
            where: { id: parsed.data.purchaseId }
          })
        : parsed.data.providerReference
          ? await prisma.purchaseSubmission.findUnique({
              where: { providerReference: parsed.data.providerReference }
            })
          : null;

    if (!purchase) {
      return NextResponse.json({ error: "Satın alma kaydı bulunamadı." }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.purchaseSubmission.update({
        where: { id: purchase.id },
        data: {
          status: parsed.data.status,
          provider: parsed.data.provider,
          providerReference: parsed.data.providerReference ?? purchase.providerReference
        }
      }),
      prisma.purchaseWebhookEvent.create({
        data: {
          purchaseId: purchase.id,
          provider: parsed.data.provider,
          eventType: parsed.data.eventType,
          status: parsed.data.status,
          providerReference: parsed.data.providerReference,
          amount: parsed.data.amount,
          currency: parsed.data.currency,
          payload: parsed.data.payload as Prisma.InputJsonValue | undefined
        }
      })
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Webhook işlenemedi." }, { status: 500 });
  }
}
