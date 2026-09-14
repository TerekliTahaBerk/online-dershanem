import type { UserRole } from "@prisma/client";
import { isLegacyProductCode } from "./codes";

/**
 * ÜRÜN İÇERİK YETKİSİ — rol → izin matrisi (saf, sunucudan bağımsız).
 *
 * Eğitim içeriği (müfredat kazanımı, soru) yazma yetkisi ne işletme RBAC'ına
 * (`lib/business/permission-matrix.ts`) ne de ürün üyeliğine bağlıdır:
 *
 * - `ProductMembership` bir TÜKETİM hakkıdır (satın alma, promosyon). KPSS'ye
 *   hazırlanan bir öğretmenin KPSS üyeliği olabilir; bu ona içerik yazdırmamalı.
 * - `TEACHER` rolü bugün OD/OK/ODK'ya koşulsuz erişir; KPSS içeriğini bu role
 *   bağlamak her OD öğretmenini otomatik KPSS editörü yapardı.
 *
 * Bu yüzden izin, ürün başına açık atama satırından (`ProductContentRoleAssignment`)
 * gelir ve `<ürün>:content:<eylem>` anahtarıyla adlandırılır (ör. `kpss:content:write`).
 */

export type ProductContentRoleName = "CONTENT_EDITOR";

export type ProductContentAction = "content:read" | "content:write";

export const PRODUCT_CONTENT_ROLE_PERMISSIONS: Record<ProductContentRoleName, readonly ProductContentAction[]> = {
  CONTENT_EDITOR: ["content:read", "content:write"],
};

export function productContentPermissionKey(productCode: string, action: ProductContentAction): string {
  return `${productCode.toLowerCase()}:${action}`;
}

export type ProductContentDecisionInput = {
  platformRole: UserRole;
  isActiveUser: boolean;
  productCode: string;
  action: ProductContentAction;
  /** Kullanıcının aktif (revoke edilmemiş, ürünü aktif) atamaları. */
  assignments: ReadonlyArray<{ productCode: string; role: ProductContentRoleName }>;
};

/**
 * - Pasif kullanıcı: hiçbir izin yok.
 * - ADMIN: platform içerik sahibidir; mevcut ADMIN-only içerik uçları değişmez.
 * - Legacy ürünler (OD/OK/ODK): içerik yazımı ADMIN'e özel kalır; atama satırı
 *   legacy ürünlerde yetki AÇMAZ (yeni bir yazma yolu açılmasın).
 * - TEACHER: yalnız o ürün için rolü eylemi kapsayan atama varsa.
 * - STUDENT / PARENT: asla.
 */
export function decideProductContentPermission(input: ProductContentDecisionInput): boolean {
  if (!input.isActiveUser) return false;
  if (input.platformRole === "ADMIN") return true;
  if (input.platformRole !== "TEACHER") return false;
  if (isLegacyProductCode(input.productCode)) return false;
  return input.assignments.some(
    (assignment) =>
      assignment.productCode === input.productCode &&
      PRODUCT_CONTENT_ROLE_PERMISSIONS[assignment.role].includes(input.action),
  );
}
