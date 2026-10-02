import "server-only";

import { cache } from "react";
import { log } from "@/lib/logger";
import { listActiveProducts } from "@/lib/products/registry";
import {
  FALLBACK_PUBLIC_PRODUCT_CODES,
  visiblePublicProducts,
} from "@/lib/public-marketing-products";

/**
 * Aynı RSC isteğinde header, footer ve sayfa sorgusunu tek DB okumasında birleştirir.
 * Header/footer her public sayfada render edildiği için registry okuması başarısız
 * olursa (DB kesintisi, bağlantı limiti) sayfa 500'e düşmez; çekirdek ürünlerle devam eder.
 */
const listActiveRegistryProductCodes = cache(async (): Promise<string[]> => {
  try {
    const products = await listActiveProducts();
    return products.map((product) => product.code);
  } catch (error) {
    log.warn("public.products.registry_unavailable", undefined, error);
    return [...FALLBACK_PUBLIC_PRODUCT_CODES];
  }
});

export async function listActivePublicProducts() {
  return visiblePublicProducts(await listActiveRegistryProductCodes());
}

export async function listActivePublicProductCodes() {
  return listActiveRegistryProductCodes();
}
