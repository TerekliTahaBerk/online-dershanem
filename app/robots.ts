import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/content";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/favicon.ico", "/favicon.png", "/apple-touch-icon.png"]
    },
    host: siteUrl,
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
