import { PurchaseStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { purchaseSubmissionSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = purchaseSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz satın alma formu verisi." }, { status: 400 });
    }

    const submission = await prisma.purchaseSubmission.create({
      data: {
        ...parsed.data,
        submittedAt: new Date(parsed.data.submittedAt),
        status: parsed.data.paymentLink ? PurchaseStatus.PENDING_PAYMENT : PurchaseStatus.INTENT
      }
    });

    return NextResponse.json({ id: submission.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Satın alma kaydı sırasında hata oluştu." }, { status: 500 });
  }
}
