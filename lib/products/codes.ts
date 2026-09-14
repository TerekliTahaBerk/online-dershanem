import type { ProductCode } from "@prisma/client";

/**
 * Legacy `ProductCode` enum'u ile registry (`products.code`) arasındaki SAF köprü.
 *
 * NEDEN: registry'den gelen ürünler (KPSS) önce enum dışındaydı. KPSS Görev 5'te
 * ticari akışın `Record<…>` tamlığı için enum'a alındı AMA "legacy" sayılmaz:
 * legacy ürünler (OD/OK/ODK) registry `is_active` bayrağından etkilenmez ve veliye
 * açıktır; KPSS ise registry kapısına ve veli-free politikaya tabidir.
 * Yetki kodu bir ürün kodunu string olarak aldığında önce "bu legacy mi?"
 * sorusunu burada sormalıdır. `Record<ProductCode, boolean>` bilinçli: enum'a değer
 * eklenirse burası derleme hatası verir ve yeni değer için açık karar gerekir.
 */
const LEGACY_PRODUCT_CODES: Record<ProductCode, boolean> = {
  OD: true,
  OK: true,
  ODK: true,
  KPSS: false,
};

/** Enum sıralaması (Postgres enum bildirimi) — mevcut `orderBy: { product: "asc" }` ile aynı. */
export const LEGACY_PRODUCT_ORDER: readonly ProductCode[] = ["OD", "OK", "ODK"];

/** `ProductCode` enum üyesi mi (legacy olsun olmasın)? */
export function asProductCodeEnum(code: string): ProductCode | null {
  return Object.hasOwn(LEGACY_PRODUCT_CODES, code) ? (code as ProductCode) : null;
}

export function asLegacyProductCode(code: string): ProductCode | null {
  const product = asProductCodeEnum(code);
  return product && LEGACY_PRODUCT_CODES[product] ? product : null;
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
 * `ProductMembership` yazımı için köprü değerleri: registry satırından hem
 * `productRefId` hem (kod enum üyesiyse) `product` birlikte türetilir.
 *
 * KPSS artık enum üyesi olduğu için `product` NULL bırakılamaz; biri dolu diğeri
 * boş ya da ikisi farklı ürünü gösteren bir yazım burada durdurulur. Migration
 * 0106 trigger'ı aynı kuralı veritabanında da uygular — bu kontrol hatayı
 * sorgudan önce ve okunur bir kodla verir.
 */
export function membershipBridgeValues(
  registry: { id: string; code: string },
  product?: ProductCode | null,
): { product: ProductCode | null; productRefId: string } {
  if (!registry.id) throw new Error(`PRODUCT_MEMBERSHIP_REF_MISSING:${registry.code}`);
  const expected = asProductCodeEnum(registry.code);
  if (product !== undefined && product !== expected) {
    throw new Error(`PRODUCT_MEMBERSHIP_BRIDGE_MISMATCH:${product ?? "NULL"}:${registry.code}`);
  }
  return { product: expected, productRefId: registry.id };
}

/**
 * Legacy etiket/ekran kodu için: yalnız legacy (OD/OK/ODK) üyelik satırları.
 * Registry ürünleri (KPSS) bu ekranlar registry adını gösterecek şekilde
 * genişletilene kadar süzülür.
 */
export function legacyMembershipRows<T extends { product: ProductCode | null }>(
  rows: readonly T[],
): Array<T & { product: ProductCode }> {
  return rows.filter(
    (row): row is T & { product: ProductCode } => row.product !== null && LEGACY_PRODUCT_CODES[row.product],
  );
}

/** Legacy kodları enum sırasına, registry kodlarını alfabetik olarak sıralar. */
export function sortProductCodes(codes: Iterable<string>): string[] {
  const unique = [...new Set(codes)];
  const legacy = LEGACY_PRODUCT_ORDER.filter((code) => unique.includes(code));
  const registry = unique.filter((code) => !isLegacyProductCode(code)).sort();
  return [...legacy, ...registry];
}
