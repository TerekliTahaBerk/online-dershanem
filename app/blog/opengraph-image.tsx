import { ImageResponse } from "next/og";
import { OgTemplate, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-template";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const alt = "Online Dershanem Blog";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(
    (
      <OgTemplate
        title="Online Dershanem Blog"
        subtitle="Sınav hazırlığı, çalışma alışkanlıkları ve net üretimi üzerine pratik rehberler."
        badge="Blog"
        variant="blog"
      />
    ),
    { ...size },
  );
}
