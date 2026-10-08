#!/usr/bin/env node
/**
 * Mobil tasarım token'ları ↔ web panel token'ları senkron denetimi.
 *
 * `mobile/src/design/{tokens,products}.ts` içindeki her değer satır sonunda
 * kaynak CSS değişkenini yorum olarak taşır (`// --pn-canvas`). Bu betik
 * `app/globals.css`'ten aynı değişkeni çözer (`var(--x)` zinciri dahil) ve
 * değerleri karşılaştırır. Yorum biçimleri:
 *   // --pn-canvas                 → tek değer
 *   // --pn-tone-info(-soft)       → [--pn-tone-info, --pn-tone-info-soft]
 *   // --pn-accent-od*             → [--pn-accent-od, -soft, -marker]
 *
 * Kullanım: node scripts/check-mobile-tokens.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { cliLog } from "./lib/cli-logger.mjs";

// Çalışma dizininden bağımsız: repo kökü bu betiğin bir üstüdür.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
// Yorumlar (ör. token açıklama blokları) bildirim sanılmasın diye atılır.
const css = readFileSync(`${ROOT}app/globals.css`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const FILES = ["mobile/src/design/tokens.ts", "mobile/src/design/products.ts"];
const read = (file) => readFileSync(`${ROOT}${file}`, "utf8");

/** Değişken adını regex içinde birebir eşleşecek şekilde kaçırır (tüm özel karakterler). */
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");

/** Panel katmanı öncelikli: önce `.pn-scope {` bloğu, sonra dosyanın geri kalanı. */
function declaration(name) {
  const pnStart = css.indexOf(".pn-scope {");
  const scopes = pnStart >= 0 ? [css.slice(pnStart, css.indexOf("}", pnStart)), css] : [css];
  for (const scope of scopes) {
    const match = new RegExp(`^\\s*${escapeRegExp(name)}\\s*:\\s*([^;]+);`, "m").exec(scope);
    if (match) return match[1].trim();
  }
  return null;
}

function resolve(name, depth = 0) {
  if (depth > 5) return null;
  const value = declaration(name);
  if (!value) return null;
  const reference = /^var\((--[\w-]+)\)$/.exec(value);
  return reference ? resolve(reference[1], depth + 1) : value;
}

const normalize = (value) => value.toLowerCase().replace(/\s+/g, "");
const offenders = [];
let checked = 0;

for (const file of FILES) {
  read(file).split(/\r?\n/).forEach((line, index) => {
    const comment = /\/\/\s*(--pn-[\w-]+|--dc-[\w-]+)(\(-soft\)|\*)?/.exec(line);
    if (!comment) return;
    const values = [...line.slice(0, comment.index).matchAll(/'(#[0-9a-fA-F]{3,8}|rgba?\([^']+\))'/g)].map((match) => match[1]);
    const base = comment[1];
    const names = comment[2] === "(-soft)" ? [base, `${base}-soft`] : comment[2] === "*" ? [base, `${base}-soft`, `${base}-marker`] : [base];
    if (values.length !== names.length) {
      offenders.push(`${file}:${index + 1}: ${names.length} değer bekleniyordu, ${values.length} bulundu`);
      return;
    }
    names.forEach((name, position) => {
      checked += 1;
      const expected = resolve(name);
      if (!expected) offenders.push(`${file}:${index + 1}: ${name} app/globals.css içinde yok`);
      else if (normalize(expected) !== normalize(values[position])) offenders.push(`${file}:${index + 1}: ${name} web=${expected} mobil=${values[position]}`);
    });
  });
}

if (offenders.length) {
  cliLog.error("Mobil tasarım token'ları web paneliyle uyuşmuyor:");
  for (const offender of offenders) cliLog.error(`  ${offender}`);
  process.exit(1);
}
cliLog.info(`Mobil token'lar web paneliyle senkron (${checked} değer).`);
