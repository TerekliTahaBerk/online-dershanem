export type PublicProduct = {
  slug: "online-dershanem" | "online-kocum" | "online-deneme-kulubum" | "kpss";
  registryCode: "OD" | "OK" | "ODK" | "KPSS";
  name: string;
  label: string;
  href: string;
  role: string;
  eyebrow: string;
  description: string;
  audiences: readonly string[];
  accent: "olive" | "yellow" | "sky" | "amber";
};

/**
 * Public product architecture's single source of truth.
 * Commerce routes stay product-specific; this catalog owns discovery and positioning.
 */
export const publicProducts = [
  {
    slug: "online-dershanem",
    registryCode: "OD",
    name: "Online Dershanem",
    label: "Dershanem",
    href: "/urunler/online-dershanem",
    role: "Çok dersli canlı öğrenme",
    eyebrow: "Birlikte öğren",
    description:
      "LGS ve YKS öğrencileri için birden fazla derste canlı öğrenme, öğretmen geri bildirimi ve ders sonrası net çalışma yönü.",
    audiences: ["LGS", "YKS"],
    accent: "olive",
  },
  {
    slug: "online-kocum",
    registryCode: "OK",
    name: "Online Koçum",
    label: "Koçum",
    href: "/urunler/online-kocum",
    role: "Planlama ve sürdürülebilir takip",
    eyebrow: "Düzenini kur",
    description:
      "LGS ve YKS öğrencileri için hedefi haftalık plana çeviren, ilerlemeyi görünür kılan ve ihtiyaç halinde destek istemeyi kolaylaştıran takip düzeni.",
    audiences: ["LGS", "YKS"],
    accent: "yellow",
  },
  {
    slug: "online-deneme-kulubum",
    registryCode: "ODK",
    name: "Online Deneme Kulübüm",
    label: "Deneme Kulübüm",
    href: "/urunler/online-deneme-kulubum",
    role: "Ölçme, analiz ve sonraki adım",
    eyebrow: "Nerede olduğunu gör",
    description:
      "LGS, TYT ve AYT için planlı online denemeler, kazanım analizi ve gelişimi takip etmeye yardımcı raporlar.",
    audiences: ["LGS", "TYT", "AYT"],
    accent: "sky",
  },
  {
    slug: "kpss",
    registryCode: "KPSS",
    name: "KPSS",
    label: "KPSS",
    href: "/urunler/kpss",
    role: "Sınav gününe kadar kişisel çalışma planı",
    eyebrow: "Planlı hazırlan",
    description:
      "Öğretmen adayları için sınav tarihine, çalışma kapasitesine ve konu ilerlemesine göre şekillenen kişisel hazırlık düzeni.",
    audiences: ["KPSS"],
    accent: "amber",
  },
] as const satisfies readonly PublicProduct[];

/**
 * Dino AI üç ürünü birbirine bağlayan ortak katmandır.
 *
 * Ayrıntı: `/dino-ai`.
 */
export const sharedIntelligenceLayer = {
  name: "Dino AI",
  role: "Üç ürünün ortak zekâ katmanı",
  href: "/dino-ai",
  status: "Ortak katman",
  description:
    "Ders geri bildirimini, çalışma planını ve deneme analizini öğrencinin anlayabileceği tek bir sonraki adıma dönüştürmeyi hedefliyor.",
  productSlugs: publicProducts.map((product) => product.slug),
} as const;

export const publicProductBySlug = Object.fromEntries(
  publicProducts.map((product) => [product.slug, product]),
) as Record<PublicProduct["slug"], (typeof publicProducts)[number]>;
