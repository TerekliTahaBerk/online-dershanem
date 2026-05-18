import { ImageResponse } from "next/og";
import { OgTemplate, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-template";

export const runtime = "edge";
export const alt = "ODK Paketleri — Online Dershanem";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(
    (
      <OgTemplate
        title="ODK Deneme Paketleri"
        subtitle="Tek seferde tüm denemelere erişim, anında değerlendirme, gelişim grafiği."
        badge="ODK"
        variant="package"
      />
    ),
    { ...size },
  );
}
