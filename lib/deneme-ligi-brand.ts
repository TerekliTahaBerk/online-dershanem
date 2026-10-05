import { application } from "@/lib/application";

/** Presentation only: never use this identity for commerce or entitlements. */
export const denemeLigiBrand = {
  name: "onlinedenemekulübüm. × Deneme Ligi",
  parentName: "onlinedenemekulübüm.",
  logo: "/deneme-ligi/logo.png",
  mascot: "/deneme-ligi/mascot-d.png",
  shortName: "Deneme Ligi",
  href: "/urunler/online-deneme-kulubum",
  headline: "Denemeye katıl. Gelişimini gör.",
  description:
    "LGS, TYT ve AYT denemeleriyle seviyeni ölç, sonuçlarını değerlendir ve bir sonraki denemeye daha bilinçli hazırlan.",
  infrastructure: "onlinedershanem. altyapısıyla",
  joinLabel: "Lige Başvur",
  joinHref: application.href,
  participationNote:
    "Başvuru formunda Deneme Ligi’ni belirt; hesabını, başlangıcını ve erişim koşullarını ekibimizle netleştir.",
  meetingHref: "/iletisim?urun=onlinedenemekulubum#on-gorusme",
  imageAlt: "onlinedenemekulübüm. × Deneme Ligi — LGS, TYT ve AYT",
} as const;

/** Applied explicitly by the public header/footer; the registry stays intact. */
export function denemeLigiDisplayName(product: { name: string; href: string }) {
  return product.href === denemeLigiBrand.href ? denemeLigiBrand.name : product.name;
}
