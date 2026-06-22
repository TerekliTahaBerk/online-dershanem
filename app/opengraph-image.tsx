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
        title="Matematikte nerede takıldığını görüyoruz"
        subtitle="Butik canlı matematik dersleri, matematik deneme kulübü ve veliye açık gelişim takibi."
        badge="Online Dershanem"
        variant="default"
      />
    ),
    { ...size },
  );
}
