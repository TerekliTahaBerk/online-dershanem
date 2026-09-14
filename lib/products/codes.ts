import type { ProductCode } from "@prisma/client";

/**
 * Legacy `ProductCode` enum'u ile registry (`products.code`) arasındaki SAF köprü.
 *
 * NEDEN: KPSS gibi registry'den gelen ürünler `ProductCode` enum'unda yoktur.
 * Yetki kodu bir ürün kodunu string olarak aldığında önce "bu legacy mi?"
 * sorusunu burada sormalıdır. `Record<ProductCode, true>` bilinçli: enum'a değer
 * eklenirse burası derleme hatası verir.
 */
const LEGACY_PRODUCT_CODES: Record<ProductCode, true> = {
  OD: true,
  OK: true,
  ODK: true,
};

/** Enum sıralaması (Postgres enum bildirimi) — mevcut `orderBy: { product: "asc" }` ile aynı. */
export const LEGACY_PRODUCT_ORDER: readonly ProductCode[] = ["OD", "OK", "ODK"];

export function asLegacyProductCode(code: string): ProductCode | null {
  return Object.hasOwn(LEGACY_PRODUCT_CODES, code) ? (code as ProductCode) : null;
}

export function isLegacyProductCode(code: string): code is ProductCode {
  return asLegacyProductCode(code) !== null;
}

/**
 * Bir `ProductMembership` satırının ürün kodu. Registry bağlantısı önceliklidir;
 * köprü öncesi yazılmış satırlar için legacy enum'a düşer. İkisi de yoksa satır
 * bozuktur — sessizce yok saymak yerine gürültülü hata verir.
 */
export function membershipProductCode(row: {
  product: ProductCode | null;
  productRef?: { code: string } | null;
}): string {
  const code = row.productRef?.code ?? row.product;
  if (!code) throw new Error("PRODUCT_MEMBERSHIP_WITHOUT_PRODUCT");
  if (row.product && row.productRef && row.product !== row.productRef.code) {
    throw new Error(`PRODUCT_MEMBERSHIP_BRIDGE_MISMATCH:${row.product}:${row.productRef.code}`);
  }
  return code;
}

/**
 * Legacy etiket/ekran kodu için: yalnız `product` enum'u dolu üyelik satırları.
 * Registry-only (KPSS) satırlar `productLabel(ProductCode)` ile etiketlenemez;
 * bu ekranlar registry adını gösterecek şekilde genişletilene kadar süzülür.
 */
export function legacyMembershipRows<T extends { product: ProductCode | null }>(
  rows: readonly T[],
): Array<T & { product: ProductCode }> {
  return rows.filter((row): row is T & { product: ProductCode } => row.product !== null);
}

/** Legacy kodları enum sırasına, registry kodlarını alfabetik olarak sıralar. */
export function sortProductCodes(codes: Iterable<string>): string[] {
  const unique = [...new Set(codes)];
  const legacy = LEGACY_PRODUCT_ORDER.filter((code) => unique.includes(code));
  const registry = unique.filter((code) => !isLegacyProductCode(code)).sort();
  return [...legacy, ...registry];
}
