import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { purchaseEventSchema } from "@/lib/forms";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = purchaseEventSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          ok: false,
          errors: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    const { purchaseIntentId, ...data } = parsed.data;

    const event = await prisma.purchaseEvent.create({
      data: {
        ...data,
        payload: data.payload as Prisma.InputJsonValue | undefined,
        ...(purchaseIntentId
          ? {
              purchaseIntent: {
                connect: {
                  id: purchaseIntentId
                }
              }
            }
          : {})
      }
    });

    if (purchaseIntentId && parsed.data.status) {
      await prisma.purchaseIntent.update({
        where: {
          id: purchaseIntentId
        },
        data: {
          status: parsed.data.status
        }
      });
    }

    return Response.json({
      ok: true,
      id: event.id
    });
  } catch {
    return Response.json(
      {
        ok: false,
        message: "Satın alma olayı kaydedilemedi."
      },
      { status: 500 }
    );
  }
}
