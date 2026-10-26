import { application } from "./application";

export type MarketingProduct = "online-dershanem" | "yon-kocluk" | "deneme-ligi";
export const campaignKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

/** QK6MYp ledger verified 2026-10-26: source + UTMs exist; product/exam do not. */
export function marketingApplicationUrl(product?: MarketingProduct, search = ""): string {
  const url = new URL(application.href);
  if (product) url.searchParams.set("source", `website_${product}`);
  const input = new URLSearchParams(search);
  for (const key of campaignKeys) {
    const value = input.get(key);
    // Campaign slugs only. Never forward arbitrary query strings, ref or account IDs.
    if (value && /^[a-z][a-z0-9_-]{0,63}$/.test(value)) url.searchParams.set(key, value);
  }
  return url.toString();
}
