import { ImageResponse } from "next/og";
import { OgTemplate, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-template";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const alt = "Online Dershanem — Deneme Kulübü yayında değil";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(
    (
      <OgTemplate
        title="Deneme Kulübü yayında değil"
        subtitle="Şu anda LGS ve YKS Matematik Ders Paketleri satışta."
        badge="Online Dershanem"
        variant="package"
      />
    ),
    { ...size },
  );
}
