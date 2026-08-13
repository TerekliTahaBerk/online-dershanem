import assert from "node:assert/strict";
import test from "node:test";
import { parseCheckoutCartSnapshot, sanitizeCartItems } from "./cart-storage";

const validItem = {
  id: "TYT-AYT__Ders Paketi",
  name: "Matematik Ders Paketi",
  category: "TYT-AYT",
  subject: "Ders Paketi",
  priceCents: 300000,
  priceLabel: "₺3.000 / ay",
  qty: 1,
};

test("sanitizes valid cart items and rejects invalid numeric fields", () => {
  assert.deepEqual(sanitizeCartItems([validItem]), [validItem]);
  assert.equal(sanitizeCartItems([{ ...validItem, qty: 0 }]), null);
  assert.equal(sanitizeCartItems([{ ...validItem, priceCents: Number.NaN }]), null);
});

test("preserves multi-line carts and quantities", () => {
  const replacement = {
    ...validItem,
    id: "YKS__Matematik Ders Paketi",
    name: "YKS Matematik Ders Paketi",
    category: "YKS",
    subject: "Matematik Ders Paketi",
    qty: 7,
  };

  assert.deepEqual(sanitizeCartItems([validItem, replacement]), [validItem, replacement]);
});

test("checkout snapshot enforces TTL and shape", () => {
  const now = 2_000_000;
  assert.ok(parseCheckoutCartSnapshot({ items: [validItem], coupon: null, ts: now }, now));
  assert.equal(parseCheckoutCartSnapshot({ items: [validItem], coupon: null, ts: now - 3_600_000 }, now), null);
  assert.equal(parseCheckoutCartSnapshot({ items: [], coupon: null, ts: now }, now), null);
});
