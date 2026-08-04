#!/usr/bin/env node
// Repo hygiene kapısı.
//
// macOS Finder / iCloud senkronu bir dosyayı kopyaladığında adına " 2" eki
// koyar ("next.config 2.ts"). Bu kopyalar sessizce commit'lenip build, import
// ve dokümantasyonu asıl dosyadan koparıyordu. Bu kontrol onları CI'da yakalar.
//
// Kullanım: node scripts/check-repo-hygiene.mjs

import { execFileSync } from "node:child_process";

/** Finder kopyası: "ad 2.uzanti", "ad 3.uzanti" veya uzantısız "ad 2". */
const FINDER_COPY = /(^| )[^/]+ \d+(\.[a-zA-Z0-9]+)?$/;

/** PayTR entegrasyon dokümanları gerçekten "STEP 1.pdf" gibi adlandırılmıştır. */
const ALLOWLIST = [/^PayTR IFrame API\//];

function trackedFiles() {
  const out = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" });
  return out.split("\0").filter(Boolean);
}

const offenders = trackedFiles().filter(
  (file) => FINDER_COPY.test(file) && !ALLOWLIST.some((pattern) => pattern.test(file)),
);

if (offenders.length > 0) {
  console.error("Yinelenen dosya kopyaları bulundu (Finder/iCloud \" 2\" eki):\n");
  for (const file of offenders) console.error(`  ${file}`);
  console.error(
    "\nBu kopyalar asıl dosyadan sessizce ayrışır. Silin ve yalnız asıl dosyayı commit'leyin.",
  );
  process.exit(1);
}

console.log(`Repo hygiene: temiz (${trackedFiles().length} takip edilen dosya kontrol edildi).`);
