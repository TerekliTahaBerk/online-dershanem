import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/content";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/odk-paketleri/*/satin-al",
        ],
      },
      // Aggressive bot'ları engelle (opsiyonel — bandwidth koruması)
      { userAgent: "GPTBot", disallow: "/" },
      { userAgent: "ClaudeBot", disallow: "/" },
      { userAgent: "CCBot", disallow: "/" },
    ],
    host: siteUrl,
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
