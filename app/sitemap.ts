import type { MetadataRoute } from "next";
import { blogPosts, siteUrl } from "@/lib/content";
import { prisma } from "@/lib/prisma";

// Dynamic — ODK paketleri DB'den canlı çekiliyor; ISR-friendly olsun diye
// revalidate ile statik üretim + saatlik yenileme.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const blogEntries = blogPosts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}/`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  // ODK paketleri — aktif olanları sitemap'e ekle (DB hata verirse boş geç)
  let odkPackageEntries: MetadataRoute.Sitemap = [];
  try {
    const pkgs = await prisma.odkPackage.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    });
    odkPackageEntries = pkgs.map((p) => ({
      url: `${siteUrl}/odk-paketleri/${p.slug}/`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // sitemap build, DB'siz de geçerli kalmalı
  }

  return [
    { url: `${siteUrl}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    // Exam prep — high SEO value
    { url: `${siteUrl}/tyt/`, lastModified, changeFrequency: "weekly", priority: 0.92 },
    { url: `${siteUrl}/ayt/`, lastModified, changeFrequency: "weekly", priority: 0.92 },
    { url: `${siteUrl}/yks/`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/lgs/`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    // Services
    { url: `${siteUrl}/online-dershane/`, lastModified, changeFrequency: "weekly", priority: 0.88 },
    { url: `${siteUrl}/online-ozel-ders/`, lastModified, changeFrequency: "weekly", priority: 0.88 },
    { url: `${siteUrl}/kamplar/`, lastModified, changeFrequency: "weekly", priority: 0.72 },
    { url: `${siteUrl}/paketler/`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/deneme-kulubu/`, lastModified, changeFrequency: "weekly", priority: 0.85 },
    // ODK
    { url: `${siteUrl}/odk/`, lastModified, changeFrequency: "weekly", priority: 0.85 },
    { url: `${siteUrl}/odk-paketleri/`, lastModified, changeFrequency: "weekly", priority: 0.85 },
    ...odkPackageEntries,
    // About / Info
    { url: `${siteUrl}/misyonumuz/`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/sss/`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/iletisim/`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/kariyer/`, lastModified, changeFrequency: "monthly", priority: 0.55 },
    // Legal
    { url: `${siteUrl}/kvkk/`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/gizlilik/`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/iade/`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    // Blog
    { url: `${siteUrl}/blog/`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    ...blogEntries,
  ];
}
