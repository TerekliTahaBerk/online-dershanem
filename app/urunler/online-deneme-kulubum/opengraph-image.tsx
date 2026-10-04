import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { denemeLigiBrand } from "@/lib/deneme-ligi-brand";

export const alt = denemeLigiBrand.imageAlt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "public/deneme-ligi/logo.png"));
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#350775", color: "white", padding: "60px", alignItems: "center", gap: "30px" }}>
      <div style={{ display: "flex", flexDirection: "column", width: "620px" }}>
        <div style={{ display: "flex", fontSize: 23, marginBottom: 42 }}>onlinedenemekulübüm. X Deneme Ligi</div>
        <div style={{ display: "flex", fontSize: 57, fontWeight: 700, lineHeight: 1.15 }}>Denemeye katıl.</div>
        <div style={{ display: "flex", fontSize: 57, fontWeight: 700, color: "#ffda24", lineHeight: 1.15 }}>Gelişimini gör.</div>
        <div style={{ display: "flex", fontSize: 24, color: "#eee2ff", marginTop: 30 }}>LGS · TYT · AYT</div>
        <div style={{ display: "flex", fontSize: 19, color: "#e0cdef", marginTop: 42 }}>{denemeLigiBrand.infrastructure}</div>
      </div>
      {/* ImageResponse requires native img to embed the unaltered supplied logo. */}
      <img src={`data:image/png;base64,${logo.toString("base64")}`} alt="" width={430} height={430} style={{ borderRadius: 26, objectFit: "contain" }} />
    </div>,
    size,
  );
}
