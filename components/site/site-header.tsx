import { publicProductDisplayName } from "@/lib/public-product-brands";
import { SiteHeaderClient } from "@/components/site/site-header-client";
import { listActivePublicProducts } from "@/lib/public-marketing-products-server";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";

export async function SiteHeader() {
  const products = await listActivePublicProducts();
  const navigationProducts = products.map((product) => ({
    ...product,
    name: publicProductDisplayName(product),
  }));
  return <SiteHeaderClient products={navigationProducts} dinoAiEnabled={getPanelFeatureFlags().dinoAi} />;
}
