export type StoredCartItem = {
  id: string;
  name: string;
  category: string;
  subject: string;
  priceCents: number;
  priceLabel: string;
  qty: number;
};

function isText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

export function sanitizeCartItems(value: unknown): StoredCartItem[] | null {
  if (!Array.isArray(value) || value.length > 20) return null;

  const items: StoredCartItem[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") return null;
    const item = candidate as Partial<StoredCartItem>;
    if (
      !isText(item.id, 120) ||
      !isText(item.name, 160) ||
      !isText(item.category, 40) ||
      !isText(item.subject, 80) ||
      typeof item.priceCents !== "number" ||
      !Number.isSafeInteger(item.priceCents) ||
      item.priceCents <= 0 ||
      item.priceCents > 100_000_000 ||
      typeof item.priceLabel !== "string" ||
      item.priceLabel.length > 60 ||
      typeof item.qty !== "number" ||
      !Number.isSafeInteger(item.qty) ||
      item.qty < 1 ||
      item.qty > 99
    ) {
      return null;
    }

    items.push({
      id: item.id.trim(),
      name: item.name.trim(),
      category: item.category.trim(),
      subject: item.subject.trim(),
      priceCents: item.priceCents,
      priceLabel: item.priceLabel.trim(),
      qty: item.qty,
    });
  }

  return items;
}

export function parseCheckoutCartSnapshot(value: unknown, now = Date.now()): {
  items: StoredCartItem[];
  coupon: { code: string } | null;
  ts: number;
} | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { items?: unknown; coupon?: unknown; ts?: unknown };
  const items = sanitizeCartItems(candidate.items);
  if (!items?.length || typeof candidate.ts !== "number" || !Number.isFinite(candidate.ts)) {
    return null;
  }
  if (candidate.ts > now + 60_000 || now - candidate.ts >= 60 * 60_000) return null;

  const coupon = candidate.coupon;
  if (
    coupon !== null &&
    coupon !== undefined &&
    (!coupon || typeof coupon !== "object" || !isText((coupon as { code?: unknown }).code, 60))
  ) {
    return null;
  }

  return {
    items,
    coupon: coupon && typeof coupon === "object"
      ? { code: (coupon as { code: string }).code.trim() }
      : null,
    ts: candidate.ts,
  };
}
