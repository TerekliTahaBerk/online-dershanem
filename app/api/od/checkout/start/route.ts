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
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import { priceCatalogItems, priceCatalogSelection } from "@/lib/od/checkout-pricing";
import { validateCoupon } from "@/lib/discount";
import {
  assertRateLimit,
  getRateLimitKeyFromIp,
  rateLimitResponseHeaders,
  RateLimitError,
} from "@/lib/security/rate-limit";
import { RATE_LIMIT_POLICIES } from "@/lib/security/rate-limit-policies";
import { OD_NO_SLOT_VALUES, OD_TIME_RANGE_VALUES } from "@/lib/od/placement";
import { getOdPlacementExpectation } from "@/lib/od/placement-server";
import { allocateOrderDiscount, assertOrderLineReconciliation } from "@/lib/commerce/order-lines";
import { getPublicOdkPackage } from "@/lib/odk/public-commerce-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CartItemSchema = z.object({
  service: z.enum(["OD", "ODK"]).default("OD"),
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(160),
  category: z.string().min(1).max(40),
  subject: z.string().min(1).max(80),
  priceCents: z.number().int().positive().max(100_000_000), // <=1.000.000 TL
  priceLabel: z.string().max(60).optional().nullable(),
  qty: z.number().int().min(1).max(99),
  owner: z.object({
    fullName: z.string().min(2).max(120),
    email: z.string().email().max(254),
    phone: z.string().max(20).optional().nullable(),
  }).optional(),
});

const InputSchema = z.object({
  // Single-item path (legacy)
  category: z.string().max(40).optional().nullable(),
  subject: z.string().max(80).optional().nullable(),
  packageName: z.string().max(160).optional().nullable(),
  paymentLink: z.string().max(500).optional().nullable(),
  priceLabel: z.string().max(60).optional().nullable(),
  // Single-package cart path
  items: z.array(CartItemSchema).max(20).optional(),
  // Buyer info
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
  parentEmail: z.string().email().max(254).optional().nullable().or(z.literal("")),
  notes: z.string().max(1000).optional().nullable(),
  availabilityTimeRanges: z.array(z.enum(OD_TIME_RANGE_VALUES)).min(1).max(4),
  earliestStartDate: z.iso.date().optional().nullable(),
  noSlotPreference: z.enum(OD_NO_SLOT_VALUES),
  placementConsent: z.union([z.string(), z.boolean()]).optional(),
  couponCode: z.string().max(60).optional().nullable(),
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
  const policy = RATE_LIMIT_POLICIES.odCheckout;
  try {
    await assertRateLimit(
      getRateLimitKeyFromIp(req.headers, policy.action),
      policy.limit,
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 429, headers: rateLimitResponseHeaders(error.retryAfterMs) },
      );
    }
    throw error;
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

  if (!asBool(d.kvkkConsent) || !asBool(d.paymentConsent) || !asBool(d.placementConsent)) {
    return NextResponse.json(
      { ok: false, error: "KVKK ve ön bilgilendirme onaylarını işaretleyin." },
      { status: 400 },
    );
  }

  // ── Determine pricing & summary ──────────────────────────────────────────
  // Two modes:
  //   (a) Current cart: up to 20 server-priced lines with explicit quantities
  //   (b) Legacy direct form: `packageName` + `category`/`subject`
  let priceCents = 0;
  let primaryUnitPriceCents = 0;
  let packageName = "";
  let category: string | null = null;
  let subject: string | null = null;
  let cartSnapshot: Array<{
    service: "OD" | "ODK";
    id: string;
    name: string;
    category: string;
    subject: string;
    priceCents: number;
    qty: number;
    productId?: string | null;
    productSnapshot?: unknown;
    owner?: { fullName: string; email: string; phone?: string | null };
  }> | undefined;

  if (d.items && d.items.length > 0) {
    // Resolve every line from its authoritative service catalog. Client names
    // and prices are display-only and are never copied into money snapshots.
    const validated: NonNullable<typeof cartSnapshot> = [];
    for (const [position, item] of d.items.entries()) {
      if (item.service === "ODK") {
        const odk = await getPublicOdkPackage(item.id);
        if (!odk?.availability.allowed) {
          return NextResponse.json({ ok: false, error: "Sepetinizde artık satışta olmayan bir Deneme Kulübü paketi var." }, { status: 400 });
        }
        validated.push({
          service: "ODK", id: odk.contract.package.slug, name: odk.contract.package.title,
          category: "ODK", subject: odk.contract.package.title, priceCents: odk.contract.package.priceCents,
          qty: item.qty, productId: odk.contract.package.id, productSnapshot: odk.contract,
          owner: item.owner ? { ...item.owner, email: item.owner.email.trim().toLowerCase() } : undefined,
        });
      } else {
        const priced = priceCatalogItems([item])?.[0];
        if (!priced) {
          return NextResponse.json({ ok: false, error: "Sepetinizde artık satışta olmayan veya geçersiz bir paket var." }, { status: 400 });
        }
        validated.push({
          ...priced, service: "OD", productId: null,
          owner: d.items[position].owner ? { ...d.items[position].owner!, email: d.items[position].owner!.email.trim().toLowerCase() } : undefined,
        });
      }
    }
    if (!validated.some((item) => item.service === "OD")) {
      return NextResponse.json({ ok: false, error: "Bu ödeme yolunda en az bir Online Dershanem paketi bulunmalıdır." }, { status: 400 });
    }
    const selected = validated.find((item) => item.service === "OD")!;
    priceCents = validated.reduce((sum, item) => sum + item.priceCents * item.qty, 0);
    primaryUnitPriceCents = selected.priceCents;
    cartSnapshot = validated;
    packageName = validated.length === 1 ? selected.name : `${selected.name} + ${validated.length - 1} ek ürün`;
    category = selected.category;
    subject = selected.subject;
  } else {
    // Single-item legacy path
    if (!d.packageName) {
      return NextResponse.json(
        { ok: false, error: "Paket adı eksik veya sepet boş." },
        { status: 400 },
      );
    }
    packageName = `${d.category ?? ""} ${d.subject ?? ""}`.trim();
    category = d.category || null;
    subject = d.subject || null;
    priceCents = priceCatalogSelection({ category, subject });
    primaryUnitPriceCents = priceCents;
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

  // ── Coupon (optional) ─────────────────────────────────────────────────────
  let discountCents = 0;
  let couponId: string | null = null;
  let couponCode: string | null = null;
  if (d.couponCode && d.couponCode.trim()) {
    const cv = await validateCoupon({
      code: d.couponCode,
      customerKey: d.email.trim().toLowerCase(),
      service: "OD",
      subtotalCents: priceCents,
    });
    if (!cv.ok) {
      return NextResponse.json(
        { ok: false, error: `İndirim kodu: ${cv.userMessage}` },
        { status: 400 },
      );
    }
    discountCents = cv.discountCents;
    couponId = cv.couponId;
    couponCode = cv.code;
  }
  const totalCents = Math.max(0, priceCents - discountCents);

  const allocatedLines = allocateOrderDiscount(
    (cartSnapshot ?? [{ service: "OD" as const, id: `${category ?? "legacy"}:${subject ?? packageName}`, name: packageName, category: category ?? "", subject: subject ?? "", priceCents, qty: 1 }])
      .map((item, position) => ({ position, quantity: item.qty, unitPriceCents: item.priceCents })),
    discountCents,
  );
  assertOrderLineReconciliation(allocatedLines, { subtotalCents: priceCents, discountCents, totalCents });

  // ── Public ürün kataloğundaki Package ile eşleştir ──────────────────────
  // category+subject varsa public katalog kaydı bulunur veya oluşturulur.
  let packageId: string | null = null;
  if (category && subject) {
    const pkgName = `${category} ${subject}`;
    const subjectsKey = subject.slice(0, 80);
    const existingPkg = await prisma.package.findFirst({
      where: { name: pkgName, type: "COURSE" },
      select: { id: true },
    });
    if (existingPkg) {
      packageId = existingPkg.id;
      // Mevcut katalog kaydının fiyatını değiştirme.
    } else {
      const created = await prisma.package.create({
        data: {
          name: pkgName,
          type: "COURSE",
          description: `Otomatik oluşturuldu (OD kataloğu): ${pkgName}`,
          price: primaryUnitPriceCents, // authoritative unit price, kuruş
          lessonCount: 4,
          subjects: subjectsKey,
          isActive: true,
        },
        select: { id: true },
      });
      packageId = created.id;
    }
  }

  const normalizedEmail = d.email.trim().toLowerCase();
  const placementExpectation = await getOdPlacementExpectation(category);
  const buyerInfo = {
    fullName: d.fullName,
    email: normalizedEmail,
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
    parentEmail: d.parentEmail?.trim().toLowerCase() || null,
    notes: d.notes || null,
    placementPreferences: {
      timeRanges: d.availabilityTimeRanges,
      earliestStartDate: d.earliestStartDate || null,
      noSlotPreference: d.noSlotPreference,
      capturedAt: new Date().toISOString(),
      expectationShown: placementExpectation,
    },
    kvkkConsent: true,
    marketingConsent: asBool(d.marketingConsent),
    paymentConsent: true,
    capturedAt: new Date().toISOString(),
    cart: cartSnapshot ?? null,
    coupon: couponId
      ? { id: couponId, code: couponCode, discountCents }
      : null,
  };

  const lineInputs = allocatedLines.map((money, position) => {
    const item = cartSnapshot?.[position] ?? { service: "OD" as const, id: `${category ?? "legacy"}:${subject ?? packageName}`, name: packageName, category: category ?? "", subject: subject ?? "", priceCents, qty: 1 };
    const owner = cartSnapshot?.[position]?.owner ?? { fullName: d.fullName, email: normalizedEmail, phone: d.phone };
    return {
      position,
      product: item.service,
      productId: item.service === "ODK" ? item.productId ?? null : item.category === category && item.subject === subject ? packageId : null,
      sku: item.id,
      productName: item.name,
      productSnapshot: (item.service === "ODK" ? item.productSnapshot! : { id: item.id, name: item.name, category: item.category, subject: item.subject }) as Prisma.InputJsonValue,
      quantity: money.quantity,
      unitPriceCents: money.unitPriceCents,
      subtotalCents: money.subtotalCents,
      discountCents: money.discountCents,
      taxCents: money.taxCents,
      totalCents: money.totalCents,
      fulfillmentOwnerKey: owner.email.trim().toLowerCase(),
      fulfillmentOwnerSnapshot: owner as Prisma.InputJsonValue,
    };
  });

  // Idempotency: yalnız aynı immutable line fingerprint'ine sahip son siparişi kullan.
  const cutoff = new Date(Date.now() - PENDING_REUSE_MS);
  let order = await prisma.odOrder.findFirst({
    where: {
      packageName, totalCents, status: "PENDING", createdAt: { gt: cutoff },
      buyerInfo: { path: ["email"], equals: normalizedEmail },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, lines: { orderBy: { position: "asc" }, select: { sku: true, quantity: true, unitPriceCents: true, discountCents: true, totalCents: true, fulfillmentOwnerKey: true } } },
  });

  if (order && (order.lines.length !== lineInputs.length || order.lines.some((line, index) => {
    const expected = lineInputs[index];
    return line.sku !== expected.sku || line.quantity !== expected.quantity || line.unitPriceCents !== expected.unitPriceCents || line.discountCents !== expected.discountCents || line.totalCents !== expected.totalCents || line.fulfillmentOwnerKey !== expected.fulfillmentOwnerKey;
  }))) order = null;

  if (order) {
    await prisma.odOrder.update({
      where: { id: order.id },
      data: {
        buyerInfo: buyerInfo as Prisma.InputJsonValue,
        category,
        subject,
        packageId,
        subtotalCents: priceCents,
        discountCents,
        totalCents,
      },
    });
  } else {
    order = await prisma.odOrder.create({
      data: {
        packageName,
        category,
        subject,
        packageId,
        status: "PENDING",
        subtotalCents: priceCents,
        discountCents,
        totalCents,
        buyerInfo: buyerInfo as Prisma.InputJsonValue,
        lines: { create: lineInputs },
      },
      select: { id: true, lines: { select: { sku: true, quantity: true, unitPriceCents: true, discountCents: true, totalCents: true, fulfillmentOwnerKey: true } } },
    });
  }

  log.info("od.checkout.form_captured", {
    orderId: order!.id,
    customerEmail: normalizedEmail,
    packageName,
    subtotalCents: priceCents,
    discountCents,
    totalCents,
    couponCode,
    packageId,
    itemCount: cartSnapshot?.length ?? 1,
    capacitySignal: placementExpectation.capacitySignal,
    timeRangeCount: d.availabilityTimeRanges.length,
    noSlotPreference: d.noSlotPreference,
  });

  return NextResponse.json({
    ok: true,
    redirectUrl: `/paketler/satin-al/odeme?orderId=${order!.id}`,
  });
}
