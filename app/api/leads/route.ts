import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { leadSubmissionSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRateLimitKeyFromIp, rateLimitResponseHeaders } from "@/lib/security/rate-limit";
import { sendLeadSubmissionNotification } from "@/lib/email";
import { normalizeEmail, normalizePhone } from "@/lib/business/normalization";

/**
 * Public ön görüşme / lead formu kayıt ucu.
 *
 * Akış: doğrula → DB'ye yaz (LeadSubmission) → admin'e bildirim (best-effort).
 * Client tarafı bu uç başarısız olursa WhatsApp/mailto fallback'ine düşer.
 */
export async function POST(request: Request) {
  try {
    // IP başına basit hız limiti — form spam'ini sınırla.
    const limit = await checkRateLimit(
      getRateLimitKeyFromIp(request.headers, "lead.submit"),
      5,
      60_000,
    );
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Çok fazla deneme. Lütfen biraz sonra tekrar deneyin." },
        { status: 429, headers: rateLimitResponseHeaders(limit.retryAfterMs) },
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

    // `email` LeadSubmission'da sütun DEĞİL; CRM tarafına ayrı geçirilir.
    const { formType, notes, submittedAt, email, ...rest } = parsed.data;

    const lead = await prisma.leadSubmission.create({
      data: {
        ...rest,
        submittedAt: new Date(submittedAt),
        adminNotes: notes ?? null,
        taskLabel: formType,
      },
    });

    // Public lead formunu birleşik CRM'e yüksek güvenli telefon eşleşmesiyle yansıt.
    const unit = await prisma.businessUnit.upsert({ where: { code: "OD" }, update: { isActive: true }, create: { code: "OD", name: "OnlineDershanem", product: "OD" } });
    const normalizedPhone = normalizePhone(lead.phone);
    const normalizedEmail = normalizeEmail(email || null);
    const existingBusinessLead = normalizedPhone ? await prisma.businessLead.findFirst({ where: { businessUnitId: unit.id, normalizedPhone } }) : null;
    await prisma.businessLead.create({ data: { businessUnitId: unit.id, source: "OD_WEB_FORM", firstName: lead.fullName, phone: lead.phone, normalizedPhone, email: email || null, normalizedEmail, grade: lead.classLevel, examType: lead.examType, consentMetadata: { kvkkConsent: lead.kvkkConsent, sourceSubmissionId: lead.id }, matchSuggestion: existingBusinessLead ? { leadId: existingBusinessLead.id, confidence: 0.78, reasons: ["PHONE"] } : undefined } });

    // E-posta kapalı veya gecikmiş olsa bile yönetim paneli yeni talebi gösterir.
    const admins = await prisma.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
    if (admins.length) await prisma.notification.createMany({ data: admins.map((admin) => ({ userId: admin.id, type: "SYSTEM", title: "Yeni ön görüşme talebi", body: `${lead.fullName} · ${lead.examType} · ${lead.classLevel}`, href: "/panel/yonetim/isler" })) });

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
