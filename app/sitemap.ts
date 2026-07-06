import type { MetadataRoute } from "next";
import { blogPosts, siteUrl } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/ders-paketleri`, changeFrequency: "weekly", priority: 0.95 },
    { url: `${siteUrl}/matematik-ders-paketi`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/kamplar`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/online-dershane`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/online-ozel-ders`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/yks`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/lgs`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/blog`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${siteUrl}/misyonumuz`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/sss`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/iletisim`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/kvkk`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/gizlilik`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/iade`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...blogRoutes];
}
