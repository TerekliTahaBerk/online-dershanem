import { denemeLigiBrand } from "@/lib/deneme-ligi-brand";
import { ImageResponse } from "next/og";
import { OgTemplate, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-template";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const alt = `${denemeLigiBrand.name} — Deneme paketleri`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(
    (
      <OgTemplate
        title={`${denemeLigiBrand.shortName} Paketleri`}
        subtitle="LGS, TYT ve AYT için deneme takvimini, paket kapsamını ve erişim koşullarını incele."
        badge={denemeLigiBrand.shortName}
        variant="package"
      />
    ),
    { ...size },
  );
}
