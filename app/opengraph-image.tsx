import { ImageResponse } from "next/og";
import { OgTemplate, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-template";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const alt = "Online Dershanem — Online matematik dershanesi";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(
    (
      <OgTemplate
        title="Online matematik dersi"
        subtitle="Maksimum 4 kişilik canlı matematik dersi, ders sonrası takip ve veli bilgilendirmesi."
        badge="Online Dershanem"
        variant="default"
      />
    ),
    { ...size },
  );
}
