import { prisma } from "@/lib/prisma";
import { purchaseIntentSchema, resolveSubmittedAt } from "@/lib/forms";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = purchaseIntentSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          ok: false,
          errors: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    const purchaseIntent = await prisma.purchaseIntent.create({
      data: {
        ...parsed.data,
        submittedAt: resolveSubmittedAt(parsed.data.submittedAt),
        events: {
          create: {
            eventType: "FORM_SUBMITTED",
            status: "PENDING",
            source: parsed.data.source,
            packageName: parsed.data.packageName,
            paymentLink: parsed.data.paymentLink
          }
        }
      }
    });

    return Response.json({
      ok: true,
      id: purchaseIntent.id
    });
  } catch {
    return Response.json(
      {
        ok: false,
        message: "Satın alma ön formu kaydedilemedi."
      },
      { status: 500 }
    );
  }
}
