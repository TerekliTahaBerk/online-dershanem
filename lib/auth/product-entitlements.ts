import type { ProductCode } from "@prisma/client";

export function hasProductEntitlement(products: readonly ProductCode[], product: ProductCode): boolean {
  return products.includes(product);
}
