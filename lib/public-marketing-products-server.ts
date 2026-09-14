import "server-only";

import { cache } from "react";
import { listActiveProducts } from "@/lib/products/registry";
import { visiblePublicProducts } from "@/lib/public-marketing-products";

/** Aynı RSC isteğinde header, footer ve sayfa sorgusunu tek DB okumasında birleştirir. */
const listActiveRegistryProducts = cache(listActiveProducts);

export async function listActivePublicProducts() {
  const products = await listActiveRegistryProducts();
  return visiblePublicProducts(products.map((product) => product.code));
}

export async function listActivePublicProductCodes() {
  const products = await listActiveRegistryProducts();
  return products.map((product) => product.code);
}
