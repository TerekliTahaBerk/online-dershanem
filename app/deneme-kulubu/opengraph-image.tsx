import { ImageResponse } from "next/og";
import { OgTemplate, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-template";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const alt = "Online Dershanem — Online Deneme Kulübü";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(
    (
      <OgTemplate
        title="Online Deneme Kulübü"
        subtitle="TYT, AYT ve LGS denemeleri — anında değerlendirme, kazanım analizi, gelişim grafiği."
        badge="ODK"
        variant="package"
      />
    ),
    { ...size },
  );
}
