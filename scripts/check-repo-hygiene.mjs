#!/usr/bin/env node
// Repo hygiene kapısı.
//
// macOS Finder / iCloud senkronu bir dosyayı kopyaladığında adına " 2" eki
// koyar ("next.config 2.ts"). Bu kopyalar sessizce commit'lenip build, import
// ve dokümantasyonu asıl dosyadan koparıyordu. Bu kontrol onları CI'da yakalar.
//
// Kullanım: node scripts/check-repo-hygiene.mjs

import { cliLog } from "./lib/cli-logger.mjs";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** Finder kopyası: "ad 2.uzanti", "ad 3.uzanti" veya uzantısız "ad 2". */
const FINDER_COPY = /(^| )[^/]+ \d+(\.[a-zA-Z0-9]+)?$/;

/** PayTR entegrasyon dokümanları gerçekten "STEP 1.pdf" gibi adlandırılmıştır. */
const ALLOWLIST = [/^PayTR IFrame API\//];

function trackedFiles() {
  const out = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" });
  return out.split("\0").filter(Boolean);
}

const files = trackedFiles();

const offenders = files.filter(
  (file) => FINDER_COPY.test(file) && !ALLOWLIST.some((pattern) => pattern.test(file)),
);

if (offenders.length > 0) {
  cliLog.error("Yinelenen dosya kopyaları bulundu (Finder/iCloud \" 2\" eki):\n");
  for (const file of offenders) cliLog.error(`  ${file}`);
  cliLog.error(
    "\nBu kopyalar asıl dosyadan sessizce ayrışır. Silin ve yalnız asıl dosyayı commit'leyin.",
  );
  process.exit(1);
}

/**
 * API route'ları SAYFA guard'ı kullanamaz.
 *
 * `lib/auth/guards.ts` içindeki guard'lar `redirect()` / `notFound()` çağırır —
 * bunlar sayfa render'ına özgüdür. Bir route handler'da `redirect` atmak,
 * çağıran `fetch`'e JSON yerine 200 + giriş sayfası HTML'i döndürür ve istemci
 * "başarılı" sanır. API tarafının doğru kapısı `lib/auth/api-guards.ts`'tir.
 *
 * (2026-09-01'de `app/api/panel/curriculum/outcomes/search` bu hatayı
 * taşıyordu; kural tekrarını engellemek için eklendi.)
 */
const PAGE_GUARD_IMPORT = /from\s+["']@\/lib\/auth\/guards["']/;
const guardOffenders = files
  .filter((file) => file.startsWith("app/api/") && file.endsWith("route.ts"))
  .filter((file) => PAGE_GUARD_IMPORT.test(readFileSync(file, "utf8")));

if (guardOffenders.length > 0) {
  cliLog.error("API route'unda sayfa guard'ı (@/lib/auth/guards) kullanılıyor:\n");
  for (const file of guardOffenders) cliLog.error(`  ${file}`);
  cliLog.error(
    "\nBunlar redirect()/notFound() atar; fetch JSON yerine HTML alır." +
      "\n@/lib/auth/api-guards içindeki requireApi* kapılarını kullanın.",
  );
  process.exit(1);
}

/**
 * İstemci bileşenlerinin içe aktardığı hiçbir yerel modül `node:` ile başlayan
 * bir şey içe aktaramaz.
 *
 * Bir "use client" bileşeni `node:crypto` kullanan bir modülü çekince Next
 * bunu tarayıcı paketine bir ŞİMLE koyuyor: import çözülüyor ama alanlar
 * eksik. `lib/tracking.ts` böyleydi — `randomUUID` tarayıcıda tanımsızdı ve
 * satın alma CTA'sının `onClick`'i `TypeError` ile yarıda kesiliyordu; ürün
 * sepete ekleniyor, `router.push("/sepet")` hiç çalışmıyordu. Tarayıcıda
 * hata konsola düşüyor, sunucuda hiçbir şey görünmüyor: sessiz bir dönüşüm
 * kaybı. Bu yüzden derleme değil, kapı yakalasın.
 */
const NODE_IMPORT = /(?:^|\n)\s*import[^;]*?from\s+["']node:[^"']+["']/;
const LOCAL_IMPORT = /from\s+["'](@\/[^"']+|\.[^"']+)["']/g;

function resolveLocalImport(fromFile, specifier) {
  const base = specifier.startsWith("@/")
    ? specifier.slice(2)
    : join(dirname(fromFile), specifier);
  for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (files.includes(candidate)) return candidate;
  }
  return null;
}

const clientFiles = files.filter(
  (file) =>
    (file.endsWith(".tsx") || file.endsWith(".ts")) &&
    !file.startsWith("tests/") &&
    /^\s*["']use client["']/.test(readFileSync(file, "utf8")),
);

const nodeImportOffenders = [];
for (const clientFile of clientFiles) {
  const source = readFileSync(clientFile, "utf8");
  for (const match of source.matchAll(LOCAL_IMPORT)) {
    const target = resolveLocalImport(clientFile, match[1]);
    if (!target) continue;
    if (NODE_IMPORT.test(readFileSync(target, "utf8"))) {
      nodeImportOffenders.push(`${clientFile} → ${target}`);
    }
  }
}

if (nodeImportOffenders.length > 0) {
  cliLog.error("İstemci bileşeni `node:` içe aktaran bir modüle bağlı:\n");
  for (const pair of [...new Set(nodeImportOffenders)]) cliLog.error(`  ${pair}`);
  cliLog.error(
    "\nTarayıcı paketinde `node:` modülleri şimlenir; alanlar sessizce eksilir." +
      "\nSunucuya özgü kısmı ayrı bir modüle taşıyın.",
  );
  process.exit(1);
}

/**
 * Panel içi bağlantılar var olan bir rotaya gitmeli.
 *
 * Bildirim ve uyarı `href`'leri elle yazılıyor ve rota adı değişince sessizce
 * bozuluyor: kullanıcı bildirime tıklıyor, 404 görüyor. Bulunanlar (2026-09-01)
 * `/panel/ogretmen/dersler/<id>` (rota `ders`, tekil), birleşik takvimin
 * `/panel/ogrenci/dersler/<id>` bağlantısı (öğrencide ders sayfası yok) ve
 * sağlama arızası alarmının `/panel/yonetim/operasyon`u (böyle bir bölüm yok).
 *
 * Yalnız ilk iki segment doğrulanır; dinamik `[id]` alt yolları serbesttir.
 */
// Yalnız DİZE BAŞLANGICI sayılır (tırnak veya backtick ile açılmış): yorum
// satırlarında geçen yol adları bulgu üretmemeli.
const PANEL_HREF = /["'`](\/panel\/(?:ogretmen|ogrenci|veli|yonetim|odk)\/[a-z0-9-]+)/g;

const linkOffenders = [];
for (const file of files) {
  if (!/\.(ts|tsx)$/.test(file)) continue;
  if (file.includes(".test.") || file.startsWith("tests/")) continue;
  // `next.config.ts` içindeki redirect KAYNAKLARI bilerek var olmayan yollardır.
  if (file === "next.config.ts") continue;
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(PANEL_HREF)) {
    const route = match[1];
    const after = source.slice(match.index + match[0].length, match.index + match[0].length + 5);
    // `app/panel/ogretmen/page.tsx` gibi DOSYA yollarını href sanma.
    if (/^\.(ts|tsx)/.test(after) || route.endsWith("/page") || route.endsWith("/route")) continue;
    if (!files.some((candidate) => candidate.startsWith(`app${route}/`))) {
      linkOffenders.push(`${file}: ${route}`);
    }
  }
}

if (linkOffenders.length > 0) {
  cliLog.error("Var olmayan panel rotasına bağlantı:\n");
  for (const offender of [...new Set(linkOffenders)]) cliLog.error(`  ${offender}`);
  cliLog.error("\nBildirim/uyarı href'leri 404'e gidiyor. Rota adını doğrulayın.");
  process.exit(1);
}

/**
 * ESLint istisnaları sessiz kalmamalı. Aynı satırdaki `-- gerekçe` veya
 * doğrudan üstündeki açıklayıcı yorum, istisnanın neden güvenli olduğunu
 * gelecek değişiklikler ve incelemeler için kayda geçirir.
 */
const SOURCE_FILE = /\.(?:[cm]?js|jsx|mjs|ts|tsx)$/;
const COMMENT_LINE = /^\s*(?:\/\/|\/\*|\*|\{\/\*)\s*\S/;
const eslintDisableOffenders = [];

for (const file of files) {
  if (!SOURCE_FILE.test(file) || file === "scripts/check-repo-hygiene.mjs") continue;
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    const directiveAt = line.indexOf("eslint-disable");
    if (directiveAt < 0) return;
    const prefix = line.slice(0, directiveAt);
    if (!prefix.includes("//") && !prefix.includes("{/*")) return;
    const inlineReason = /eslint-disable(?:-next-line|-line)?\b[^\n]*--\s*\S.{7,}/.test(line);
    const previousReason = index > 0 && COMMENT_LINE.test(lines[index - 1]) && !lines[index - 1].includes("eslint-disable");
    if (!inlineReason && !previousReason) eslintDisableOffenders.push(`${file}:${index + 1}`);
  });
}

if (eslintDisableOffenders.length > 0) {
  cliLog.error("Gerekçesiz eslint-disable kullanımı bulundu:\n");
  for (const offender of eslintDisableOffenders) cliLog.error(`  ${offender}`);
  cliLog.error("\nAynı satıra `-- gerekçe` ekleyin veya doğrudan üst satırda nedenini açıklayın.");
  process.exit(1);
}

cliLog.info(
  `Repo hygiene: temiz (${files.length} takip edilen dosya, ${clientFiles.length} istemci bileşeni, ` +
    `${files.filter((file) => SOURCE_FILE.test(file)).length} kaynak dosyada ESLint istisnaları ve panel bağlantıları kontrol edildi).`,
);
