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
        title="AYT Matematik"
        subtitle="AYT matematik için küçük grup canlı ders, konu takibi ve ders sonrası yönlendirme."
        badge="AYT Matematik"
      />
    ),
    { ...size },
  );
}
