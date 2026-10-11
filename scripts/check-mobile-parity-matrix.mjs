#!/usr/bin/env node
/**
 * Web ↔ mobil işlev eşliği matrisi denetimi (`docs/mobile/parity-matrix.md`).
 *
 * 1. Her `app/panel/**\/page.tsx` rotası matriste TAM BİR satırda yer alır;
 *    matriste var olmayan rota yazılmamıştır.
 * 2. Her satırın durumu geçerli bir koddur (Tam / Kısmi / Eksik / İstisna / Yönl.).
 * 3. "Özet" tablosundaki sayılar bölüm satırlarından hesaplananla eşleşir.
 *
 * Kullanım: node scripts/check-mobile-parity-matrix.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { cliLog } from "./lib/cli-logger.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MATRIX = join(ROOT, "docs/mobile/parity-matrix.md");
const PANEL = join(ROOT, "app/panel");
const STATUSES = ["Tam", "Kısmi", "Eksik", "İstisna", "Yönl."];

function pages(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return pages(path);
    return name === "page.tsx" ? [path] : [];
  });
}

const webRoutes = new Set(
  pages(PANEL).map((file) => "/" + relative(join(ROOT, "app"), file).split(sep).slice(0, -1).join("/")),
);

const cells = (line) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
const lines = readFileSync(MATRIX, "utf8").split("\n");
const problems = [];
const seen = new Map();
const computed = new Map();
let section = null;

for (const [index, line] of lines.entries()) {
  const heading = /^## (\d+)\. /.exec(line);
  if (heading) section = Number(heading[1]);
  else if (/^## /.test(line)) section = null;
  if (section === null || !/^\|\s*[A-Z]\d{2}\s*\|/.test(line)) continue;
  const row = cells(line);
  const route = /^`([^`]+)`$/.exec(row[1])?.[1];
  if (!route) {
    problems.push(`satır ${index + 1}: ikinci sütun tek bir \`rota\` olmalı`);
    continue;
  }
  const status = row.filter((cell) => STATUSES.includes(cell));
  if (status.length !== 1) problems.push(`satır ${index + 1} (${route}): tam bir durum kodu gerekli, bulunan: ${status.join(", ") || "yok"}`);
  if (seen.has(route)) problems.push(`${route}: birden fazla satırda (${seen.get(route)}, ${index + 1})`);
  seen.set(route, index + 1);
  if (!webRoutes.has(route)) problems.push(`${route}: app/panel altında böyle bir sayfa yok`);
  const counts = computed.get(section) ?? Object.fromEntries(STATUSES.map((key) => [key, 0]));
  if (status.length === 1) counts[status[0]] += 1;
  computed.set(section, counts);
}

for (const route of webRoutes) if (!seen.has(route)) problems.push(`${route}: matriste satırı yok`);

// Özet tablosu: "| N. Alan | rota | Tam | Kısmi | Eksik | İstisna | Yönl. |" ve **Toplam** satırı.
const totals = Object.fromEntries(STATUSES.map((key) => [key, 0]));
let summaryTotal = null;
for (const line of lines) {
  const row = cells(line);
  const numbered = /^(\d+)\. /.exec(row[0] ?? "");
  if (line.startsWith("|") && numbered && row.length === 7) {
    const expected = computed.get(Number(numbered[1])) ?? Object.fromEntries(STATUSES.map((key) => [key, 0]));
    const routeCount = STATUSES.reduce((sum, key) => sum + expected[key], 0);
    const actual = row.slice(1).map(Number);
    const wanted = [routeCount, ...STATUSES.map((key) => expected[key])];
    if (actual.join() !== wanted.join()) problems.push(`Özet "${row[0]}": ${actual.join("/")} yazılı, satırlardan ${wanted.join("/")}`);
    for (const key of STATUSES) totals[key] += expected[key];
  }
  if (row[0] === "**Toplam**") summaryTotal = row.slice(1).map((cell) => Number(cell.replace(/\*/g, "")));
}
const wantedTotal = [webRoutes.size, ...STATUSES.map((key) => totals[key])];
if (!summaryTotal) problems.push("Özet tablosunda **Toplam** satırı yok");
else if (summaryTotal.join() !== wantedTotal.join()) problems.push(`Özet **Toplam**: ${summaryTotal.join("/")} yazılı, beklenen ${wantedTotal.join("/")}`);

if (problems.length > 0) {
  cliLog.error(`Eşlik matrisi tutarsız (${problems.length}):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
cliLog.info(`Eşlik matrisi tutarlı: ${webRoutes.size} rota · ${STATUSES.map((key) => `${key} ${totals[key]}`).join(" · ")}`);
