import { PurchaseStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncStudentFromPurchaseIntent } from "@/lib/student-sync";
import { purchaseSubmissionSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = purchaseSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz satın alma formu verisi." }, { status: 400 });
    }

    const submission = await prisma.purchaseIntent.create({
      data: {
        ...parsed.data,
        submittedAt: new Date(parsed.data.submittedAt),
        status: PurchaseStatus.PENDING
      }
    });

    await prisma.purchaseEvent.create({
      data: {
        purchaseIntentId: submission.id,
        eventType: "FORM_SUBMITTED",
        status: submission.status,
        source: submission.source,
        packageName: submission.packageName,
        paymentLink: submission.paymentLink,
        provider: "form"
      }
    });

    void syncStudentFromPurchaseIntent(submission.id);

    return NextResponse.json({ id: submission.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Satın alma kaydı sırasında hata oluştu." }, { status: 500 });
  }
}
