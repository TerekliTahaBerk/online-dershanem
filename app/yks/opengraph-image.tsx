import { ImageResponse } from "next/og";
import { OgTemplate, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-template";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const alt = "YKS Hazırlık — Online Dershanem";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(
    (
      <OgTemplate
        title="YKS Matematik Canlı Ders"
        subtitle="TYT + AYT bütünlüğünde küçük grup canlı ders, ders sonrası yönlendirme ve düzenli takip."
        badge="YKS Matematik"
      />
    ),
    { ...size },
  );
}
