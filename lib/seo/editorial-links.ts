import { blogPosts } from "@/lib/blog-content";
import { yonBrand } from "@/lib/yon-brand";
import { denemeLigiBrand } from "@/lib/deneme-ligi-brand";
import type { MarketingProduct } from "@/lib/marketing-application";

/** Editorial intent mapping, not an assertion that a query belongs to a brand. */
const planningSlugs = new Set([
  "lgs-matematik-calisma-programi", "tyt-matematik-calisma-programi",
  "ayt-matematik-calisma-programi", "yks-online-ders-calisma-plani",
  "online-ders-calisma-programi", "online-ders-disiplini-nasil-kurulur",
]);
const analysisSlugs = new Set(["deneme-analizi-nasil-yapilir", "matematik-deneme-analizi"]);

export function articleProduct(slug: string) {
  if (analysisSlugs.has(slug)) return { key: "deneme-ligi" as const, name: denemeLigiBrand.shortName, href: denemeLigiBrand.href, description: "Online denemeye katılım, desteklenen sonuç raporları ve erişim koşullarını incele." };
  if (planningSlugs.has(slug)) return { key: "yon-kocluk" as const, name: yonBrand.shortName, href: yonBrand.href, description: "Kişisel haftalık çalışma planı ve birebir koç görüşmeleriyle planını nasıl uygulayabileceğini keşfet." };
  return { key: "online-dershanem" as const, name: "Online Dershanem", href: "/urunler/online-dershanem", description: "LGS ve YKS için birebir veya en fazla dört kişilik canlı ders seçeneklerini incele." };
}

const readingSlugs: Record<MarketingProduct, readonly string[]> = {
  "online-dershanem": ["online-dershane-fiyatlari-2026", "online-ozel-ders-mi-dershane-mi", "matematikte-temel-eksigi-nasil-kapatilir"],
  "yon-kocluk": ["lgs-matematik-calisma-programi", "tyt-matematik-calisma-programi", "online-ders-disiplini-nasil-kurulur"],
  "deneme-ligi": ["matematik-deneme-analizi", "deneme-analizi-nasil-yapilir", "ayt-matematik-calisma-programi"],
};

export function productReading(product: MarketingProduct) {
  return readingSlugs[product].flatMap(slug => {
    const post = blogPosts.find(item => item.slug === slug);
    return post ? [{ title: post.title, href: `/blog/${post.slug}` }] : [];
  });
}
