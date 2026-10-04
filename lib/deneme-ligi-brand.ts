/** Presentation only: never use this identity for commerce or entitlements. */
export const denemeLigiBrand = {
  name: "onlinedenemekulübüm. X Deneme Ligi",
  shortName: "Deneme Ligi",
  href: "/urunler/online-deneme-kulubum",
  headline: "Denemeye katıl. Gelişimini gör.",
  description:
    "LGS, TYT ve AYT denemeleriyle seviyeni ölç, sonuçlarını değerlendir ve bir sonraki denemeye daha bilinçli hazırlan.",
  infrastructure: "onlinedershanem. altyapısıyla",
  joinLabel: "Lige Katıl",
  joinHref: "/paketler",
  participationNote:
    "Katılım için mevcut deneme paketini seç; başlangıç ve erişim koşullarını ekibimizle netleştir.",
  meetingHref: "/iletisim?urun=onlinedenemekulubum#on-gorusme",
  imageAlt: "onlinedenemekulübüm. X Deneme Ligi — LGS, TYT ve AYT",
} as const;

/** Applied explicitly by the public header/footer; the registry stays intact. */
export function denemeLigiDisplayName(product: { name: string; href: string }) {
  return product.href === denemeLigiBrand.href ? denemeLigiBrand.name : product.name;
}
