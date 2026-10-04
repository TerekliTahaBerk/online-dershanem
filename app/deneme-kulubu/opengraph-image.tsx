import { ImageResponse } from "next/og";
import { OgTemplate, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-template";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const alt = "onlinedershanem. — onlinedenemekulübüm. yayında değil";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(
    (
      <OgTemplate
        title="onlinedenemekulübüm. yayında değil"
        subtitle="LGS, TYT ve AYT için onlinedenemekulübüm. paketlerini inceleyin."
        badge="onlinedershanem."
        variant="package"
      />
    ),
    { ...size },
  );
}
