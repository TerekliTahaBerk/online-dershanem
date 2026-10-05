/** Public presentation only. Never use these labels for registry, commerce or panel identity. */
export const yonBrand = {
  name: "onlinekoçum. × Yön Koçluk",
  parentName: "onlinekoçum.",
  mediumName: "onlinekoçum. × Yön",
  shortName: "Yön Koçluk",
  href: "/urunler/online-kocum",
  headline: "Yönünü belirle. Planını uygula.",
  description: "LGS ve YKS için tüm derslerini kapsayan kişisel haftalık planını koçunla kur. Birebir görüşmelerle uygulamanı takip et, ihtiyaçlarına göre planını güncelle.",
  cardHeadline: "Haftana bir yön ver.",
  cardDescription: "Kişisel planını koçunla kur, uygulamanı takip et ve gerektiğinde planını güncelle.",
  inspectLabel: "Yön Koçluk’u incele",
  meetingHref: "/iletisim?urun=onlinekocum#on-gorusme",
  logo: "/yon/logo.png",
  mascot: "/yon/mascot-y.png",
  ogImage: "/yon/og.png",
  imageAlt: "onlinekoçum. × Yön Koçluk",
  registrationNote: "onlinekoçum. × Yön Koçluk için online kayıt ve ödeme akışı henüz açık değil. Kontenjanını ve başlangıç tarihini ön görüşmede ekibimizle planlayabilirsin.",
} as const;

/** Apply only at public render boundaries, leaving parsed/technical values intact. */
export function yonDisplayName(product: { name: string; href: string }, compact = false) {
  return product.href === yonBrand.href
    ? compact ? yonBrand.shortName : yonBrand.mediumName
    : product.name;
}
