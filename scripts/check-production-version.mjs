#!/usr/bin/env node
/**
 * Production ile `main` aynı commit'te mi?
 *
 * Deploy edilen artefakt kimliğini `/api/version` üzerinden okur (uç yoksa
 * `x-build-sha` yanıt başlığına düşer) ve beklenen SHA ile karşılaştırır.
 * Beklenen SHA varsayılan olarak `main`'in ucudur.
 *
 * Kullanım:
 *   node scripts/check-production-version.mjs
 *   node scripts/check-production-version.mjs --url https://staging.example --expected <sha>
 *   node scripts/check-production-version.mjs --warn-only
 *
 * Çıkış kodları: 0 eşleşti (veya --warn-only), 1 sürüm sapması, 2 okunamadı.
 */
import { appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { cliLog } from "./lib/cli-logger.mjs";

const DEFAULT_URL = "https://www.onlinedershanem.com";

function flag(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

const baseUrl = (flag("url") ?? process.env.PRODUCTION_URL ?? DEFAULT_URL).replace(/\/+$/, "");
const warnOnly = process.argv.includes("--warn-only");

/** Beklenen SHA: açıkça verilen değer, CI'ın checkout ettiği commit, ya da yerel `main`. */
function resolveExpectedSha() {
  const explicit = flag("expected") ?? process.env.EXPECTED_SHA ?? process.env.GITHUB_SHA;
  if (explicit?.trim()) return explicit.trim().toLowerCase();
  try {
    return execFileSync("git", ["rev-parse", "origin/main"], { encoding: "utf8" }).trim().toLowerCase();
  } catch {
    return null;
  }
}

async function fetchDeployedBuild() {
  const response = await fetch(`${baseUrl}/api/version`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  // Eski bir deploy bu ucu henüz tanımıyorsa yanıt başlığı hâlâ cevap verebilir.
  if (!response.ok) {
    const headerSha = response.headers.get("x-build-sha");
    if (!headerSha) throw new Error(`/api/version ${response.status} döndü ve x-build-sha yok`);
    return {
      commitSha: headerSha,
      version: response.headers.get("x-build-version"),
      commitRef: response.headers.get("x-build-ref"),
      builtAt: response.headers.get("x-build-time"),
      source: "header",
    };
  }
  return { ...(await response.json()), source: "api" };
}

function writeSummary(lines) {
  const body = lines.join("\n");
  cliLog.info(`\n${body}`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${body}\n`);
}

const expectedSha = resolveExpectedSha();

let deployed;
try {
  deployed = await fetchDeployedBuild();
} catch (error) {
  cliLog.error(`Build kimliği okunamadı (${baseUrl}): ${error instanceof Error ? error.message : error}`);
  process.exit(2);
}

const deployedSha = deployed.commitSha?.toLowerCase() ?? null;
const matches = Boolean(expectedSha && deployedSha && deployedSha === expectedSha);
const short = (sha) => (sha ? sha.slice(0, 7) : "bilinmiyor");

writeSummary([
  "## Production sürüm eşleşmesi",
  "",
  `- Hedef: \`${baseUrl}\``,
  `- Beklenen (\`main\`): \`${short(expectedSha)}\``,
  `- Yayında: \`${short(deployedSha)}\`${deployed.version ? ` (v${deployed.version})` : ""}`,
  `- Branch/tag: \`${deployed.commitRef ?? "bilinmiyor"}\``,
  `- Build zamanı: \`${deployed.builtAt ?? "bilinmiyor"}\``,
  `- Kaynak: \`${deployed.source}\``,
  `- Sonuç: ${matches ? "✅ eşleşti" : "⚠️ sapma var"}`,
]);

if (matches) process.exit(0);

if (!expectedSha) {
  cliLog.error("Beklenen SHA çözülemedi; --expected verin veya origin/main'i fetch edin.");
  process.exit(warnOnly ? 0 : 2);
}
if (!deployedSha) {
  cliLog.error("Yayındaki build SHA bildirmiyor; deploy build argümanlarını taşımıyor olabilir.");
  process.exit(warnOnly ? 0 : 2);
}

cliLog.error(
  `Production \`main\`'in gerisinde/farkında: yayında ${short(deployedSha)}, beklenen ${short(expectedSha)}.`,
);
process.exit(warnOnly ? 0 : 1);
