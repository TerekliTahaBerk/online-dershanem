import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { leadSubmissionSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendLeadSubmissionNotification } from "@/lib/email";

/**
 * Public ön görüşme / lead formu kayıt ucu.
 *
 * Akış: doğrula → DB'ye yaz (LeadSubmission) → admin'e bildirim (best-effort).
 * Client tarafı bu uç başarısız olursa WhatsApp/mailto fallback'ine düşer.
 */
export async function POST(request: Request) {
  try {
    // IP başına basit hız limiti — form spam'ini sınırla.
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const limit = await checkRateLimit(`leads:${ip}`, 5, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Çok fazla deneme. Lütfen biraz sonra tekrar deneyin." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const parsed = leadSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Geçersiz form verisi." },
        { status: 400 },
      );
    }

    const { formType, notes, submittedAt, ...rest } = parsed.data;

    const lead = await prisma.leadSubmission.create({
      data: {
        ...rest,
        submittedAt: new Date(submittedAt),
        adminNotes: notes ?? null,
        taskLabel: formType,
      },
    });

    // Bildirim e-postası en iyi çaba — başarısızlık kaydı bozmamalı.
    try {
      await sendLeadSubmissionNotification({
        fullName: lead.fullName,
        phone: lead.phone,
        classLevel: lead.classLevel,
        examType: lead.examType,
        targetGoal: lead.targetGoal,
        currentNet: lead.currentNet,
        parentPhone: lead.parentPhone,
        source: lead.source,
        submittedAt: lead.submittedAt,
      });
    } catch {
      /* bildirim hatası kaydı engellemez */
    }

    return NextResponse.json({ id: lead.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Form kaydı sırasında hata oluştu." },
      { status: 500 },
    );
  }
}
