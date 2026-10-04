import "server-only";

import type { LeadSource, Prisma, ProductCode, ProductInterest } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, normalizePhone } from "@/lib/business/normalization";

/**
 * Birleşik CRM'e (BusinessLead) lead yazan ve yönetime panel bildirimi düşen
 * ortak yardımcılar. Public ön görüşme formu (`/api/leads`), kendi kendine
 * kayıt (`/api/auth/register`) ve Tally webhook'u aynı yolu kullanır ki
 * telefon eşleşme önerisi ve bildirim davranışı tek yerde kalsın.
 */

export type BusinessLeadInput = {
  source: LeadSource;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  grade?: string | null;
  examType?: string | null;
  city?: string | null;
  studentName?: string | null;
  parentName?: string | null;
  productInterest?: ProductInterest;
  tags?: string[];
  consentMetadata?: Prisma.InputJsonValue;
  relatedOdUserId?: string | null;
};

/** Ürün kodlarından CRM'in kaba ürün ilgisine indirger. */
export function productInterestFromCodes(codes: readonly ProductCode[]): ProductInterest {
  if (codes.includes("OD") || codes.includes("OK")) return "ONLINE_DERSHANEM";
  if (codes.includes("ODK")) return "ONLINE_DENEME_KULUBU";
  return "UNKNOWN";
}

export async function recordBusinessLead(input: BusinessLeadInput): Promise<{ id: string }> {
  const unit = await prisma.businessUnit.upsert({
    where: { code: "OD" },
    update: { isActive: true },
    create: { code: "OD", name: "OnlineDershanem", product: "OD" },
  });
  const normalizedPhone = normalizePhone(input.phone ?? null);
  const normalizedEmail = normalizeEmail(input.email ?? null);
  const existing = normalizedPhone
    ? await prisma.businessLead.findFirst({ where: { businessUnitId: unit.id, normalizedPhone }, select: { id: true } })
    : null;
  return prisma.businessLead.create({
    data: {
      businessUnitId: unit.id,
      source: input.source,
      firstName: input.fullName,
      phone: input.phone ?? null,
      normalizedPhone,
      email: input.email || null,
      normalizedEmail,
      grade: input.grade ?? null,
      examType: input.examType ?? null,
      city: input.city ?? null,
      studentName: input.studentName ?? null,
      parentName: input.parentName ?? null,
      productInterest: input.productInterest ?? "UNKNOWN",
      tags: input.tags ?? [],
      consentMetadata: input.consentMetadata,
      relatedOdUserId: input.relatedOdUserId ?? null,
      matchSuggestion: existing ? { leadId: existing.id, confidence: 0.78, reasons: ["PHONE"] } : undefined,
    },
    select: { id: true },
  });
}

/** Aktif bütün yöneticilere panel bildirimi. E-posta kapalı olsa da iş kuyruğu görünür. */
export async function notifyActiveAdmins(notification: { title: string; body: string; href: string }): Promise<void> {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
  if (!admins.length) return;
  await prisma.notification.createMany({
    data: admins.map((admin) => ({ userId: admin.id, type: "SYSTEM" as const, ...notification })),
  });
}
