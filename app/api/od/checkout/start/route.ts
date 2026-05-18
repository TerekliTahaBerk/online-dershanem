/**
 * OD checkout başlatma API'ı.
 *
 * POST /api/od/checkout/start
 *
 * Akış:
 *  1. Form bilgilerini doğrula (zod)
 *  2. Paket fiyatını static katalogdan al (kuruş)
 *  3. PENDING bir OdOrder oluştur (30dk içinde aynı user+packageName+price varsa reuse)
 *  4. buyerInfo JSON olarak persist
 *  5. redirectUrl = /paketler/satin-al/odeme?orderId=...
 *
 * Sonraki adım: kullanıcı /odeme sayfasında PayTR iframe görür. PayTR
 * callback'i ödeme onayını /api/paytr/callback'e gönderir → markOdOrderPaid().
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { log } from "@/lib/logger";
import { getPackagePriceCents, parsePriceToCents } from "@/lib/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const InputSchema = z.object({
  category: z.string().max(40).optional().nullable(),
  subject: z.string().max(80).optional().nullable(),
  packageName: z.string().min(1).max(160),
  paymentLink: z.string().max(500).optional().nullable(),
  priceLabel: z.string().max(60).optional().nullable(),
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(10).max(20),
  tcKimlik: z.string().optional().nullable(),
  city: z.string().min(1).max(80),
  district: z.string().min(1).max(80),
  address: z.string().max(500).optional().nullable(),
  schoolName: z.string().max(160).optional().nullable(),
  classLevel: z.string().min(1).max(20),
  department: z.string().max(60).optional().nullable(),
  examType: z.string().max(40).optional().nullable(),
  targetSchool: z.string().max(160).optional().nullable(),
  parentFullName: z.string().max(120).optional().nullable(),
  parentPhone: z.string().max(20).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  kvkkConsent: z.union([z.string(), z.boolean()]).optional(),
  marketingConsent: z.union([z.string(), z.boolean()]).optional(),
  paymentConsent: z.union([z.string(), z.boolean()]).optional(),
});

function asBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "1" || v.toLowerCase() === "true" || v === "on";
  return false;
}

const PENDING_REUSE_MS = 30 * 60_000;

export async function POST(req: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Oturum açmanız gerekiyor." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Geçersiz istek gövdesi." },
      { status: 400 },
    );
  }

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error:
          parsed.error.issues[0]?.message ||
          "Form bilgileri eksik veya hatalı.",
      },
      { status: 400 },
    );
  }
  const d = parsed.data;

  if (!asBool(d.kvkkConsent) || !asBool(d.paymentConsent)) {
    return NextResponse.json(
      { ok: false, error: "KVKK ve ön bilgilendirme onaylarını işaretleyin." },
      { status: 400 },
    );
  }

  // Fiyatı belirle: önce katalogdan (kategori+subject), olmazsa priceLabel parse
  let priceCents = 0;
  if (d.category && d.subject) {
    priceCents = getPackagePriceCents(d.category, d.subject);
  }
  if (priceCents <= 0 && d.priceLabel) {
    priceCents = parsePriceToCents(d.priceLabel);
  }

  if (priceCents <= 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Bu paket için fiyat bilgisi alınamadı. Lütfen iletişime geçin.",
      },
      { status: 400 },
    );
  }

  const buyerInfo = {
    fullName: d.fullName,
    email: d.email,
    phone: d.phone,
    tcKimlik: d.tcKimlik || null,
    city: d.city,
    district: d.district,
    address: d.address || null,
    schoolName: d.schoolName || null,
    classLevel: d.classLevel,
    department: d.department || null,
    examType: d.examType || null,
    targetSchool: d.targetSchool || null,
    parentFullName: d.parentFullName || null,
    parentPhone: d.parentPhone || null,
    notes: d.notes || null,
    kvkkConsent: true,
    marketingConsent: asBool(d.marketingConsent),
    paymentConsent: true,
    capturedAt: new Date().toISOString(),
  };

  // Idempotency: aynı user+packageName+amount için son 30dk PENDING varsa reuse
  const cutoff = new Date(Date.now() - PENDING_REUSE_MS);
  let order = await prisma.odOrder.findFirst({
    where: {
      userId: session.user.id,
      packageName: d.packageName,
      totalCents: priceCents,
      status: "PENDING",
      createdAt: { gt: cutoff },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (order) {
    await prisma.odOrder.update({
      where: { id: order.id },
      data: { buyerInfo, category: d.category || null, subject: d.subject || null },
    });
  } else {
    order = await prisma.odOrder.create({
      data: {
        userId: session.user.id,
        packageName: d.packageName,
        category: d.category || null,
        subject: d.subject || null,
        status: "PENDING",
        subtotalCents: priceCents,
        discountCents: 0,
        totalCents: priceCents,
        buyerInfo,
      },
      select: { id: true },
    });
  }

  log.info("od.checkout.form_captured", {
    orderId: order.id,
    userId: session.user.id,
    packageName: d.packageName,
    priceCents,
  });

  return NextResponse.json({
    ok: true,
    redirectUrl: `/paketler/satin-al/odeme?orderId=${order.id}`,
  });
}
