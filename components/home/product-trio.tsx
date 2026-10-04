import { ProductTrioView } from "@/components/home/product-trio-view";
import { listActivePublicProducts } from "@/lib/public-marketing-products-server";

export async function ProductTrio({
  title,
  lede,
  denemeLigiBranding,
}: {
  title?: string;
  lede?: string;
  denemeLigiBranding?: boolean;
} = {}) {
  const products = await listActivePublicProducts();
  return <ProductTrioView products={products} title={title} lede={lede} denemeLigiBranding={denemeLigiBranding} />;
}
