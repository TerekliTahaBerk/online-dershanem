/**
 * Product entitlements — cross-product automation guard.
 */

import type { ProductCode } from "@prisma/client";

export function hasProduct(products: readonly ProductCode[], code: ProductCode): boolean {
  return products.includes(code);
}

export function shouldCreateCoachingProjection(products: readonly ProductCode[]): boolean {
  return hasProduct(products, "OK");
}

export function shouldCreateCoachingRecommendation(products: readonly ProductCode[]): boolean {
  return hasProduct(products, "OK");
}

export function shouldShowCoachingInStudent360(products: readonly ProductCode[]): boolean {
  return hasProduct(products, "OK");
}

export function shouldShowOdkInStudent360(products: readonly ProductCode[]): boolean {
  return hasProduct(products, "ODK");
}

export function shouldShowOdInStudent360(products: readonly ProductCode[]): boolean {
  return hasProduct(products, "OD");
}

export type ProductEntitlementSummary = {
  products: ProductCode[];
  labels: string[];
  hasAll: boolean;
  missing: ProductCode[];
};

const ALL_PRODUCTS: ProductCode[] = ["OD", "OK", "ODK"];

export function summarizeEntitlements(products: readonly ProductCode[]): ProductEntitlementSummary {
  const set = new Set(products);
  const missing = ALL_PRODUCTS.filter((p) => !set.has(p));
  return {
    products: [...products],
    labels: products.map((p) => ({ OD: "Dershanem", OK: "Koçum", ODK: "Deneme Kulübü" }[p])),
    hasAll: missing.length === 0,
    missing,
  };
}
