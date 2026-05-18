import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const InputSchema = z.object({
  packageId: z.string().min(1),
  packageSlug: z.string().min(1),
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
  examType: z.string().max(20).optional().nullable(),
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

  const pkg = await prisma.odkPackage.findFirst({
    where: { id: d.packageId, isActive: true },
    select: { id: true, slug: true, priceCents: true },
  });
  if (!pkg) {
    return NextResponse.json(
      { ok: false, error: "Paket bulunamadı veya artık satışta değil." },
      { status: 404 },
    );
  }
  if (pkg.slug !== d.packageSlug) {
    return NextResponse.json(
      { ok: false, error: "Paket bilgisi tutarsız." },
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

  // Idempotency: reuse PENDING order from last 30 min if exists
  const cutoff = new Date(Date.now() - PENDING_REUSE_MS);
  let order = await prisma.odkOrder.findFirst({
    where: {
      userId: session.user.id,
      packageId: pkg.id,
      status: "PENDING",
      createdAt: { gt: cutoff },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (order) {
    await prisma.odkOrder.update({
      where: { id: order.id },
      data: { buyerInfo },
    });
  } else {
    order = await prisma.odkOrder.create({
      data: {
        userId: session.user.id,
        packageId: pkg.id,
        status: "PENDING",
        subtotalCents: pkg.priceCents,
        discountCents: 0,
        totalCents: pkg.priceCents,
        buyerInfo,
      },
      select: { id: true },
    });
  }

  log.info("odk.checkout.form_captured", {
    orderId: order.id,
    userId: session.user.id,
    packageId: pkg.id,
  });

  const redirectUrl = `/odk-paketleri/${pkg.slug}/satin-al/odeme?orderId=${order.id}`;
  return NextResponse.json({ ok: true, redirectUrl });
}
