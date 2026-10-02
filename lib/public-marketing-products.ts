import {
  publicProducts,
  type PublicProduct,
} from "@/lib/product-architecture";

/**
 * Registry okunamadığında public navigasyonun dayandığı çekirdek ürünler.
 * Lansmanı registry bayrağına bağlı ürünler (KPSS) burada bilinçli olarak yok.
 */
export const FALLBACK_PUBLIC_PRODUCT_CODES = ["OD", "OK", "ODK"] as const;

/** Registry kapısı public keşif yüzeylerinin tamamında aynı kararı verir. */
export function visiblePublicProducts(
  activeRegistryCodes: Iterable<string>,
): PublicProduct[] {
  const active = new Set(activeRegistryCodes);
  return publicProducts.filter((product) => active.has(product.registryCode));
}

export function isPublicProductVisible(
  productCode: string,
  activeRegistryCodes: Iterable<string>,
): boolean {
  return visiblePublicProducts(activeRegistryCodes).some(
    (product) => product.registryCode === productCode,
  );
}
