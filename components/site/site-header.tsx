import { SiteHeaderClient } from "@/components/site/site-header-client";
import { listActivePublicProducts } from "@/lib/public-marketing-products-server";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { denemeLigiDisplayName } from "@/lib/deneme-ligi-brand";

export async function SiteHeader() {
  const products = await listActivePublicProducts();
  const navigationProducts = products.map((product) => ({
    ...product,
    name: denemeLigiDisplayName(product),
  }));
  return <SiteHeaderClient products={navigationProducts} dinoAiEnabled={getPanelFeatureFlags().dinoAi} />;
}
