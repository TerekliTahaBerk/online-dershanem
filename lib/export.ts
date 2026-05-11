import * as XLSX from "xlsx";

export type ExportColumn<T> = {
  key: string;
  header: string;
  /** Optional formatter — defaults to String(value) */
  format?: (row: T) => string | number | null | undefined;
};

function getCell<T>(row: T, col: ExportColumn<T>): string | number {
  const v = col.format ? col.format(row) : (row as any)[col.key];
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return v;
  return String(v);
}

/**
 * Build a CSV string. UTF-8 BOM prefix so Excel opens Turkish correctly.
 */
export function toCsv<T>(rows: T[], columns: ExportColumn<T>[]): string {
  const escape = (val: string | number) => {
    const s = String(val);
    if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines: string[] = [];
  lines.push(columns.map((c) => escape(c.header)).join(";"));
  for (const row of rows) {
    lines.push(columns.map((c) => escape(getCell(row, c))).join(";"));
  }
  // BOM + CRLF for Excel friendliness
  return "\uFEFF" + lines.join("\r\n");
}

/**
 * Build an .xlsx file as a Node Buffer.
 */
export function toXlsx<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  sheetName = "Sheet1"
): Buffer {
  const aoa: (string | number)[][] = [columns.map((c) => c.header)];
  for (const row of rows) {
    aoa.push(columns.map((c) => getCell(row, c)));
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buf);
}

/**
 * Build a Response object for either CSV or XLSX with proper headers.
 */
export function buildExportResponse(
  format: "csv" | "xlsx",
  filename: string,
  body: string | Buffer
): Response {
  const headers = new Headers();
  if (format === "xlsx") {
    headers.set(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  } else {
    headers.set("Content-Type", "text/csv; charset=utf-8");
  }
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  headers.set(
    "Content-Disposition",
    `attachment; filename="${safeName}.${format}"`
  );
  headers.set("Cache-Control", "no-store");
  return new Response(body as any, { status: 200, headers });
}

export function parseFormat(v: string | null | undefined): "csv" | "xlsx" {
  return v === "xlsx" ? "xlsx" : "csv";
}
