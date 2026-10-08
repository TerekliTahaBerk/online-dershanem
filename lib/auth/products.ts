import "server-only";

import { cache } from "react";
import type { Prisma, ProductCode, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PASSWORD_CHANGE_PATH, PRODUCT_SELECTOR_PATH } from "@/lib/auth/roles";
import { hasProductEntitlement } from "@/lib/auth/product-entitlements";
import { staffAccessibleProducts, userRequiresLoginMfa } from "@/lib/products/staff-permissions";
import { LEGACY_PRODUCT_ORDER, asLegacyProductCode, isLegacyProductCode, membershipProductCode, sortProductCodes } from "@/lib/products/codes";

/** ADMIN'in legacy ürünleri (break-glass; satırlardan bağımsız). */
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
 *
 * `cache()`: panel kabuğu, sayfa guard'ı ve sayfa verisi aynı istekte aynı
 * argümanlarla çağırır; sorgu istek başına bir kez çalışır.
 */
export const getAccessibleProducts = cache(async function getAccessibleProducts(
  userId: string,
  role: UserRole,
  now = new Date(),
): Promise<ProductCode[]> {
  // Personel: ADMIN üç üründe de çalışır (break-glass). TEACHER'ın ürünleri
  // `STAFF_PRODUCT_ASSIGNMENTS` moduna göre ya eski kural (üçü; shadow'da yeni
  // kuralla karşılaştırılıp loglanır) ya da `ProductStaffAssignment` satırlarıdır.
  if (role === "ADMIN") return STAFF_PRODUCTS;
  if (role === "TEACHER") return staffAccessibleProducts(userId, role);

  const memberships = await prisma.productMembership.findMany({
    where: { ...activeMembershipWhere(userId, now), product: { in: [...LEGACY_PRODUCT_ORDER] } },
    select: { product: true },
    orderBy: { product: "asc" },
  });
  return memberships.flatMap((membership) => (membership.product ? [membership.product] : []));
});

export async function hasProductAccess(userId: string, role: UserRole, product: ProductCode): Promise<boolean> {
  return hasProductEntitlement(await getAccessibleProducts(userId, role), product);
}

/**
 * Registry farkında ürün erişimi: legacy kodlar + `products` tablosundan gelen
 * kodlar (ör. "KPSS").
 *
 * - ADMIN: legacy üç ürün + registry'deki bütün aktif ürünler.
 * - TEACHER: personel ürünleri (`staffAccessibleProducts`, moda bağlı) + yalnız KENDİ aktif üyelikleri.
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

  const codes: string[] = role === "ADMIN" ? [...STAFF_PRODUCTS] : role === "TEACHER" ? await staffAccessibleProducts(userId, role) : [];
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
 * ÜRÜN PANELLERİ: parola ve (ayrıcalıklı ürün personeli için) giriş MFA'sından sonra HERKES
 * (Yönetim, Öğretmen, Öğrenci, Veli) ürün paneli seçicisine gider ve OD / OK /
 * ODK'dan gireceği paneli seçer. Seçim `Session.activeProduct`'a yazılır ve
 * yalnız menüyü daraltır; yetki her sayfada guard'larla yeniden doğrulanır.
 *
 * (Bir dönem "TEK PANEL" mimarisinde bu adım kaldırılmıştı; ürün başına ayrı
 * panel kararıyla geri geldi.)
 */
export async function postAuthenticationPath(input: { userId: string; role: UserRole; mustChangePassword: boolean; mfaVerifiedAt?: Date | null }): Promise<string> {
  if (input.mustChangePassword) return PASSWORD_CHANGE_PATH;
  if (!input.mfaVerifiedAt && (await userRequiresLoginMfa(input.userId, input.role))) return "/giris/mfa";
  return PRODUCT_SELECTOR_PATH;
}
