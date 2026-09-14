import { z } from "zod";
import { OD_NO_SLOT_VALUES, OD_TIME_RANGE_VALUES } from "./placement";

const cartItemSchema = z.object({
  service: z.enum(["OD", "ODK"]).default("OD"), id: z.string().min(1).max(120),
  name: z.string().min(1).max(160), category: z.string().min(1).max(40), subject: z.string().min(1).max(80),
  priceCents: z.number().int().positive().max(100_000_000), priceLabel: z.string().max(60).optional().nullable(),
  qty: z.number().int().min(1).max(99),
  owner: z.object({ fullName: z.string().min(2).max(120), email: z.string().email().max(254), phone: z.string().max(20).optional().nullable() }).optional(),
});

export const odCheckoutInputSchema = z.object({
  category: z.string().max(40).optional().nullable(), subject: z.string().max(80).optional().nullable(),
  packageName: z.string().max(160).optional().nullable(), paymentLink: z.string().max(500).optional().nullable(),
  priceLabel: z.string().max(60).optional().nullable(), items: z.array(cartItemSchema).max(20).optional(),
  fullName: z.string().min(2).max(120), email: z.string().email(), phone: z.string().min(10).max(20),
  tcKimlik: z.string().optional().nullable(), city: z.string().min(1).max(80), district: z.string().min(1).max(80),
  address: z.string().max(500).optional().nullable(), schoolName: z.string().max(160).optional().nullable(),
  classLevel: z.string().min(1).max(20), department: z.string().max(60).optional().nullable(),
  examType: z.string().max(40).optional().nullable(), targetSchool: z.string().max(160).optional().nullable(),
  parentFullName: z.string().max(120).optional().nullable(), parentPhone: z.string().max(20).optional().nullable(),
  parentEmail: z.string().email().max(254).optional().nullable().or(z.literal("")), notes: z.string().max(1000).optional().nullable(),
  availabilityTimeRanges: z.array(z.enum(OD_TIME_RANGE_VALUES)).min(1).max(4),
  earliestStartDate: z.iso.date().optional().nullable().or(z.literal("")), noSlotPreference: z.enum(OD_NO_SLOT_VALUES),
  placementConsent: z.union([z.string(), z.boolean()]).optional(), couponCode: z.string().max(60).optional().nullable(),
  kvkkConsent: z.union([z.string(), z.boolean()]).optional(), marketingConsent: z.union([z.string(), z.boolean()]).optional(),
  paymentConsent: z.union([z.string(), z.boolean()]).optional(),
});

export function consentValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  return typeof value === "string" && (value === "1" || value.toLowerCase() === "true" || value === "on");
}

export const OD_PENDING_ORDER_REUSE_MS = 30 * 60_000;

type ComparableLine = { sku: string; quantity: number; unitPriceCents: number; discountCents: number; totalCents: number; fulfillmentOwnerKey: string };
export function orderLinesMatch(actual: ComparableLine[], expected: ComparableLine[]): boolean {
  return actual.length === expected.length && actual.every((line, index) => {
    const wanted = expected[index];
    return line.sku === wanted.sku && line.quantity === wanted.quantity && line.unitPriceCents === wanted.unitPriceCents &&
      line.discountCents === wanted.discountCents && line.totalCents === wanted.totalCents && line.fulfillmentOwnerKey === wanted.fulfillmentOwnerKey;
  });
}
