import { ImageResponse } from "next/og";
import { OgTemplate, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-template";

export const runtime = "edge";
export const alt = "LGS Hazırlık — Online Dershanem";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(
    (
      <OgTemplate
        title="LGS Hazırlık"
        subtitle="8. sınıf öğrencileri için küçük grup canlı ders, deneme programı ve koçluk desteği."
        badge="LGS"
      />
    ),
    { ...size },
  );
}
