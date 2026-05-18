import { ImageResponse } from "next/og";
import { OgTemplate, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-template";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const alt = "AYT Hazırlık — Online Dershanem";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(
    (
      <OgTemplate
        title="AYT Hazırlık"
        subtitle="Sayısal, Eşit Ağırlık ve Sözel için alan-odaklı küçük grup dersleri ile net üretimi."
        badge="AYT"
      />
    ),
    { ...size },
  );
}
