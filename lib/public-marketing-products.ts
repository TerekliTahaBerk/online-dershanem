import {
  publicProducts,
  type PublicProduct,
} from "@/lib/product-architecture";

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
