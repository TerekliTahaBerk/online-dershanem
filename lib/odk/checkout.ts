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
import { decideOdkCommerceAvailability, parseOdkProductContract } from "@/lib/odk/product-contract";
import { odkPublicAccessDecision } from "@/lib/odk/pilot-rollout";
import {
  buildMerchantOid,
  createPaytrIframeToken,
  isPaytrConfigured,
  type PaytrBasketItem,
} from "./paytr";
import { assertOrderLineReconciliation } from "@/lib/commerce/order-lines";

export type CheckoutResult =
  | { ok: true; orderId: string; iframeUrl: string }
  | { ok: false; reason: string; userMessage: string };

export async function createOdkCheckoutSession(input: {
  // Order `/api/odk/checkout/start` tarafından önceden oluşturuldu. Guest
  // uyumluluğu için userId yerine orderId ile çalışırız (OD ile aynı desen).
  orderId: string;
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

  const order = await prisma.odkOrder.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      status: true,
      totalCents: true,
      subtotalCents: true,
      discountCents: true,
      contractSnapshot: true,
      lines: { orderBy: { position: "asc" }, select: { position: true, productName: true, quantity: true, unitPriceCents: true, subtotalCents: true, discountCents: true, taxCents: true, totalCents: true } },
      package: { select: { isActive: true } },
    },
  });
  if (!order || !order.package?.isActive) {
    return { ok: false, reason: "order_not_found", userMessage: "Sipariş bulunamadı." };
  }
  if (order.status !== "PENDING") {
    return { ok: false, reason: "order_not_pending", userMessage: "Bu sipariş zaten işlenmiş." };
  }
  if (order.totalCents <= 0) {
    return {
      ok: false,
      reason: "invalid_price",
      userMessage: "Bu paketin fiyatı tanımlı değil. Lütfen iletişime geçin.",
    };
  }
  if (order.lines.length) {
    try {
      assertOrderLineReconciliation(order.lines, order);
    } catch {
      log.error("odk.checkout.line_reconciliation_failed", { orderId: order.id });
      return { ok: false, reason: "line_total_mismatch", userMessage: "Sipariş toplamı doğrulanamadı. Lütfen sepeti yeniden oluşturun." };
    }
  }
  const contract = parseOdkProductContract(order.contractSnapshot);
  if (!contract.success) {
    return { ok: false, reason: "invalid_contract", userMessage: "Sipariş sözleşmesi geçersiz. Lütfen destek ekibiyle iletişime geçin." };
  }
  const availability = decideOdkCommerceAvailability({
    contract: contract.data,
    rolloutAllowed: odkPublicAccessDecision().allowed,
    packageActive: order.package.isActive,
    paymentReady: true,
  });
  if (!availability.allowed) {
    log.warn("odk.checkout.availability_blocked", { orderId: order.id, reason: availability.reason });
    return { ok: false, reason: `availability_${availability.reason.toLowerCase()}`, userMessage: "Bu paket şu anda yeni satın alımlara açık değil." };
  }
  const pkg = { title: contract.data.package.title, slug: contract.data.package.slug };

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

  const basket: PaytrBasketItem[] = order.lines.length
    ? order.lines.map((line) => [`${line.productName}${line.quantity > 1 ? ` × ${line.quantity}` : ""}`.slice(0, 200), (line.totalCents / 100).toFixed(2), 1])
    : [[pkg.title.slice(0, 200), (order.totalCents / 100).toFixed(2), 1]];

  const okUrl = `${input.origin}/odk-paketleri/${pkg.slug}/satin-al/sonuc?status=success&orderId=${order.id}`;
  const failUrl = `${input.origin}/odk-paketleri/${pkg.slug}/satin-al/sonuc?status=failed&orderId=${order.id}`;

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
