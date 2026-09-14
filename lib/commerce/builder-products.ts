import { isLegacyProductCode } from "@/lib/products/codes";
import type { ProductKey } from "./package-builder-pricing";

/**
 * Paket kurucu kartı → registry ürün kodu.
 *
 * Kurucu kartları tasarım metni ve fiyat konfigürasyonu taşıdığı için sabit
 * kalır; hangi kartın GÖRÜNECEĞİ ise registry'ye bağlıdır. KPSS burada YOK:
 * onaylı fiyat/paket kararı olmadan kurucuya kart eklenmez (KPSS Görev 5, Adım 3).
 */
export const BUILDER_PRODUCT_REGISTRY_CODE: Record<ProductKey, string> = {
  dershanem: "OD",
  kocum: "OK",
  denemeKulubum: "ODK",
};

/**
 * Görünür kurucu ürünleri, tanım sırasıyla.
 *
 * - Legacy ürünler (OD/OK/ODK) registry bayrağından etkilenmez — yetki
 *   katmanıyla (`getAccessibleProductCodes`) aynı kural.
 * - Registry ürünü (KPSS) yalnız `activeRegistryCodes` içindeyse görünür;
 *   verilmezse KAPALI (fail-closed). Kaynak `listActiveProducts()`tır.
 */
export function visibleBuilderProducts<K extends string>(
  registryCodes: Record<K, string>,
  activeRegistryCodes: Iterable<string>,
): K[] {
  const active = new Set(activeRegistryCodes);
  return (Object.keys(registryCodes) as K[]).filter((key) => {
    const code = registryCodes[key];
    return isLegacyProductCode(code) || active.has(code);
  });
}

export function builderProductKeys(activeRegistryCodes: Iterable<string> = []): ProductKey[] {
  return visibleBuilderProducts(BUILDER_PRODUCT_REGISTRY_CODE, activeRegistryCodes);
}

/** KPSS fiyat/SKU kararı beklerken kurucuda yalnız keşif kartı olarak görünür. */
export function isKpssBuilderVisible(
  activeRegistryCodes: Iterable<string>,
): boolean {
  return new Set(activeRegistryCodes).has("KPSS");
}
