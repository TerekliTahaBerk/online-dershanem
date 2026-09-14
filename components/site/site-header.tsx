import { SiteHeaderClient } from "@/components/site/site-header-client";
import { listActivePublicProducts } from "@/lib/public-marketing-products-server";

export async function SiteHeader() {
  const products = await listActivePublicProducts();
  return <SiteHeaderClient products={products} />;
}
