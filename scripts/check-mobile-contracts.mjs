#!/usr/bin/env node
/**
 * Mobil sözleşme sınırı denetimi.
 *
 * `lib/mobile-contracts/**` hem Next.js sunucusu hem Expo uygulaması
 * tarafından paketlenir. Buradan Prisma runtime, `server-only`, Node
 * modülleri, ortam değişkenleri veya herhangi bir paket sızarsa mobil
 * bundle'a sunucu kodu / gizli bilgi girer. Bu betik:
 *   1. Yalnız aynı dizinden göreli importlara (`./x`) izin verir.
 *   2. `process.env`, `require(`, dinamik `import(` kullanımını reddeder.
 *   3. Mobil kaynakta sözleşmeler dışında `../lib`, `@prisma`,
 *      `server-only`, `next/` importunu reddeder.
 *
 * Kullanım: node scripts/check-mobile-contracts.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { cliLog } from "./lib/cli-logger.mjs";

// Çalışma dizininden bağımsız: repo kökü bu betiğin bir üstüdür.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CONTRACT_DIR = join(ROOT, "lib/mobile-contracts");
const MOBILE_SRC = join(ROOT, "mobile/src");

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "node_modules" ? [] : walk(path);
    return /\.(ts|tsx|js|mjs)$/.test(name) ? [path] : [];
  });
}

const IMPORT_SPEC = /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\sfrom\s+)?["']([^"']+)["']/g;
const offenders = [];

// `*.test.ts` yalnız Node test koşucusunda çalışır; mobil bundle'a girmez
// (mobil tsconfig ve Metro onları dışlar).
for (const file of walk(CONTRACT_DIR).filter((path) => !path.endsWith(".test.ts"))) {
  const source = readFileSync(file, "utf8");
  const rel = relative(ROOT, file);
  for (const match of source.matchAll(IMPORT_SPEC)) {
    if (!/^\.\/[\w.-]+$/.test(match[1])) offenders.push(`${rel}: izin verilmeyen import "${match[1]}"`);
  }
  if (/process\.env/.test(source)) offenders.push(`${rel}: process.env kullanımı`);
  if (/\brequire\s*\(/.test(source)) offenders.push(`${rel}: require() kullanımı`);
  if (/\bimport\s*\(/.test(source)) offenders.push(`${rel}: dinamik import()`);
}

// Not: mobilde `@/` kendi `mobile/src` dizinidir; sunucu kodu ancak göreli
// `../lib` yoluyla sızabilir.
const FORBIDDEN_IN_MOBILE = [/^(\.\.\/)+lib\//, /^@prisma\//, /^server-only$/, /^next(\/|$)/, /^node:/];
for (const file of walk(MOBILE_SRC)) {
  const source = readFileSync(file, "utf8");
  const rel = relative(ROOT, file);
  for (const match of source.matchAll(IMPORT_SPEC)) {
    const spec = match[1];
    if (FORBIDDEN_IN_MOBILE.some((pattern) => pattern.test(spec))) {
      offenders.push(`${rel}: mobil kaynak sunucu modülü import ediyor "${spec}" (yalnız @contracts/* serbest)`);
    }
  }
}

if (offenders.length) {
  cliLog.error("Mobil sözleşme sınırı ihlali:");
  for (const offender of offenders) cliLog.error(`  ${offender}`);
  process.exit(1);
}
cliLog.info(`Mobil sözleşme sınırı temiz (${walk(CONTRACT_DIR).length} sözleşme dosyası).`);
