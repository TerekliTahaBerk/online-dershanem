/**
 * Phase 3 / Session 8 — D8: CSV import templates.
 *
 * Returns a header-only CSV the admin fills in before a (still-deferred)
 * server-side import. Admin-only. UTF-8 BOM so Excel opens it as Turkish
 * without garbling.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePanelRole } from "@/lib/panel-access";

export const dynamic = "force-dynamic";

type Template = {
  filename: string;
  headers: string[];
  /** Optional comment row prepended after the header (Excel-friendly) */
  hint?: string;
};

const TEMPLATES: Record<string, Template> = {
  ogrenciler: {
    filename: "ogrenci-import-sablonu.csv",
    headers: [
      "Ad Soyad",
      "Telefon",
      "Email",
      "Sınıf",
      "Sınav",
      "Şehir",
      "İlçe",
      "Okul",
      "Hedef",
      "Notlar",
    ],
    hint: "Zorunlu: Ad Soyad + (Telefon veya Email).",
  },
  veliler: {
    filename: "veli-import-sablonu.csv",
    headers: [
      "Ad Soyad",
      "Telefon",
      "Email",
      "Yakınlık (MOTHER|FATHER|GUARDIAN|SIBLING|OTHER)",
      "Notlar",
    ],
    hint: "Zorunlu: Ad Soyad + (Telefon veya Email). Çocuk bağlantısı içe aktarmadan sonra elle yapılır.",
  },
  ogretmenler: {
    filename: "ogretmen-import-sablonu.csv",
    headers: [
      "Ad Soyad",
      "Email",
      "Telefon",
      "Branş",
      "Bio",
    ],
    hint: "Zorunlu: Ad Soyad + Email. Hesap, içe aktarmadan sonra panel üzerinden açılır.",
  },
};

function csvCell(v: string): string {
  // Escape per RFC 4180. Always quote — keeps Turkish characters & commas safe.
  return `"${v.replace(/"/g, '""')}"`;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  await requirePanelRole("admin");
  const { entity } = await params;
  const tpl = TEMPLATES[entity];
  if (!tpl) {
    return NextResponse.json({ error: "Unknown template" }, { status: 404 });
  }
  const lines: string[] = [];
  lines.push(tpl.headers.map(csvCell).join(","));
  if (tpl.hint) {
    lines.push(tpl.headers.map((_, i) => csvCell(i === 0 ? `# ${tpl.hint}` : "")).join(","));
  }
  // BOM + CRLF for Excel compatibility
  const body = "\uFEFF" + lines.join("\r\n") + "\r\n";
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${tpl.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
