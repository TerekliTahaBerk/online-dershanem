import { ImageResponse } from "next/og";
import { OgTemplate, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-template";

export const runtime = "edge";
export const alt = "YKS Hazırlık — Online Dershanem";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(
    (
      <OgTemplate
        title="YKS Hazırlık"
        subtitle="TYT + AYT bütünlüğünde uzun soluklu hazırlık; küçük grup, kişisel takip, planlı çalışma."
        badge="YKS"
      />
    ),
    { ...size },
  );
}
