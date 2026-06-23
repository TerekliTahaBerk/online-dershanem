import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  return [
    { url: `${siteUrl}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/yks/`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/lgs/`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/matematik-ders-paketi/`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/misyonumuz/`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/sss/`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/iletisim/`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/kvkk/`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/gizlilik/`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/iade/`, lastModified, changeFrequency: "monthly", priority: 0.5 },
  ];
}
