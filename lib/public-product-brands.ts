import { yonBrand } from "@/lib/yon-brand";
import { denemeLigiBrand } from "@/lib/deneme-ligi-brand";

/** Public presentation only; product identifiers and commerce labels stay intact. */
export function publicProductBrand(href: string) {
  if (href === yonBrand.href) return { ...yonBrand, tone: "blue" as const };
  if (href === denemeLigiBrand.href) return { ...denemeLigiBrand, tone: "purple" as const };
  return undefined;
}

export function publicProductDisplayName(product: { name: string; href: string }, compact = false) {
  const brand = publicProductBrand(product.href);
  return brand ? compact ? brand.shortName : brand.name : product.name;
}
