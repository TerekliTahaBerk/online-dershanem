import type { MetadataRoute } from "next";

export function kpssSitemapRoutes(
  siteUrl: string,
  activeProductCodes: Iterable<string>,
): MetadataRoute.Sitemap {
  return new Set(activeProductCodes).has("KPSS")
    ? [
        {
          url: `${siteUrl}/urunler/kpss`,
          changeFrequency: "weekly",
          priority: 0.9,
        },
      ]
    : [];
}
