import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Online Dershanem",
    short_name: "Online Dershanem",
    // Açıklama math-only dönemden kalmıştı; site artık üç ürünlü ve çok dersli.
    description:
      "LGS ve YKS için canlı ders, koçluk ve deneme analizi: Online Dershanem, Online Koçum ve Online Deneme Kulübüm.",
    start_url: "/",
    display: "standalone",
    // Onaylı tasarımın zemini (`--dc-canvas`). Eski krem #FBFAF5 buradan
    // kalmıştı ve mobil tarayıcı çerçevesi siteyle uyuşmuyordu.
    background_color: "#FBFCFA",
    theme_color: "#FBFCFA",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}
