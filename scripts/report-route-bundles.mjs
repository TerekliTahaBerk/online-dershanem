#!/usr/bin/env node
/**
 * Route bazlı ilk yük (first load) JS bütçe raporu.
 *
 * Next 16 build özeti artık route başına JS boyutu basmıyor; bunun yerine
 * `next build` `.next/diagnostics/route-bundle-stats.json` dosyasını yazıyor
 * (route → first load chunk listesi). Bu script o dosyadan ham ve gzip
 * boyutlarını hesaplar. Tarayıcıya giden gerçek bayt gzip/brotli olduğu için
 * bütçe gzip üzerinden kontrol edilir.
 *
 *   node scripts/report-route-bundles.mjs [--top 10] [--include-api]
 *                                         [--max-gzip-kb 250] [--json]
 *
 * `--max-gzip-kb` verilirse bütçeyi aşan route varken çıkış kodu 1 olur.
 */
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};

const statsPath = option("--stats", ".next/diagnostics/route-bundle-stats.json");
const top = Number.parseInt(option("--top", "10"), 10);
const maxGzipKb = option("--max-gzip-kb", null);

let stats;
try {
  stats = JSON.parse(readFileSync(statsPath, "utf8"));
} catch {
  console.error(`${statsPath} okunamadı. Önce \`next build\` çalıştırın.`);
  process.exit(2);
}

const chunkSizes = new Map();
function chunkSize(path) {
  if (!chunkSizes.has(path)) {
    const bytes = readFileSync(path);
    chunkSizes.set(path, { raw: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length });
  }
  return chunkSizes.get(path);
}

const routes = stats
  .filter((entry) => flag("--include-api") || !entry.route.startsWith("/api/"))
  .map((entry) => {
    let raw = 0;
    let gzip = 0;
    for (const path of entry.firstLoadChunkPaths) {
      const size = chunkSize(path);
      raw += size.raw;
      gzip += size.gzip;
    }
    return { route: entry.route, raw, gzip, chunks: entry.firstLoadChunkPaths.length };
  })
  .sort((left, right) => right.gzip - left.gzip);

const sharedPaths = stats
  .map((entry) => new Set(entry.firstLoadChunkPaths))
  .reduce((shared, current) => new Set([...shared].filter((path) => current.has(path))));
const shared = [...sharedPaths].reduce(
  (sum, path) => ({ raw: sum.raw + chunkSize(path).raw, gzip: sum.gzip + chunkSize(path).gzip }),
  { raw: 0, gzip: 0 },
);

const kb = (bytes) => (bytes / 1024).toFixed(1);
const overBudget = maxGzipKb ? routes.filter((route) => route.gzip / 1024 > Number(maxGzipKb)) : [];

if (flag("--json")) {
  console.log(JSON.stringify({ shared, routes: routes.slice(0, top), overBudget }, null, 2));
} else {
  console.log(`Route sayısı: ${routes.length} · tüm route'larda ortak: ${sharedPaths.size} chunk, ${kb(shared.raw)} KB ham / ${kb(shared.gzip)} KB gzip\n`);
  console.log("| # | Route | First load JS (ham) | First load JS (gzip) | Chunk |");
  console.log("|---|---|---:|---:|---:|");
  routes.slice(0, top).forEach((route, index) => {
    console.log(`| ${index + 1} | \`${route.route}\` | ${kb(route.raw)} KB | ${kb(route.gzip)} KB | ${route.chunks} |`);
  });
  if (maxGzipKb) {
    console.log(`\nBütçe: ${maxGzipKb} KB gzip · aşan route: ${overBudget.length}`);
    for (const route of overBudget) console.log(`  - ${route.route}: ${kb(route.gzip)} KB`);
  }
}

if (overBudget.length) process.exit(1);
