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
import { validateCoupon } from "@/lib/discount";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CartItemSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(160),
  category: z.string().min(1).max(40),
  subject: z.string().min(1).max(80),
  priceCents: z.number().int().positive().max(100_000_000), // <=1.000.000 TL
  priceLabel: z.string().max(60).optional().nullable(),
  qty: z.number().int().min(1).max(99),
});

const InputSchema = z.object({
  // Single-item path (legacy)
  category: z.string().max(40).optional().nullable(),
  subject: z.string().max(80).optional().nullable(),
  packageName: z.string().max(160).optional().nullable(),
  paymentLink: z.string().max(500).optional().nullable(),
  priceLabel: z.string().max(60).optional().nullable(),
  // Multi-item cart path
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
  notes: z.string().max(1000).optional().nullable(),
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
  // Guest checkout: oturum ZORUNLU DEĞİL. Session varsa order kullanıcıya
  // bağlanır; yoksa userId=null guest order oluşur (ödeme sonrası admin
  // onboarding kuyruğuna düşer). Bkz. lib/od/finance.ts.
  const session = await getServerAuthSession();
  const userId = session?.user?.id ?? null;

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

  // ── Determine pricing & summary ──────────────────────────────────────────
  // Two modes:
  //   (a) Multi-item cart: `items[]` supplied → sum priceCents*qty
  //   (b) Single-item:     `packageName` + `category`/`subject` (legacy)
  let priceCents = 0;
  let packageName = "";
  let category: string | null = null;
  let subject: string | null = null;
  let cartSnapshot: Array<{
    name: string;
    category: string;
    subject: string;
    priceCents: number;
    qty: number;
  }> | undefined;

  if (d.items && d.items.length > 0) {
    // Re-validate prices server-side against catalog to prevent tampering.
    const validated = d.items.map((it) => {
      const catalogCents = getPackagePriceCents(it.category, it.subject);
      const trusted =
        catalogCents > 0
          ? catalogCents
          : it.priceLabel
            ? parsePriceToCents(it.priceLabel)
            : it.priceCents;
      return {
        name: it.name,
        category: it.category,
        subject: it.subject,
        priceCents: trusted,
        qty: it.qty,
      };
    });
    if (validated.some((v) => v.priceCents <= 0)) {
      return NextResponse.json(
        { ok: false, error: "Sepetinizdeki bazı paketler için fiyat bulunamadı." },
        { status: 400 },
      );
    }
    priceCents = validated.reduce((acc, v) => acc + v.priceCents * v.qty, 0);
    cartSnapshot = validated;
    const totalQty = validated.reduce((a, v) => a + v.qty, 0);
    packageName =
      validated.length === 1
        ? validated[0].name + (validated[0].qty > 1 ? ` × ${validated[0].qty}` : "")
        : `Sepet (${totalQty} ürün): ${validated
            .map((v) => v.name)
            .slice(0, 3)
            .join(", ")}${validated.length > 3 ? "…" : ""}`;
    // category/subject left null for multi-item
    if (validated.length === 1) {
      category = validated[0].category;
      subject = validated[0].subject;
    }
  } else {
    // Single-item legacy path
    if (!d.packageName) {
      return NextResponse.json(
        { ok: false, error: "Paket adı eksik veya sepet boş." },
        { status: 400 },
      );
    }
    packageName = d.packageName;
    category = d.category || null;
    subject = d.subject || null;
    if (d.category && d.subject) {
      priceCents = getPackagePriceCents(d.category, d.subject);
    }
    if (priceCents <= 0 && d.priceLabel) {
      priceCents = parsePriceToCents(d.priceLabel);
    }
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
    // Kuponlar user-scoped (kullanım limiti/redemption userId'ye bağlı). Guest
    // checkout'ta kontrollü hata döndür — ödemeyi engellemeden kullanıcıyı
    // bilgilendir (kuponsuz devam edebilir).
    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "İndirim kodu kullanmak için giriş yapmanız gerekir. Kodu kaldırıp ödemeye devam edebilirsiniz.",
        },
        { status: 400 },
      );
    }
    const cv = await validateCoupon({
      code: d.couponCode,
      userId,
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

  // ── Admin paneldeki Package ile eşleştir (idempotent, slug bazlı) ────────
  // category+subject varsa "od:tyt-ayt:matematik" gibi slug ile bulunur veya
  // oluşturulur. Çoklu kalem sepette null kalır (cart anchor sipariş).
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
      // Fiyatı senkronla (admin manuel değiştirebilir, üzerine yazma)
    } else {
      const created = await prisma.package.create({
        data: {
          name: pkgName,
          type: "COURSE",
          description: `Otomatik oluşturuldu (OD kataloğu): ${pkgName}`,
          price: priceCents, // kuruş
          lessonCount: 4,
          subjects: subjectsKey,
          isActive: true,
        },
        select: { id: true },
      });
      packageId = created.id;
    }
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
    cart: cartSnapshot ?? null,
    coupon: couponId
      ? { id: couponId, code: couponCode, discountCents }
      : null,
  };

  // Idempotency: aynı user+packageName+total için son 30dk PENDING varsa reuse.
  // Guest'te (userId=null) güvenilir bir reuse anahtarı yok → her zaman yeni
  // order oluştur (cuid orderId guest için bearer görevi görür).
  const cutoff = new Date(Date.now() - PENDING_REUSE_MS);
  let order = userId
    ? await prisma.odOrder.findFirst({
        where: {
          userId,
          packageName,
          totalCents,
          status: "PENDING",
          createdAt: { gt: cutoff },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      })
    : null;

  if (order) {
    await prisma.odOrder.update({
      where: { id: order.id },
      data: {
        buyerInfo,
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
        userId,
        packageName,
        category,
        subject,
        packageId,
        status: "PENDING",
        subtotalCents: priceCents,
        discountCents,
        totalCents,
        buyerInfo,
      },
      select: { id: true },
    });
  }

  log.info("od.checkout.form_captured", {
    orderId: order.id,
    userId,
    packageName,
    subtotalCents: priceCents,
    discountCents,
    totalCents,
    couponCode,
    packageId,
    itemCount: cartSnapshot?.length ?? 1,
  });

  return NextResponse.json({
    ok: true,
    redirectUrl: `/paketler/satin-al/odeme?orderId=${order.id}`,
  });
}
