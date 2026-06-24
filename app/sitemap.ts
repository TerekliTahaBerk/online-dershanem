import type { MetadataRoute } from "next";
import { blogPosts, siteUrl } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/matematik-ders-paketi/`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/online-dershane/`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/online-ozel-ders/`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/yks/`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/lgs/`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/blog/`, lastModified, changeFrequency: "weekly", priority: 0.6 },
    { url: `${siteUrl}/misyonumuz/`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/sss/`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/iletisim/`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/kvkk/`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/gizlilik/`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/iade/`, lastModified, changeFrequency: "monthly", priority: 0.5 },
  ];

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}/`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...blogRoutes];
}
