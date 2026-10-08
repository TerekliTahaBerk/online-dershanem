import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import { log } from "@/lib/logger";
import { listActiveProducts } from "@/lib/products/registry";
import {
  FALLBACK_PUBLIC_PRODUCT_CODES,
  visiblePublicProducts,
} from "@/lib/public-marketing-products";

/** Ürün aç/kapa işlemi bu etiketi `revalidateTag` ile düşürmelidir. */
export const PUBLIC_PRODUCTS_TAG = "public-products";

/**
 * Header ve footer her public sayfada bu listeyi okur; her istekte veritabanına
 * gitmek her sayfa geçişine bir DB tur süresi ekliyordu. Liste herkes için
 * aynıdır ve yalnız seed/migration ile değişir: istekler arası 5 dk önbellek.
 * Hata önbelleğe girmez (fırlatılır, aşağıda yakalanır), bir sonraki istek
 * yeniden dener.
 */
const readActiveRegistryProductCodes = unstable_cache(
  async (): Promise<string[]> => {
    const products = await listActiveProducts();
    return products.map((product) => product.code);
  },
  ["public-active-product-codes"],
  { tags: [PUBLIC_PRODUCTS_TAG], revalidate: 300 },
);

/**
 * Aynı RSC isteğinde header, footer ve sayfa sorgusunu tek okumada birleştirir.
 * Header/footer her public sayfada render edildiği için registry okuması başarısız
 * olursa (DB kesintisi, bağlantı limiti) sayfa 500'e düşmez; çekirdek ürünlerle devam eder.
 */
const listActiveRegistryProductCodes = cache(async (): Promise<string[]> => {
  try {
    return await readActiveRegistryProductCodes();
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
