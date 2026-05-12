import * as XLSX from "xlsx";
import { NextResponse } from "next/server";

export function rowsToXlsxResponse(
  rows: Record<string, unknown>[],
  sheetName: string,
  fileName: string,
): NextResponse {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31) || "Sheet1");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function fmtDate(d: Date | null | undefined): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

export function fmtMoney(kurus: number | null | undefined): string {
  if (kurus == null) return "";
  return (kurus / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2 });
}
