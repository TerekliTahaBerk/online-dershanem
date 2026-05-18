import { ImageResponse } from "next/og";
import { OgTemplate, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-template";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const alt = "Paketler — Online Dershanem";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(
    (
      <OgTemplate
        title="Online Dershanem Paketleri"
        subtitle="Sana en uygun küçük grup hazırlık paketini seç; ders saatleri, takip ve koçluk dahil."
        badge="Paketler"
        variant="package"
      />
    ),
    { ...size },
  );
}
