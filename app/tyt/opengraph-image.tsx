import { ImageResponse } from "next/og";
import { OgTemplate, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-template";

export const runtime = "edge";
export const alt = "TYT Hazırlık — Online Dershanem";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(
    (
      <OgTemplate
        title="TYT Hazırlık"
        subtitle="Küçük grupta canlı ders, deneme analizi ve haftalık takip ile TYT netini kalıcı şekilde artır."
        badge="TYT"
      />
    ),
    { ...size },
  );
}
