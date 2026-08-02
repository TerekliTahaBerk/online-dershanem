import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Online Dershanem",
    short_name: "Online Dershanem",
    description: "Online matematik dershanesi: küçük grup canlı matematik dersleri ve ders sonrası takip.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBFAF5",
    theme_color: "#FBFAF5",
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
