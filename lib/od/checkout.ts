/**
 * OD (Online Dershanem) checkout orchestration — PayTR iframe token oluşturur.
 *
 * ODK ile aynı PayTR altyapısını kullanır; merchant_oid prefix'i "OD" olur,
 * unified callback (/api/paytr/callback) prefix'e göre doğru handler'ı çağırır.
 *
 * Başarılı ödeme sonrası `lib/od/finance.ts → markOdOrderPaid()` çağrılır;
 * müşteri ve operasyon e-postaları gönderilir.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import {
  buildMerchantOid,
  createPaytrIframeToken,
  isPaytrConfigured,
  type PaytrBasketItem,
} from "@/lib/odk/paytr";
import { assertOrderLineReconciliation } from "@/lib/commerce/order-lines";

export type OdCheckoutResult =
  | { ok: true; orderId: string; iframeUrl: string }
  | { ok: false; reason: string; userMessage: string };

export async function createOdCheckoutSession(input: {
  orderId: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  userAddress?: string;
  userIp: string;
  origin: string;
}): Promise<OdCheckoutResult> {
  if (!isPaytrConfigured()) {
    return {
      ok: false,
      reason: "paytr_not_configured",
      userMessage: "Ödeme sistemi henüz aktif değil. Lütfen iletişime geçin.",
    };
  }

  const order = await prisma.odOrder.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      status: true,
      totalCents: true,
      packageName: true,
      buyerInfo: true,
      subtotalCents: true,
      discountCents: true,
      lines: { orderBy: { position: "asc" }, select: { position: true, productName: true, quantity: true, unitPriceCents: true, subtotalCents: true, discountCents: true, taxCents: true, totalCents: true } },
    },
  });
  if (!order) {
    return { ok: false, reason: "order_not_found", userMessage: "Sipariş bulunamadı." };
  }
  if (order.status !== "PENDING") {
    return {
      ok: false,
      reason: "order_not_pending",
      userMessage: "Bu sipariş zaten işlenmiş.",
    };
  }
  if (order.totalCents <= 0) {
    return {
      ok: false,
      reason: "invalid_price",
      userMessage: "Paket fiyatı geçersiz. Lütfen iletişime geçin.",
    };
  }
  if (order.lines.length) {
    try {
      assertOrderLineReconciliation(order.lines, order);
    } catch {
      log.error("od.checkout.line_reconciliation_failed", { orderId: order.id });
      return { ok: false, reason: "line_total_mismatch", userMessage: "Sipariş toplamı doğrulanamadı. Lütfen sepeti yeniden oluşturun." };
    }
  }

  const merchantOid = buildMerchantOid(order.id, "OD");

  // PENDING Payment satırı
  const existing = await prisma.odPayment.findFirst({
    where: { orderId: order.id, provider: "PAYTR", providerRef: merchantOid },
    select: { id: true },
  });
  if (existing) {
    await prisma.odPayment.update({
      where: { id: existing.id },
      data: { status: "PENDING", amountCents: order.totalCents, failureReason: null },
    });
  } else {
    await prisma.odPayment.create({
      data: {
        orderId: order.id,
        provider: "PAYTR",
        providerRef: merchantOid,
        status: "PENDING",
        amountCents: order.totalCents,
      },
    });
  }

  // Basket'i sipariş oluşturulurken doğrulanmış sepet snapshot'ından oluştur.
  const buyer = (order.buyerInfo ?? {}) as Record<string, unknown>;
  const cart = Array.isArray(buyer.cart)
    ? (buyer.cart as Array<{ name: string; priceCents: number; qty: number }>)
    : null;

  const basket: PaytrBasketItem[] = order.lines.length > 0
    ? order.lines.map((line) => [
        `${line.productName}${line.quantity > 1 ? ` × ${line.quantity}` : ""}`.slice(0, 200),
        (line.totalCents / 100).toFixed(2),
        1,
      ])
    :
    cart && cart.length > 0
      ? cart.map((c) => [
          c.name.slice(0, 200),
          (c.priceCents / 100).toFixed(2),
          Math.max(1, Math.floor(c.qty || 1)),
        ])
      : [[order.packageName.slice(0, 200), (order.totalCents / 100).toFixed(2), 1]];

  const resultUrl = `${input.origin}/paketler/satin-al/sonuc?orderId=${encodeURIComponent(order.id)}`;
  const okUrl = `${resultUrl}&status=success`;
  const failUrl = `${resultUrl}&status=failed`;

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
    log.warn("od.checkout.token_failed", { orderId: order.id, reason: tokenRes.reason });
    return {
      ok: false,
      reason: tokenRes.reason,
      userMessage:
        "Ödeme başlatılamadı. Lütfen birkaç dakika sonra tekrar deneyin veya iletişime geçin.",
    };
  }

  log.info("od.checkout.token_ready", { orderId: order.id, merchantOid });
  return { ok: true, orderId: order.id, iframeUrl: tokenRes.iframeUrl };
}
