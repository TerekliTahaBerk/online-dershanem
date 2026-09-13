/**
 * CI preflight: Playwright'tan önce E2E credential'larının tanımlı olduğunu
 * doğrular. Yerelde eksik değişkenler testleri sessizce atlatır; CI'da bu
 * script eksikleri raporlayıp çıkış kodu 1 ile işi kırar.
 *
 * Kullanım: node --import tsx scripts/check-e2e-env.ts [grup ...]
 * Grup verilmezse tüm gruplar kontrol edilir.
 */
import { e2eEnvRequirements, missingE2EEnv, type E2EEnvGroup } from "../tests/e2e/env-requirements";

const known = Object.keys(e2eEnvRequirements) as E2EEnvGroup[];
const requested = process.argv.slice(2);
const unknown = requested.filter((group) => !known.includes(group as E2EEnvGroup));

if (unknown.length > 0) {
  console.error(`Bilinmeyen E2E env grubu: ${unknown.join(", ")}. Geçerli gruplar: ${known.join(", ")}`);
  process.exit(2);
}

const groups = requested.length > 0 ? (requested as E2EEnvGroup[]) : known;
const missing = missingE2EEnv(groups);

if (missing.length > 0) {
  console.error(`E2E preflight BAŞARISIZ — tanımsız değişkenler (${missing.length}):`);
  for (const name of missing) console.error(`  - ${name}`);
  console.error("Bu değişkenler olmadan ilgili Playwright testleri sessizce atlanır.");
  process.exit(1);
}

console.log(`E2E preflight tamam: ${groups.join(", ")} gruplarındaki tüm değişkenler tanımlı.`);
