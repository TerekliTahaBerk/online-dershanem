import "server-only";

import type { ExamFamily, Product, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const LEGACY_PRODUCT_CODES = ["OD", "OK", "ODK"] as const;
export const LEGACY_CURRICULUM_EXAM_CODES = ["LGS", "TYT", "AYT", "YDT"] as const;
export const LEGACY_ODK_EXAM_FAMILY_CODES = ["LGS", "TYT", "AYT"] as const;

type ExamFamilyListOptions = {
  productCode?: string;
  codes?: readonly string[];
};

export async function getProductByCode(code: string): Promise<Product> {
  return prisma.product.findUniqueOrThrow({ where: { code } });
}

export async function listActiveProducts(): Promise<Product[]> {
  return prisma.product.findMany({
    where: { isActive: true },
    orderBy: [{ name: "asc" }, { code: "asc" }],
  });
}

export async function getExamFamilyByCode(code: string): Promise<ExamFamily> {
  return prisma.examFamily.findUniqueOrThrow({ where: { code } });
}

export async function listActiveExamFamilies(
  options: ExamFamilyListOptions = {},
): Promise<ExamFamily[]> {
  const where: Prisma.ExamFamilyWhereInput = {
    isActive: true,
    product: { isActive: true },
    ...(options.productCode ? { product: { code: options.productCode, isActive: true } } : {}),
    ...(options.codes ? { code: { in: [...options.codes] } } : {}),
  };

  return prisma.examFamily.findMany({
    where,
    orderBy: [{ name: "asc" }, { code: "asc" }],
  });
}
