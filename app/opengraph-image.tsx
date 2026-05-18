import { ImageResponse } from "next/og";
import { OgTemplate, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-template";

export const runtime = "edge";
export const alt = "Online Dershanem — TYT, AYT ve LGS için küçük grup online dershane";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(
    (
      <OgTemplate
        title="Küçük grupta, gerçekten takip edilen bir hazırlık"
        subtitle="TYT, AYT ve LGS için canlı ders, haftalık takip ve net odaklı planlama."
        badge="Online Dershanem"
        variant="default"
      />
    ),
    { ...size },
  );
}
