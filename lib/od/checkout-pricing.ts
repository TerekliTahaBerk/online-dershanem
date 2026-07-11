import { getPackagePriceCents } from "@/lib/content";

export type CatalogCheckoutItem = {
  id: string;
  name: string;
  category: string;
  subject: string;
  qty: number;
};

export type PricedCheckoutItem = CatalogCheckoutItem & {
  priceCents: number;
};

/**
 * Resolve checkout prices exclusively from the server-owned catalog.
 * Client-supplied labels and prices are display data and must never affect
 * the amount charged by PayTR.
 */
export function priceCatalogItems(
  items: CatalogCheckoutItem[],
): PricedCheckoutItem[] | null {
  if (items.length !== 1 || items[0].qty !== 1) return null;

  const priced = items.map((item) => ({
    ...item,
    name: `${item.category} ${item.subject}`.trim(),
    priceCents: getPackagePriceCents(item.category, item.subject),
  }));

  return priced.every((item) => item.priceCents > 0) ? priced : null;
}

export function priceCatalogSelection(input: {
  category: string | null | undefined;
  subject: string | null | undefined;
}): number {
  const category = input.category?.trim();
  const subject = input.subject?.trim();
  if (!category || !subject) return 0;
  return getPackagePriceCents(category, subject);
}
