/**
 * ODK checkout orchestration — sipariş açar, PayTR token alır, iframe URL döner.
 *
 * Akış:
 *  1. PENDING bir OdkOrder oluştur (idempotency: aynı user+package için
 *     son 30 dakikada PENDING varsa onu yeniden kullan)
 *  2. PENDING bir OdkPayment satırı (provider=PAYTR) yaz — providerRef = merchant_oid
 *  3. PayTR get-token çağır
 *  4. iframe URL döndür → sayfa iframe ile yükler
 *  5. Callback geldiğinde `lib/odk/paytr-callback.ts` çağrılır
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import {
  buildMerchantOid,
  createPaytrIframeToken,
  isPaytrConfigured,
  type PaytrBasketItem,
} from "./paytr";

export type CheckoutResult =
  | { ok: true; orderId: string; iframeUrl: string }
  | { ok: false; reason: string; userMessage: string };

const PENDING_REUSE_WINDOW_MS = 30 * 60_000;

export async function createOdkCheckoutSession(input: {
  userId: string;
  packageId: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  userAddress?: string;
  userIp: string;
  origin: string; // ör. "https://onlinedershanem.com"
}): Promise<CheckoutResult> {
  if (!isPaytrConfigured()) {
    return {
      ok: false,
      reason: "paytr_not_configured",
      userMessage: "Ödeme sistemi henüz aktif değil. Lütfen iletişime geçin.",
    };
  }

  const pkg = await prisma.odkPackage.findUnique({
    where: { id: input.packageId, isActive: true },
    select: { id: true, title: true, priceCents: true, slug: true },
  });
  if (!pkg) {
    return { ok: false, reason: "package_not_found", userMessage: "Paket bulunamadı." };
  }
  if (pkg.priceCents <= 0) {
    return {
      ok: false,
      reason: "invalid_price",
      userMessage: "Bu paketin fiyatı tanımlı değil. Lütfen iletişime geçin.",
    };
  }

  // Idempotency: aynı kullanıcı + paket için son 30dk içinde PENDING order
  const cutoff = new Date(Date.now() - PENDING_REUSE_WINDOW_MS);
  let order = await prisma.odkOrder.findFirst({
    where: {
      userId: input.userId,
      packageId: pkg.id,
      status: "PENDING",
      createdAt: { gt: cutoff },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, totalCents: true },
  });

  if (!order) {
    const created = await prisma.odkOrder.create({
      data: {
        userId: input.userId,
        packageId: pkg.id,
        status: "PENDING",
        subtotalCents: pkg.priceCents,
        discountCents: 0,
        totalCents: pkg.priceCents,
      },
      select: { id: true, totalCents: true },
    });
    order = created;
  }

  const merchantOid = buildMerchantOid(order.id);

  // PENDING Payment satırı — bu merchant_oid için var mı kontrol et
  const existingPayment = await prisma.odkPayment.findFirst({
    where: { orderId: order.id, provider: "PAYTR", providerRef: merchantOid },
    select: { id: true },
  });
  if (existingPayment) {
    await prisma.odkPayment.update({
      where: { id: existingPayment.id },
      data: { status: "PENDING", amountCents: order.totalCents, failureReason: null },
    });
  } else {
    await prisma.odkPayment.create({
      data: {
        orderId: order.id,
        provider: "PAYTR",
        providerRef: merchantOid,
        status: "PENDING",
        amountCents: order.totalCents,
      },
    });
  }

  const basket: PaytrBasketItem[] = [
    [pkg.title.slice(0, 200), (pkg.priceCents / 100).toFixed(2), 1],
  ];

  const okUrl = `${input.origin}/odk-paketleri/${pkg.slug}/satin-al/sonuc?status=success`;
  const failUrl = `${input.origin}/odk-paketleri/${pkg.slug}/satin-al/sonuc?status=failed`;

  const tokenRes = await createPaytrIframeToken({
    merchantOid,
    email: input.userEmail,
    amountCents: order.totalCents,
    basket,
    userIp: input.userIp,
    userName: input.userName || "Müşteri",
    userPhone: input.userPhone || "05000000000",
    userAddress: input.userAddress || "Türkiye",
    merchantOkUrl: okUrl,
    merchantFailUrl: failUrl,
    timeoutLimit: 30,
  });

  if (tokenRes.status !== "success") {
    log.warn("odk.checkout.token_failed", { orderId: order.id, reason: tokenRes.reason });
    return {
      ok: false,
      reason: tokenRes.reason,
      userMessage:
        "Ödeme başlatılamadı. Lütfen birkaç dakika sonra tekrar deneyin veya iletişime geçin.",
    };
  }

  log.info("odk.checkout.token_ready", { orderId: order.id, merchantOid });
  return { ok: true, orderId: order.id, iframeUrl: tokenRes.iframeUrl };
}
