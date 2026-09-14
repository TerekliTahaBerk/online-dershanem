import "server-only";

import type { Prisma, PrismaClient, ProductAccessSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { asLegacyProductCode } from "@/lib/products/codes";

type MembershipClient = Prisma.TransactionClient | PrismaClient;

export type GrantProductMembershipInput = {
  userId: string;
  /** Registry kodu: "OD" | "OK" | "ODK" | "KPSS" | … */
  productCode: string;
  source: ProductAccessSource;
  grantedById?: string | null;
  startsAt?: Date;
  expiresAt?: Date | null;
};

/**
 * `ProductMembership` yazımı için registry köprüsü adapter'ı.
 *
 * - Legacy ürün: `(userId, product)` üzerinden upsert, `productRefId` de yazılır.
 * - Registry-only ürün (KPSS): `product` NULL, `(userId, productRefId)` üzerinden upsert.
 *
 * Mevcut legacy yazma yolları (`provisioning`, admin ürün formu) enum ile yazmaya
 * devam eder; migration 0106 trigger'ı `product_ref_id`'yi onlar için doldurur.
 */
export async function grantProductMembership(input: GrantProductMembershipInput, client: MembershipClient = prisma) {
  const product = await client.product.findUnique({
    where: { code: input.productCode },
    select: { id: true, isActive: true },
  });
  if (!product) throw new Error(`PRODUCT_NOT_FOUND:${input.productCode}`);

  const legacy = asLegacyProductCode(input.productCode);
  if (!legacy && !product.isActive) throw new Error(`PRODUCT_INACTIVE:${input.productCode}`);

  const data = {
    source: input.source,
    grantedById: input.grantedById ?? null,
    startsAt: input.startsAt ?? new Date(),
    expiresAt: input.expiresAt ?? null,
    revokedAt: null,
  };

  if (legacy) {
    return client.productMembership.upsert({
      where: { userId_product: { userId: input.userId, product: legacy } },
      create: { userId: input.userId, product: legacy, productRefId: product.id, ...data },
      update: { productRefId: product.id, ...data },
    });
  }

  return client.productMembership.upsert({
    where: { userId_productRefId: { userId: input.userId, productRefId: product.id } },
    create: { userId: input.userId, product: null, productRefId: product.id, ...data },
    update: data,
  });
}

export async function revokeProductMembership(
  input: { userId: string; productCode: string },
  client: MembershipClient = prisma,
) {
  return client.productMembership.updateMany({
    where: { userId: input.userId, productRef: { code: input.productCode }, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
