import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createOdkOrderFromCatalog } from "@/lib/odk/product-contract-server";
import { getPublicOdkPackage, odkAvailabilityLabel } from "@/lib/odk/public-commerce-server";
import { odkPublicAccessDecision } from "@/lib/odk/pilot-rollout";
import { log } from "@/lib/logger";
import { assertRateLimit, getRateLimitKeyFromIp, rateLimitResponseHeaders, RateLimitError } from "@/lib/security/rate-limit";
import { RATE_LIMIT_POLICIES } from "@/lib/security/rate-limit-policies";
import { prisma } from "@/lib/prisma";
import { beneficiarySchema } from "@/lib/commerce/beneficiary";
import { applyPurchaseContext, contextOrderFields, resolvePurchaseContext } from "@/lib/commerce/account-purchase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const InputSchema = z.object({
  packageSlug: z.string().trim().min(1).max(160),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(10).max(20),
  tcKimlik: z.string().trim().max(11).optional().nullable(),
  city: z.string().trim().min(1).max(80),
  district: z.string().trim().min(1).max(80),
  address: z.string().trim().min(1).max(500),
  schoolName: z.string().trim().min(1).max(160),
  classLevel: z.string().trim().min(1).max(20),
  department: z.string().trim().max(60).optional().nullable(),
  examType: z.string().trim().min(1).max(40),
  targetSchool: z.string().trim().max(160).optional().nullable(),
  parentFullName: z.string().trim().max(120).optional().nullable(),
  parentPhone: z.string().trim().max(20).optional().nullable(),
  parentEmail: z.string().trim().email().max(254).optional().nullable().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().nullable(),
  kvkkConsent: z.union([z.string(), z.boolean()]),
  marketingConsent: z.union([z.string(), z.boolean()]).optional(),
  paymentConsent: z.union([z.string(), z.boolean()]),
  /** Giriş yapmış veli: paketin hangi çocuk için olduğu. */
  beneficiary: beneficiarySchema,
});

function asBool(value: unknown) {
  return value === true || value === "1" || value === "true" || value === "on";
}

function unavailable(error: string, status = 409) {
  return NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const rollout = odkPublicAccessDecision();
  if (!rollout.allowed) {
    return unavailable("Online Deneme Kulübüm yeni satın alımlara açık değil.", rollout.reason === "KILL_SWITCH" ? 503 : 410);
  }

  const policy = RATE_LIMIT_POLICIES.odkCheckout;
  try {
    await assertRateLimit(getRateLimitKeyFromIp(req.headers, policy.action), policy.limit);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 429, headers: rateLimitResponseHeaders(error.retryAfterMs) });
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return unavailable("Geçersiz istek gövdesi.", 400);
  }
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) return unavailable(parsed.error.issues[0]?.message || "Form bilgileri eksik veya hatalı.", 400);
  const data = parsed.data;
  if (!asBool(data.kvkkConsent) || !asBool(data.paymentConsent)) {
    return unavailable("KVKK ve ön bilgilendirme onaylarını işaretleyin.", 400);
  }

  // Giriş yapmış öğrenci/veli: erişimin kime açılacağı sipariş anında sabitlenir.
  const purchase = await resolvePurchaseContext(data.beneficiary ?? null);
  if (!purchase.ok) return unavailable(purchase.error, purchase.status);

  const item = await getPublicOdkPackage(data.packageSlug);
  if (!item) return unavailable("Paket bulunamadı veya artık yayında değil.", 404);
  if (!item.availability.allowed) return unavailable(odkAvailabilityLabel(item.availability.reason));

  const normalizedEmail = data.email.toLocaleLowerCase("tr-TR");
  const baseBuyerInfo = {
    fullName: data.fullName,
    email: normalizedEmail,
    studentFullName: data.fullName,
    studentEmail: normalizedEmail,
    phone: data.phone,
    studentPhone: data.phone,
    tcKimlik: data.tcKimlik || null,
    city: data.city,
    district: data.district,
    address: data.address,
    schoolName: data.schoolName,
    classLevel: data.classLevel,
    department: data.department || null,
    examType: data.examType,
    targetSchool: data.targetSchool || null,
    parentFullName: data.parentFullName || null,
    parentPhone: data.parentPhone || null,
    parentEmail: data.parentEmail?.toLocaleLowerCase("tr-TR") || null,
    notes: data.notes || null,
    kvkkConsent: true,
    marketingConsent: asBool(data.marketingConsent),
    paymentConsent: true,
    capturedAt: new Date().toISOString(),
  };
  // Bağlam alanları en sona: formdaki öğrenci/veli alanları oturumdan
  // doğrulanmış kimliği ezemez.
  const buyerInfo = applyPurchaseContext(baseBuyerInfo, purchase.context).buyerInfo;

  try {
    const order = await createOdkOrderFromCatalog({ packageId: item.contract.package.id, buyerInfo: buyerInfo as Prisma.InputJsonValue });
    const orderFields = contextOrderFields(purchase.context);
    if (orderFields.buyerUserId) await prisma.odkOrder.update({ where: { id: order.id }, data: orderFields });
    log.info("odk.checkout.form_captured", { orderId: order.id, packageId: item.contract.package.id, catalogVersion: item.contract.catalogVersion });
    return NextResponse.json({ ok: true, redirectUrl: `/odk-paketleri/${data.packageSlug}/satin-al/odeme?orderId=${order.id}` });
  } catch (error) {
    log.warn("odk.checkout.order_rejected", { packageId: item.contract.package.id, reason: error instanceof Error ? error.message : "unknown" });
    return unavailable("Paket satış koşulları değişti. Lütfen paket sayfasını yenileyin.");
  }
}
