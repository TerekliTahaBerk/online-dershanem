/**
 * Yedekten bağımsız tombstone defteri.
 *
 *   export  --out ledger.json   → canlı DB'deki tombstone'ları dosyaya yazar
 *   reapply --ledger ledger.json → restore edilmiş DB'ye (DATABASE_URL) yeniden uygular
 *
 * Restore runbook'u: her restore'dan hemen sonra, restore anından SONRAKİ en
 * güncel defterle `reapply` çalıştırılır (docs/panel-data-governance.md).
 */
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { exportTombstoneLedger, parseTombstoneLedger, reapplyTombstones } from "../lib/data-governance/dsr.ts";
import { prisma } from "../lib/prisma.ts";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { out: { type: "string" }, ledger: { type: "string" } },
});

try {
  const [command] = positionals;
  if (command === "export") {
    if (!values.out) throw new Error("--out zorunlu");
    const ledger = await exportTombstoneLedger(prisma);
    await writeFile(values.out, JSON.stringify(ledger, null, 2), { mode: 0o600 });
    console.log(JSON.stringify({ written: values.out, entries: ledger.entries.length }));
  } else if (command === "reapply") {
    if (!values.ledger) throw new Error("--ledger zorunlu");
    const ledger = parseTombstoneLedger(JSON.parse(await readFile(values.ledger, "utf8")));
    const report = await reapplyTombstones(prisma, ledger);
    console.log(JSON.stringify(report, null, 2));
    if (report.blocked.length > 0) process.exitCode = 3;
  } else {
    throw new Error("Kullanım: tombstone-ledger.mjs export --out <dosya> | reapply --ledger <dosya>");
  }
} catch (error) {
  console.error(`tombstone-ledger: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
