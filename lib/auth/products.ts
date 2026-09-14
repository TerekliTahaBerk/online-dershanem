import "server-only";

import type { Prisma, ProductCode, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PASSWORD_CHANGE_PATH, rolePath } from "@/lib/auth/roles";
import { hasProductEntitlement } from "@/lib/auth/product-entitlements";
import { LEGACY_PRODUCT_ORDER, asLegacyProductCode, isLegacyProductCode, membershipProductCode, sortProductCodes } from "@/lib/products/codes";

const STAFF_PRODUCTS: ProductCode[] = ["OD", "OK", "ODK"];

function activeMembershipWhere(userId: string, now: Date): Prisma.ProductMembershipWhereInput {
  return {
    userId,
    startsAt: { lte: now },
    revokedAt: null,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

/**
 * Legacy (OD/OK/ODK) ürün erişimi. Davranışı registry köprüsünden ÖNCEKİYLE
 * birebir aynıdır; registry ürünleri (KPSS) burada görünmez. KPSS Görev 5'ten
 * sonra KPSS satırlarında `product` dolu olduğu için süzgeç `not null` değil,
 * açıkça legacy üçlüdür — aksi halde KPSS registry `is_active` kapısını atlardı.
 */
export async function getAccessibleProducts(userId: string, role: UserRole, now = new Date()): Promise<ProductCode[]> {
  // Personel görev gereği üç üründe de çalışır. DB satırları kaynak/audit için
  // tutulur; yanlışlıkla silinmeleri personelin operasyon erişimini kesmez.
  if (role === "ADMIN" || role === "TEACHER") return STAFF_PRODUCTS;

  const memberships = await prisma.productMembership.findMany({
    where: { ...activeMembershipWhere(userId, now), product: { in: [...LEGACY_PRODUCT_ORDER] } },
    select: { product: true },
    orderBy: { product: "asc" },
  });
  return memberships.flatMap((membership) => (membership.product ? [membership.product] : []));
}

export async function hasProductAccess(userId: string, role: UserRole, product: ProductCode): Promise<boolean> {
  return hasProductEntitlement(await getAccessibleProducts(userId, role), product);
}

/**
 * Registry farkında ürün erişimi: legacy kodlar + `products` tablosundan gelen
 * kodlar (ör. "KPSS").
 *
 * - ADMIN: legacy üç ürün + registry'deki bütün aktif ürünler.
 * - TEACHER: legacy üç ürün (görev gereği) + yalnız KENDİ aktif üyelikleri.
 *   Öğretmen KPSS'ye otomatik erişmez; KPSS içerik yazımı ayrıca
 *   `lib/products/content-permissions.ts` ile yetkilendirilir.
 * - STUDENT / PARENT: yalnız aktif üyelikler.
 *
 * Registry ürünü pasifse (`isActive=false`) üyeliği erişim vermez. Legacy
 * satırlar registry bayrağından etkilenmez (mevcut davranış korunur).
 */
export async function getAccessibleProductCodes(userId: string, role: UserRole, now = new Date()): Promise<string[]> {
  const [memberships, activeRegistryProducts] = await Promise.all([
    prisma.productMembership.findMany({
      where: activeMembershipWhere(userId, now),
      select: { product: true, productRef: { select: { code: true, isActive: true } } },
    }),
    role === "ADMIN"
      ? prisma.product.findMany({ where: { isActive: true }, select: { code: true } })
      : Promise.resolve([] as Array<{ code: string }>),
  ]);

  const codes: string[] = role === "ADMIN" || role === "TEACHER" ? [...STAFF_PRODUCTS] : [];
  for (const product of activeRegistryProducts) codes.push(product.code);
  for (const membership of memberships) {
    const code = membershipProductCode(membership);
    if (isLegacyProductCode(code) || membership.productRef?.isActive) codes.push(code);
  }
  return sortProductCodes(codes);
}

/** Ürün kodu string'i ile erişim — legacy kodlarda `hasProductAccess` ile aynı sonuç. */
export async function hasProductCodeAccess(userId: string, role: UserRole, code: string): Promise<boolean> {
  const legacy = asLegacyProductCode(code);
  if (legacy) return hasProductAccess(userId, role, legacy);
  return (await getAccessibleProductCodes(userId, role)).includes(code);
}

/**
 * Girişten sonra gidilecek yer.
 *
 * TEK PANEL: kullanıcı hangi ürünleri aldıysa alsın, aynı panele girer.
 * Ürün seçme adımı YOKTUR — satın alınan ürünler panelin İÇİNDE bölüm olarak
 * açılır ve menü yetkiye göre daralır (bkz. `PanelNav`).
 *
 * Eskiden burada `PRODUCT_SELECTOR_PATH` vardı ve birden çok ürünü olan kullanıcı
 * her girişte "hangi panele gireceksin?" sorusuyla karşılaşıyordu; ürün
 * mimarisi tek panele geçtiği için bu adım kaldırıldı.
 */
export async function postAuthenticationPath(input: { userId: string; role: UserRole; mustChangePassword: boolean; mfaVerifiedAt?: Date | null }): Promise<string> {
  if (input.mustChangePassword) return PASSWORD_CHANGE_PATH;
  if (input.role === "ADMIN" && !input.mfaVerifiedAt) return "/giris/mfa";
  return rolePath(input.role);
}
