import type { MetadataRoute } from "next";
import { blogPosts, siteUrl } from "@/lib/content";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const blogEntries = blogPosts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}/`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.75
  }));

  return [
    { url: `${siteUrl}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/yks/`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/lgs/`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/online-dershane/`, lastModified, changeFrequency: "weekly", priority: 0.88 },
    { url: `${siteUrl}/online-ozel-ders/`, lastModified, changeFrequency: "weekly", priority: 0.88 },
    { url: `${siteUrl}/kamplar/`, lastModified, changeFrequency: "weekly", priority: 0.72 },
    { url: `${siteUrl}/paketler/`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/kvkk/`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/gizlilik/`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/iade/`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/blog/`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    ...blogEntries
  ];
}
