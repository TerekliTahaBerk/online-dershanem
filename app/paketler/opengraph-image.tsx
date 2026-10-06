import { ImageResponse } from "next/og";
import { OgTemplate, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-template";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const alt = "Paketini Oluştur — onlinedershanem.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(
    (
      <OgTemplate
        title="Paketini Oluştur"
        subtitle="Canlı ders, Yön Koçluk ve Deneme Ligi’ni ihtiyacına göre birleştir."
        badge="onlinedershanem."
        variant="package"
      />
    ),
    { ...size },
  );
}
