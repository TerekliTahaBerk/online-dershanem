import "server-only";

import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isLegacyProductCode } from "@/lib/products/codes";
import {
  decideProductContentPermission,
  type ProductContentAction,
} from "@/lib/products/content-permission-matrix";

/**
 * Oturum → aktif içerik rol atamaları → `decideProductContentPermission`.
 *
 * Rol ve durum oturumdan değil veritabanından okunur: admin önizleme/öğretmen
 * modu overlay'leri içerik yazma yetkisini değiştirmemeli.
 */
export async function hasProductContentPermission(
  userId: string,
  productCode: string,
  action: ProductContentAction,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      status: true,
      productContentRoles: {
        where: { revokedAt: null, product: { isActive: true } },
        select: { role: true, product: { select: { code: true } } },
      },
    },
  });
  if (!user) return false;
  return decideProductContentPermission({
    platformRole: user.role,
    isActiveUser: user.status === "ACTIVE",
    productCode,
    action,
    assignments: user.productContentRoles.map((assignment) => ({
      productCode: assignment.product.code,
      role: assignment.role,
    })),
  });
}

export type CurriculumOutcomeWriteDecision =
  | { ok: true; versionId: string; productCode: string; legacy: boolean }
  | { ok: false };

/**
 * `POST /api/panel/curriculum/outcomes` için karar: sürüm hangi ürüne ait ve
 * bu kullanıcı o ürünün içeriğini yazabilir mi?
 *
 * - Legacy ürün sürümleri (LGS/TYT/AYT/YDT → OD/ODK): yalnız ADMIN (mevcut davranış).
 * - Registry ürün sürümleri (KPSS): `<ürün>:content:write` izni.
 * - Bulunamayan ve yetkisiz aynı `{ ok: false }` → 404 (varlık sızdırılmaz).
 */
export async function authorizeCurriculumOutcomeWrite(input: {
  versionId: string;
  userId: string;
  role: UserRole;
}): Promise<CurriculumOutcomeWriteDecision> {
  const version = await prisma.curriculumVersion.findFirst({
    where: { id: input.versionId, status: { not: "ARCHIVED" } },
    select: { id: true, examFamilyRef: { select: { product: { select: { code: true } } } } },
  });
  if (!version) return { ok: false };

  // Köprü öncesi legacy sürümlerde registry bağlantısı olmayabilir: OD varsayılır.
  const productCode = version.examFamilyRef?.product.code ?? "OD";
  if (isLegacyProductCode(productCode)) {
    return input.role === "ADMIN" ? { ok: true, versionId: version.id, productCode, legacy: true } : { ok: false };
  }
  return (await hasProductContentPermission(input.userId, productCode, "content:write"))
    ? { ok: true, versionId: version.id, productCode, legacy: false }
    : { ok: false };
}
