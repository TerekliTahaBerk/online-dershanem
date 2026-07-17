/** CSV hücresini Excel/Sheets için güvenli ve RFC 4180 uyumlu üretir. */
export function csvCell(value: string | number): string {
  let text = String(value).replace(/\r?\n/g, " ");
  // Dış kaynaklı değer hücre formülüne dönüşmemeli.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function csvDocument(rows: Array<Array<string | number>>): string {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
