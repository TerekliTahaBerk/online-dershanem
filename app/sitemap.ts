import type { MetadataRoute } from "next";
import { blogPosts } from "@/lib/blog-content";
import { blogPublishedAt } from "@/lib/blog-meta";
import { siteUrl } from "@/lib/content";
import { listPublicOdkPackages } from "@/lib/odk/public-commerce-server";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const odkPackages = await listPublicOdkPackages();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/urunler`, changeFrequency: "weekly", priority: 0.95 },
    { url: `${siteUrl}/urunler/online-dershanem`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/urunler/online-kocum`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/urunler/online-deneme-kulubum`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/ders-paketleri`, changeFrequency: "weekly", priority: 0.85 },
    // Paket kurucu — navbar'ın birincil CTA'sı ve indexlenebilir; sitemap'te
    // yoktu.
    { url: `${siteUrl}/paketler`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${siteUrl}/dino-ai`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/matematik`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/kamplar`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/online-ozel-ders`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/yks`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/lgs`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/blog`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${siteUrl}/hakkimizda`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/misyonumuz`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/sss`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/iletisim`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/kvkk`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/gizlilik`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/iade`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: blogPublishedAt[post.slug],
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const odkRoutes: MetadataRoute.Sitemap = odkPackages.map((item) => ({
    url: `${siteUrl}/odk-paketleri/${item.contract.package.slug}`,
    lastModified: item.contract.capturedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...odkRoutes, ...blogRoutes];
}
