/**
 * Discount/Coupon helper — kod doğrulama + tutar hesaplama + redemption kaydı.
 *
 * Tasarım:
 *  - `validateCoupon()`  → salt-okunur kontrol (sepette canlı önizleme)
 *  - `redeemCoupon()`    → transaction içinde, sipariş PAID olurken çağrılır
 *
 * Kullanım sınırları: usageLimit (global), perUserLimit (kişi başı), tarih,
 * minOrderCents, service eşleşmesi, maxDiscountCents (PERCENT için cap).
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type ValidateInput = {
  code: string;
  customerKey: string;
  service: "OD" | "ODK";
  subtotalCents: number;
};

export type ValidateResult =
  | {
      ok: true;
      couponId: string;
      code: string;
      description: string | null;
      discountCents: number;
      kindLabel: string; // "%20 indirim" / "₺200 indirim"
    }
  | { ok: false; reason: string; userMessage: string };

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().slice(0, 60);
}

function computeDiscount(
  coupon: {
    type: "PERCENT" | "FIXED";
    value: number;
    maxDiscountCents: number;
  },
  subtotalCents: number,
): number {
  let amount = 0;
  if (coupon.type === "PERCENT") {
    const pct = Math.max(1, Math.min(100, coupon.value));
    amount = Math.floor((subtotalCents * pct) / 100);
    if (coupon.maxDiscountCents > 0) {
      amount = Math.min(amount, coupon.maxDiscountCents);
    }
  } else {
    amount = Math.min(coupon.value, subtotalCents);
  }
  // Asla siparişi negatife düşürme
  return Math.max(0, Math.min(amount, subtotalCents));
}

function kindLabel(coupon: { type: "PERCENT" | "FIXED"; value: number }): string {
  if (coupon.type === "PERCENT") return `%${coupon.value} indirim`;
  return `${(coupon.value / 100).toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  })} indirim`;
}

export async function validateCoupon(input: ValidateInput): Promise<ValidateResult> {
  const code = normalizeCode(input.code);
  if (!code) {
    return { ok: false, reason: "empty", userMessage: "Lütfen bir kod girin." };
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      description: true,
      type: true,
      service: true,
      value: true,
      minOrderCents: true,
      maxDiscountCents: true,
      usageLimit: true,
      perUserLimit: true,
      startsAt: true,
      expiresAt: true,
      isActive: true,
      _count: { select: { redemptions: true } },
    },
  });

  if (!coupon || !coupon.isActive) {
    return { ok: false, reason: "not_found", userMessage: "Geçersiz indirim kodu." };
  }
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    return { ok: false, reason: "not_yet", userMessage: "Bu kod henüz aktif değil." };
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    return { ok: false, reason: "expired", userMessage: "Bu kodun süresi dolmuş." };
  }
  if (coupon.service !== "ALL" && coupon.service !== input.service) {
    return {
      ok: false,
      reason: "service_mismatch",
      userMessage: "Bu kod bu ürün grubunda geçerli değil.",
    };
  }
  if (coupon.minOrderCents > 0 && input.subtotalCents < coupon.minOrderCents) {
    const min = (coupon.minOrderCents / 100).toLocaleString("tr-TR", {
      style: "currency",
      currency: "TRY",
    });
    return {
      ok: false,
      reason: "min_order",
      userMessage: `Bu kod en az ${min} sepet tutarı için geçerli.`,
    };
  }
  if (coupon.usageLimit > 0 && coupon._count.redemptions >= coupon.usageLimit) {
    return { ok: false, reason: "limit_global", userMessage: "Bu kodun kullanım hakkı dolmuş." };
  }
  if (coupon.perUserLimit > 0) {
    const used = await prisma.couponRedemption.count({
      where: { couponId: coupon.id, customerKey: input.customerKey },
    });
    if (used >= coupon.perUserLimit) {
      return {
        ok: false,
        reason: "limit_user",
        userMessage: "Bu kodu daha önce kullandınız.",
      };
    }
  }

  const discountCents = computeDiscount(coupon, input.subtotalCents);
  if (discountCents <= 0) {
    return { ok: false, reason: "zero_discount", userMessage: "Bu kod sepetinize indirim sağlamadı." };
  }

  return {
    ok: true,
    couponId: coupon.id,
    code: coupon.code,
    description: coupon.description,
    discountCents,
    kindLabel: kindLabel(coupon),
  };
}

/**
 * Sipariş PAID olurken transaction içinde çağrılır.
 * Coupon'u tekrar doğrular (race-safe), CouponRedemption satırı yazar.
 * Hata fırlatmaz — coupon geçersiz hâle gelmişse usulüne uygun no-op döner.
 */
export async function redeemCoupon(
  tx: Prisma.TransactionClient,
  input: {
    couponId: string;
    customerKey: string;
    orderService: "OD" | "ODK";
    orderId: string;
    discountCents: number;
  },
): Promise<{ ok: boolean; reason?: string }> {
  // Idempotency: aynı (couponId, orderId, orderService) için tek redemption.
  const existing = await tx.couponRedemption.findFirst({
    where: {
      couponId: input.couponId,
      orderService: input.orderService,
      orderId: input.orderId,
    },
    select: { id: true },
  });
  if (existing) return { ok: true, reason: "already_redeemed" };

  // Yeniden doğrula — race koşulu için minimum kontrol
  const coupon = await tx.coupon.findUnique({
    where: { id: input.couponId },
    select: {
      id: true,
      isActive: true,
      usageLimit: true,
      perUserLimit: true,
      startsAt: true,
      expiresAt: true,
      _count: { select: { redemptions: true } },
    },
  });
  if (!coupon || !coupon.isActive) return { ok: false, reason: "inactive" };
  const now = new Date();
  if (coupon.expiresAt && coupon.expiresAt < now) return { ok: false, reason: "expired" };
  if (coupon.usageLimit > 0 && coupon._count.redemptions >= coupon.usageLimit) {
    return { ok: false, reason: "limit_global" };
  }
  if (coupon.perUserLimit > 0) {
    const used = await tx.couponRedemption.count({
      where: { couponId: input.couponId, customerKey: input.customerKey },
    });
    if (used >= coupon.perUserLimit) return { ok: false, reason: "limit_user" };
  }

  await tx.couponRedemption.create({
    data: {
      couponId: input.couponId,
      customerKey: input.customerKey,
      orderService: input.orderService,
      orderId: input.orderId,
      discountCents: input.discountCents,
    },
  });
  return { ok: true };
}
